import { ElfBinary, Pointer, type DataDivision } from "./elfBinary";
import { DataType } from "./dataType";
import { FILE_TYPES } from "./fileTypes";
import type { Instance } from "./fileTypes";
import { BinaryReader, Vector3 } from "./misc";
import { Relocation, Section, Symbol } from "./types";
import { ValueUuid, VALUE_UUID, DATA_TYPE, type UuidTagged } from "./valueIdentifier";
import { peekable, type Peekable } from "./util";

export class EmptyFileError extends Error {
	constructor(message: any) {
		super(message)
		this.name = "EmptyFileError"
	}
}

export default function parseElfBinary(dataType: DataType, arrayBuffer: ArrayBuffer): ElfBinary {
	const view = new DataView(arrayBuffer)
	const reader = new BinaryReader(view)
	
	// In order to parse the contents of the ELF file, we need to understand the file structure
	// it is like this: Header, Sections..., Section Header Table (metadata about sections)
	// there are also sectors but those are for executables only, so we can ignore them
	
	// all of the content of the file is in the sections, so we need to parse them first
	
	
	// parse sections
	const sectionHeaderTableOffset = view.getBigInt64(0x28, true)
	const sectionAmount = view.getInt16(0x3c, true)
	
	reader.position = Number(sectionHeaderTableOffset)
	
	let sections: Section[] = []
	
	for (let i = 0; i < sectionAmount; i++) {
		let section = new Section(reader)
		section.content = arrayBuffer.slice(section.offset, section.offset + section.size)
		section.reader = new BinaryReader(section.content)
		sections.push(section)
	}
	
	// since TTYDR, the ELF related strings are split into .shstrtab and .strtab
	// .shstrtab contains all of the section names while .strtab contains everything
	// else (symbol names)
	// .shstrtab is referenced in the last field of the ELF header, while .strtab
	// can be identified by its name because .shstrtab will already be loaded
	const shStringSectionIndex = view.getInt16(0x3e, true)
	const shStringSection = sections[shStringSectionIndex]
	
	for (const section of sections) {
		section.name = shStringSection.getStringAt(section.namePointer)
	}
	
	const symStringSection = sections.find(section => section.name == ".strtab")
	
	// in order to parse the content, we have to parse the relocations as well
	// whenever in the data there is pointer, it is replaced with just zero and instead, a relocation entry is made
	// the relocation describes where the pointer should be stored in and where it points to (the section and offset)
	// because the section it points to is very predictable, we can read the offset and store it in the original location of the pointer
	
	let allRelocations = new Map<string, Map<number, Relocation>>()
	let allRelocationIters = new Map<string, Peekable<[number, Relocation]>>()
	
	// find all sections that start with ".rela" (e.g. '.rela.data') because those contain the relocations
	for (const section of sections) {
		
		if (section.name.startsWith(".rela")) {
			let reader = new BinaryReader(section.content)
			let relocations: Map<number, Relocation> = new Map()
			let prevOffset = -1
			
			while (reader.position < section.content.byteLength) {
				let relocation = Relocation.fromBinaryReader(reader)
				
				// Usually, the relocation table is in sequential order based on the offsets
				// the relocations are applied at. This is necessary later because it allows
				// better optimizations while parsing.
				if (prevOffset >= relocation.locationOffset.value) {
					throw new Error(`Relocation table ${section.name} not in sequential order`)
				}
				
				relocations.set(relocation.locationOffset.value, relocation)
				prevOffset = relocation.locationOffset.value
			}
			
			const originalSectionName = section.name.slice(".rela".length)
			allRelocations.set(originalSectionName, relocations)
			allRelocationIters.set(originalSectionName, peekable(relocations))
		}
	}
	
	
	// even though the relocation table makes constant references to the symbol table through the 'info' field,
	// we actually don't need to know the symbol table content to understand the relocations.
	// the info field is very predictable and usually just one constant throughout the entire relocation table
	
	// however, there are certain file types (maplink and data_npc_model, among others) that require the symbol table
	// because they contain multiple data types in the same file, whose placement is indicated by the symbol table
	
	const symTab = sections.find(section => section.name == ".symtab")
	let symbolTable: Symbol[] = []
	let symTabReader = new BinaryReader(symTab.content)
	
	while (symTabReader.position < symTab.content.byteLength) {
		let symbol = Symbol.fromBinaryWriter(symTabReader, symStringSection)
		symbolTable.push(symbol)
	}
	
	
	
	if (sections.filter(section => section.name == '.data').length === 0) {
		throw new EmptyFileError("No .data section existant")
	}
	
	// for most of the file formats, the data is stored in the .data section
	// as an array of structs. However, for some file formats (like maplink and data_npc_model),
	// there are multiple file formats
	
	let data: {[division in DataDivision]?: any[]}
	
	function findSection(sectionName: string): Section {
		return sections.find(section => section.name == sectionName)
	}
	
	function findSymbol(name: string): Symbol {
		return symbolTable.find(symbol => symbol.name === name)
	}
	
	function findSymbolAt(section: Section, location: Pointer) {
		return symbolTable.find(symbol => symbol.location.equals(location) && sections[symbol.sectionHeaderIndex] == section && symbol.info != 0)
	}
	
	function createMissingSymbol(name: string, section: Section): Symbol {
		let symbol = new Symbol()
		
		// TODO: these values are only verified to be correct for data_btl's models
		symbol.name = name
		symbol.sectionHeaderIndex = sections.indexOf(section)
		symbol.info = 1
		symbol.visibility = 0
		
		// will be overwritten in serializer
		symbol.location = Pointer.NULL
		symbol.size = 0
		
		console.error(`Found missing symbol ${name}, created symbol`, symbol)
		
		symbolTable.push(symbol)
		return symbol
	}
	
	// TODO: useful for future symbolAddr
	// function findLinkedToSymbol(section: Section, location: Pointer): Symbol {
	// 	let relocation = allRelocations.get(section.name).get(location.value)
	// 	return symbolTable.find(s => s.location.equals(relocation.targetOffset))
	// }
	
	// parse data according to data type
	switch (dataType) {
		case DataType.None:
			data = null
			break
		
		// parse .data section by data type
		default: {
			const dataSection = findSection('.data')
			const dataStringSection = findSection('.rodata.str1.1')
			const rodataSection = findSection('.rodata')
			
			// the .rodata Section usually only contains 4 bytes, which are the amount of objects in .data
			let rodataView = new DataView(rodataSection.content)
			let count = rodataView.getInt32(0, true)
			
			data = {}
			data.main = parseRange(dataSection, dataStringSection, 0, count, dataType)
			
			break
		}
	}
	
	let binary = new ElfBinary(sections, data, symbolTable)
	
	console.log('binary', binary)
	console.log('data', data)
	
	return binary
	
	
	function parseSymbol<T extends DataType>(containingSection: Section, stringSection: Section, symbol: Symbol, dataType: T, count?: number) {
		// if count is smaller than zero, calculate size like normal and subtract negative value from it
		let subtract = 0
		
		if (count < 0) {
			subtract = Math.abs(count)
			count = undefined
		}
		
		count = count ?? symbol.size / FILE_TYPES[dataType].size - subtract
		
		return parseRange(containingSection, stringSection, symbol.location, count, dataType)
	}
	
	function parseRange<T extends DataType>(section: Section, stringSection: Section, startOffset: number | Pointer, count: number, dataType: T) {
		const initialReaderPosition = section.reader.position
		let reader = section.reader
		let relocations = allRelocationIters.get(section.name)
		
		reader.position = typeof startOffset == 'number' ? startOffset : startOffset.value
		
		let result: Instance<T>[] = []
		
		for (let i = 0; i < count && reader.position < reader.arrayBuffer.byteLength; i++) {
			let offset = reader.position
			let obj = objFromReader(reader, dataType) as Instance<T>
			applyRelocations(obj, offset, relocations, symbolTable, stringSection, dataType)
			
			result.push(obj)
		}
		
		reader.position = initialReaderPosition
		return result
	}
}

