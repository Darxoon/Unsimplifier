import { ElfBinary, Pointer } from "./elfBinary";
import { DataType } from "./dataType";
import { FILE_TYPES, type Instance } from "./fileTypes";
import { BinaryWriter } from "./misc";
import { Relocation, Section, Symbol } from "./types";
import { noUndefinedMap } from "./util";
import type { UuidTagged } from "./valueIdentifier";

type SectionName = string
type Offset = number
type SymbolName = string

const BINARY_HEADER: Uint8Array = new Uint8Array([
	0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	
	0x01, 0x00, 0xB7, 0x00, 0x01, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0xC8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	
	0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x40, 0x00, 0x0B, 0x00, 0x08, 0x00,
])


export default function serializeElfBinary(dataType: DataType, binary: ElfBinary): ArrayBuffer {
	// In order to serialize an ELF binary, we don't have to regenerate the entire file.
	// All we need to do is change the sections that need to be changed and then reconstruct
	// the rest of the structure.
	// This means that we need to serialize the these sections:
	//  - .data (contains main content)
	//  - .rodata (contains secondary content, usually count of items in .data but not always)
	//  - .rodata.str1.1 (contains all user strings)
	//  - .rela* (relocation tables for all sections that need one)
	//  - symbol table (required for many data types, including maplink, model data, data_btlSet, data_ui and more)
	
	const updatedSections: Map<SectionName, ArrayBuffer> = new Map()
	const allStrings: Set<string> = new Set()
	
	const allRelocations: Map<SectionName, Relocation[]> = new Map()
	const stringRelocations: Map<SectionName, Map<number, string>> = new Map()
	const symbolRelocations: Map<SectionName, Map<number, SymbolName>> = new Map()
	const symbolAddrRelocations: Map<SectionName, Map<number, SymbolName>> = new Map()
	
	// TODO: use noUndefinedMap only in development builds
	const symbolLocationReference: Map<string, Pointer> = noUndefinedMap(new Map())
	const symbolNameOverrides: Map<string, string> = noUndefinedMap(new Map())
	const symbolSizeOverrides: Map<string, number> = noUndefinedMap(new Map())
	
	function findSection(sectionName: string): Section {
		return sections.find(section => section.name == sectionName)
	}
	
	function findSectionIndex(sectionName: string): number {
		return sections.findIndex(section => section.name == sectionName)
	}
	
	function findSymbol(name: string): Symbol {
		return binary.symbolTable.find(symbol => symbol.name === name)
	}
	
	// We will start with the .data and .rodata section.
	// These sections contain the main content, which can be various stuff depending on the data type,
	// which is why a lot of data types have their own serializers.
	
	// To handle pointers, all pointers are split into two categories: strings and pointers to symbols.
	// For every pointer, there is the offset of the field the pointer is in stored in relation to the entire section,
	// along with either the string or symbol name it is pointing to. Depending on the type of the pointer,
	// this is stored into either stringRelocations or symbolRelocations.
	
	// In addition, the program also stores all strings that are used separately in the Set allStrings to be able to
	// iterate over it in the end and to deduplicate strings in the process.
	
	{
		let dataWriter = new BinaryWriter()
		
		let dataStringRelocations = new Map() as Map<Offset, string>
		stringRelocations.set(".data", dataStringRelocations)
		
		switch (dataType) {
			case DataType.MapId: {
				let data: SerializeContext = {
					writer: dataWriter,
					stringRelocations: dataStringRelocations,
				}
				
				serializeObjects(data, DataType.MapId, binary.data.main, { padding: 1 })
				
				// count symbol
				symbolLocationReference.set("wld::fld::data::kNum", new Pointer(dataWriter.size))
				dataWriter.writeInt32(binary.data.main.length)
				
				break
			}
			
			case DataType.ItemList: {
				const dataSymbols = new Map()
				symbolRelocations.set('.data', dataSymbols)
				const dataSymbolAddrs = new Map()
				symbolAddrRelocations.set('.data', dataSymbolAddrs)
				
				let data: SerializeContext = {
					writer: dataWriter,
					stringRelocations: dataStringRelocations,
					symbolRelocations: dataSymbols,
					symbolAddrRelocations: dataSymbolAddrs,
				}
				
				for (const itemTable of binary.data.main as Instance<DataType.ItemList>[]) {
					debugger
					allStrings.add(itemTable.id)
					
					const items = itemTable.items as {children: Instance<DataType.ListItem>[], symbolName: string}
					const { children, symbolName } = items
					
					// no symbol name as the names are unpredictable here (.compoundliteral.<???>)
					// also ItemList does not store its item count
					symbolLocationReference.set(symbolName, new Pointer(dataWriter.size))
					symbolSizeOverrides.set(symbolName, (children.length + 1) * FILE_TYPES[DataType.ListItem].size)
					
					serializeObjects(data, DataType.ListItem, children, { padding: 1 })
				}
				
				symbolLocationReference.set("wld::btl::data::s_Data", new Pointer(dataWriter.size))
				symbolSizeOverrides.set("wld::btl::data::s_Data", (binary.data.main.length + 1) * FILE_TYPES[DataType.ItemList].size)
				serializeObjects(data, DataType.ItemList, binary.data.main, { padding: 1 })
				break
			}
			
			default: {
				let data: SerializeContext = {
					writer: dataWriter,
					stringRelocations: dataStringRelocations,
				}
				
				let padding = FILE_TYPES[dataType].defaultPadding
				
				serializeObjects(data, dataType, binary.data.main, { padding })
				
				break
			}
		}
		
		updatedSections.set('.data', dataWriter.toArrayBuffer())
		
		interface SerializeContext {
			writer: BinaryWriter
			stringRelocations: Map<number, string>
			symbolRelocations?: Map<number, SymbolName>
			symbolAddrRelocations?: Map<number, SymbolName>
		}
		
		interface SerializeObjectsProperties {
			padding?: number
			paddingItem?: UuidTagged
			addStrings?: boolean
		}
		
		/**
		 * Serializes an array of objects of a certain data type.
		 * @param param0 The section to be serialized into (e.g. data, rodata). Contains the BinaryWriter, string relocations and object relocations
		 * @param dataType 
		 * @param objects The objects to be serialized.
		 * @param paddingAmount If positive, it will append as many zero value instances as specified. If negative, it will remove objects at the end.
		 * @param addStrings If set to false, then the strings in the objects won't be added to the allStrings set.
		 */
		function serializeObjects(sectionElements: SerializeContext, dataType: DataType, objects: object[], properties: SerializeObjectsProperties = {}) {
			const { writer, stringRelocations, symbolRelocations, symbolAddrRelocations } = sectionElements
			const { padding: paddingAmount = 0, paddingItem, addStrings = true } = properties
			
			if (paddingAmount > 0) {
				let padding = Array.from({ length: paddingAmount }, paddingItem ? () => paddingItem : FILE_TYPES[dataType].instantiate)
				objects = [...objects, ...padding]
			}
			
			if (paddingAmount < 0) {
				objects = objects.slice(0, objects.length + paddingAmount)
			}
			
			for (const instance of objects) {
				for (const [fieldName, fieldType] of Object.entries(FILE_TYPES[dataType].typedef)) {
					let fieldValue = instance[fieldName]
					
					switch (fieldType) {
						case "string": 
							if (addStrings)
								allStrings.add(fieldValue)
							
							if (fieldValue != null)
								stringRelocations.set(writer.size, fieldValue)
							
							writer.writeBigInt64(0n)
							break
						case "symbol": 
							if (fieldValue != null)
								symbolRelocations.set(writer.size, fieldValue.symbolName)
							
							writer.writeBigInt64(0n)
							break
						case "symbolAddr":
							if (fieldValue != null)
								symbolAddrRelocations.set(writer.size, fieldValue.symbolName)
							
							writer.writeBigInt64(0n)
							break
						case "Vector3": 
							writer.writeFloat32(fieldValue.x)
							writer.writeFloat32(fieldValue.y)
							writer.writeFloat32(fieldValue.z)
							break
						case "float": 
							writer.writeFloat32(fieldValue)
							break
						case "double": 
							writer.writeFloat64(fieldValue)
							break
						case "byte": 
							writer.writeUint8(fieldValue)
							break
						case "bool8": 
							writer.writeUint8(fieldValue ? 1 : 0)
							break
						case "bool32": 
							writer.writeUint32(fieldValue ? 1 : 0)
							break
						case "short": 
							writer.writeInt16(fieldValue)
							break
						case "int": 
							writer.writeInt32(fieldValue)
							break
						case "long": 
							writer.writeBigInt64(BigInt(fieldValue))
							break
							
						default:
							throw new Error(`Unknown data type ${fieldType}`)
					}
				}
			}
		}
		
		function serializeStringsOnly(dataType: DataType, objects: object[]) {
			for (const instance of objects) {
				for (const [fieldName, fieldType] of Object.entries(FILE_TYPES[dataType].typedef)) {
					if (fieldType === "string") {
						allStrings.add(instance[fieldName])
					}
				}
			}
		}
	}
	
	// The .rodata section always contains the amount of items in .data as a 32-bit integer.
	// In most of the file formats, this is it, the section is just 4 bytes in size.
	// However, there are a few file formats that contain secondary data. This means that
	// .rodata additionally contains a lot of independent structs or struct arrays similar to
	// a heap.
	// One example are the data_model files, which function this way, and where most of the
	// information is actually stored in this section.
	// For these file formats, the data and rodata sections are so deeply linked that it is generated
	// in the .data section above instead.
	
	// There are also file types like data_btl_set and data_item_set, which don't
	// have a .rodata section at all. We do not have to make a special case for these,
	// as the entry in updatedSections will just be ignored if there is no .rodata section present.
	
	if (!updatedSections.has('.rodata')) {
		let writer = new BinaryWriter()
		
		switch (dataType) {
			case DataType.None:
				writer.writeInt32(0)
				break
			
			// case DataType.DataNpcModel:
				
			default:
				writer.writeInt32(binary.data.main.length)
		}
		
		updatedSections.set('.rodata', writer.toArrayBuffer())
	}
	
	// The .rodata.str1.1 section maybe sounds like it's similar to .rodata, 
	// but in terms of content, it's not. It contains all of the strings in the content sections
	// (as opposed to .strtab, which contains ELF format related strings).
	// Because we collected the strings earlier into the allStrings set, we can now serialize
	// all of them.
	// However, we need to store where the strings are located, so they can be linked to
	// in the .rela* sections.
	
	const stringLocations: Map<string, Pointer> = new Map()
	
	{
		let writer = new BinaryWriter()
		
		for (const str of allStrings) {
			if (str != null) {
				stringLocations.set(str, new Pointer(writer.size))
				writer.writeString(str)
			}
		}
		
		updatedSections.set('.rodata.str1.1', writer.toArrayBuffer())
	}
	
	
	// @ts-ignore
	const sections = binary.sections
	
	
	// In many file formats, the Symbol Table contains references to the content of the files.
	// This means that for these data types, it has to be modified and serialized again.
	
	// The symbol table is very straight forward. It's an array of `Symbol`s. However, the
	// first element is always completely zero.
	{
		let unusedLocationEntries = new Set(symbolLocationReference.keys())
		let unusedNameEntries = new Set(symbolNameOverrides.keys())
		let unusedSizeEntries = new Set(symbolSizeOverrides.keys())
		
		const stringTable = findSection(".strtab")
		
		let writer = new BinaryWriter()
		
		for (const symbol of binary.symbolTable) {
			let symbolId = symbol.name
			
			if (symbolLocationReference.has(symbolId)) {
				symbol.location = symbolLocationReference.get(symbolId)
				unusedLocationEntries.delete(symbolId)
			}
			
			if (symbolNameOverrides?.has(symbolId)) {
				let newId = symbolNameOverrides.get(symbolId)
				unusedNameEntries.delete(symbolId)
				
				if (symbolId != newId) {
					console.warn(`Updating name of Symbol ${JSON.stringify(symbolId)} to ${JSON.stringify(newId)}`)
				}
				
				symbol.name = newId
			}
			
			if (symbolSizeOverrides.has(symbolId)) {
				symbol.size = symbolSizeOverrides.get(symbolId)
				unusedSizeEntries.delete(symbolId)
			}
			
			symbol.toBinaryWriter(writer, stringTable)
		}
		
		if (unusedLocationEntries.size > 0)
			console.error("Unused location entries:", [...unusedLocationEntries.values()])
		
		if (unusedNameEntries.size > 0)
			console.error("Unused name entries:", [...unusedNameEntries.values()])
		
		if (unusedSizeEntries.size > 0)
			console.error("Unused size entries:", [...unusedSizeEntries.values()])
		
		updatedSections.set('.symtab', writer.toArrayBuffer())
	}
	
	
	// The .rela* sections all have the purose of having pointers inside other sections.
	// Because simply embedding the pointers in the sections themselves could only carry
	// the address of the target, which wouldn't be enough information (to which symbol
	// or section does it point?), the relocations are offloaded entirely.
	// This is where the .rela* sections come in. Examples include .rela.data and .rela.rodata.
	// They contain all information necessary for relocating, such as the location where
	// the relocation should be applied to, the offset of the target and the symbol
	// where it points to.
	
	// Because most, if not all of the relocations so far were abstract relocations
	// towards strings and not addresses, we have to convert them to proper relocations first.
	const DEFAULT_RELOCATION_TYPE = 0x101
	
	{
		// string relocations
		const stringSectionIndex = sections.findIndex(section => section.name === ".rodata.str1.1")
		const stringSectionSymbolIndex = binary.symbolTable.findIndex(symbol => symbol.info == 3
			&& symbol.sectionHeaderIndex == stringSectionIndex)
		
		for (const [sectionName, sectionStringRelocations] of stringRelocations) {
			if (!allRelocations.has(sectionName))
				allRelocations.set(sectionName, [])
			
			let rawRelocations: Relocation[] = allRelocations.get(sectionName)
			
			for (const [location, str] of sectionStringRelocations) {
				let targetLocation = stringLocations.get(str)
				
				if (targetLocation != Pointer.NULL)
					rawRelocations.push(new Relocation(new Pointer(location), DEFAULT_RELOCATION_TYPE, stringSectionSymbolIndex, targetLocation))
			}
		}
	}
	
	{
		// symbol relocations
		for (const [sectionName, sectionSymbolRelocations] of symbolRelocations) {
			if (!allRelocations.has(sectionName))
				allRelocations.set(sectionName, [])
			
			let rawRelocations: Relocation[] = allRelocations.get(sectionName)
			
			for (const [location, targetSymbol] of sectionSymbolRelocations) {
				let targetSymbolIndex = binary.symbolTable.findIndex(symbol => symbol.name === targetSymbol)
				rawRelocations.push(new Relocation(new Pointer(location), DEFAULT_RELOCATION_TYPE, targetSymbolIndex, Pointer.ZERO))
			}
		}
	}
	
	{
		// symbol addr relocations
		const targetSectionIndex = sections.findIndex(section => section.name === ".data")
		const targetSectionSymbolIndex = binary.symbolTable.findIndex(symbol => symbol.info == 3
			&& symbol.sectionHeaderIndex == targetSectionIndex)
		
		for (const [sectionName, sectionSymbolRelocations] of symbolAddrRelocations) {
			if (!allRelocations.has(sectionName))
				allRelocations.set(sectionName, [])
			
			let rawRelocations: Relocation[] = allRelocations.get(sectionName)
			
			for (const [location, targetSymbolName] of sectionSymbolRelocations) {
				let targetSymbol = binary.symbolTable.find(symbol => symbol.name === targetSymbolName)
				rawRelocations.push(new Relocation(new Pointer(location), DEFAULT_RELOCATION_TYPE, targetSectionSymbolIndex, targetSymbol.location))
			}
		}
	}
	
	
	// Because relocations are always ordered sequentially by their location, 
	// they have to be sorted first, but then they can finally be serialized
	for (const [sectionName, sectionRelocations] of allRelocations) {
		let writer = new BinaryWriter()
		
		sectionRelocations.sort((a, b) => a.locationOffset.value - b.locationOffset.value)
		
		for (const relocation of sectionRelocations) {
			// console.log('relocation', relocation.locationOffset.toBigInt().toString(16), relocation.targetOffset.toBigInt().toString(16))
			relocation.toBinaryWriter(writer)
		}
		
		updatedSections.set('.rela' + sectionName, writer.toArrayBuffer())
	}
	
	console.log('allRelocations', allRelocations)
	
	
	
	// Now that all of the sections have been updated, the file needs to be reassembled.
	// For more precise information on the structure of an ELF file, see `parseElfFile`.
	
	const writer = new BinaryWriter()
	
	writer.writeArrayBuffer(BINARY_HEADER)
	
	// Sort sections by offset
	const offsetSortedSections = [...sections]
	offsetSortedSections.sort((a, b) => a.offset - b.offset)
	
	// Serialize sections
	for (const section of offsetSortedSections) {
		if (section.addrAlign > 0) {
			writer.alignTo(section.addrAlign)
		}
		
		if (section.type != 0 && section.size != 0) {
			section.offset = writer.size
		}
		
		if (updatedSections.has(section.name)) {
			let buffer = updatedSections.get(section.name)
			section.content = buffer
			section.size = buffer.byteLength
		}
		
		writer.writeArrayBuffer(section.content)
	}
	
	// Write section header table
	writer.alignTo(8)

	const sectionHeaderTableLocation = writer.size
	
	for (const section of sections) {
		if (section.name == ".rela.data") {
			console.log(section.name, section.offset.toString(16))
		}
		
		section.writeHeaderToBinaryWriter(writer)
	}
	
	
	
	const output = writer.toArrayBuffer()
	
	// update section header pointer
	let dataView = new DataView(output)
	dataView.setBigInt64(0x28, BigInt(sectionHeaderTableLocation), true)
	dataView.setInt16(0x3C, sections.length, true)
	dataView.setInt16(0x3E, findSectionIndex(".shstrtab"), true)
	
	
	
	return output
}