function objFromReader(reader: BinaryReader, dataType: DataType): UuidTagged {
	let result = {
		[VALUE_UUID]: ValueUuid(),
		[DATA_TYPE]: dataType,
	}
	
	for (const [fieldName, fieldType] of Object.entries(FILE_TYPES[dataType].typedef)) {
		
		switch (fieldType) {
			case "string":
				result[fieldName] = null
				reader.position += 8
				break
			case "symbol":
				result[fieldName] = null
				reader.position += 8
				break
			case "Vector3":
				result[fieldName] = new Vector3(reader.readFloat32(), reader.readFloat32(), reader.readFloat32())
				break
			case "float":
				result[fieldName] = reader.readFloat32()
				break
			case "double":
				result[fieldName] = reader.readFloat64()
				break
			case "byte":
				result[fieldName] = reader.readUint8()
				break
			case "bool8":
				result[fieldName] = !!reader.readUint8()
				break
			case "bool32":
				result[fieldName] = !!reader.readUint32()
				break
			case "short":
				result[fieldName] = reader.readInt16()
				break
			case "int":
				result[fieldName] = reader.readInt32()
				break
			case "long":
				result[fieldName] = Number(reader.readBigInt64())
				break
			
			default:
				throw new Error(`Unknown data type ${JSON.stringify(fieldType)}`)
		}
		
	}
	
	return result
}

function applyRelocations<T extends DataType>(obj: Instance<T>, offset: number,
	relocations: Peekable<[number, Relocation]>, symbolTable: Symbol[], stringSection: Section, dataType: T): void {
	
	if (relocations.peek() == null) {
		return
	}
	
	if (relocations.peek()[0] < offset) {
		throw new Error("Skipping relocations")
	}
	
	const size = FILE_TYPES[dataType].size
	
	while (relocations.peek() && relocations.peek()[0] < offset + size) {
		const [relocationOffset, relocation] = relocations.next().value
		let fieldName = FILE_TYPES[dataType].fieldOffsets[relocationOffset - offset] as string
		let fieldType = FILE_TYPES[dataType].typedef[fieldName]
		
		if (fieldName == undefined) {
			throw new Error(`Relocation to not existing field at offset 0x${(relocationOffset - offset).toString(16)} (${DataType[dataType]})`)
		}
		
		if (fieldType == "string") {
			obj[fieldName] = stringSection.getStringAt(relocation.targetOffset)
		} else if (fieldType == "symbol") {
			let targetSymbol = symbolTable[relocation.infoHigh]
			obj[fieldName] = targetSymbol.name
		} else {
			throw new Error(`Field '${fieldName}' should be string or pointer, not '${fieldType}' (at offset 0x${offset.toString(16)}, ${DataType[dataType]})`)
		}
	}
}
