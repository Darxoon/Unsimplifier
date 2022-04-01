import { DataType, ElfBinary, Pointer } from "./elfBinary";
import { FILE_TYPES } from "./fileTypes";
import type { Struct } from "./fileTypes";
import { BinaryWriter } from "./misc";
import { Relocation } from "./types";
import { demangle, mangleIdentifier } from "./nameMangling";
import { enumerate } from "./util";

type SectionName = string


// Because I want this ELF code / library to stay platform indipendent, 
// I sadly have no other option than to embed it like this
const BINARY_HEADER: Uint8Array = new Uint8Array([
	0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	
	0x01, 0x00, 0xB7, 0x00, 0x01, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0xC8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	
	0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x40, 0x00, 0x0B, 0x00, 0x01, 0x00,
])


export default function serializeElfBinary(dataType: DataType, binary: ElfBinary): ArrayBuffer {
	// In order to serialize an ELF binary, we don't have to regenerate the entire file.
	// All we need to do is change the things that need to be changed and then reconstruct
	// the foundation.
	// This means that we need to serialize the these sections:
	//  - .data (contains main content)
	//  - .rodata (contains count of items in .data and optional secondary content)
	//  - .rodata.str1.1 (contains all custom strings)
	//  - .rela* (relocation tables for all sections that need one )
	//  - symbol table (required for maplink and data_npc_model.elf)
	
	const updatedSections: Map<SectionName, ArrayBuffer> = new Map()
	const allStrings: Set<string> = new Set()
	
	const allRelocations: Map<SectionName, Relocation[]> = new Map()
	const stringRelocations: Map<SectionName, Map<number, string>> = new Map()
	const objectRelocations: Map<SectionName, Map<number, object>> = new Map()
	const objectOffsets: WeakMap<object, Pointer> = new WeakMap()
	
	const symbolLocationReference: Map<string, Pointer> = new Map()
	const symbolNameOverrides: Map<string, string> = new Map()
	
	// We will start with the .data section
	// Because it is just an array of structs, serializing it is relatively straight forward
	
	// Although the .data section contains pointers, which would require the .rodata.str1.1
	// section to exist first in order to know where exactly the pointers point to,
	// this doesn't cause any problems, as no actual pointer information is stored here.
	// It is stored in .rela.data, which will be generated after .rodata.str1.1.
	
	// However, we need to note which strings exist, so they can all be written into .rodata.str1.1.
	
	{
		let writer = new BinaryWriter()
		
		let dataStringRelocations = new Map() as Map<Offset, string>
		stringRelocations.set(".data", dataStringRelocations)
		
		type Offset = number
		type SymbolName = string
		
		let symbolRelocations = new Map() as Map<Offset, SymbolName>
		
		switch (dataType) {
			case DataType.Maplink:
				serializeObjects(writer, dataStringRelocations, undefined, dataType, [
					...binary.data.get(ElfBinary.ObjectType.MaplinkNodes),
					FILE_TYPES[DataType.Maplink].instantiate()
				])
				
				serializeObjects(writer, dataStringRelocations, undefined, DataType.MaplinkHeader, 
					binary.data.get(ElfBinary.ObjectType.Main))
				
				break
			
			case DataType.DataBtlSet: {
				for (const category of binary.data.get(ElfBinary.ObjectType.Main)) {
					const { childObjects, objects, symbolName } = category
					
					for (const battle of childObjects) {
						const { objects, symbolName } = battle
						
						let symbol = binary.symbolTable.find(sym => sym.name === mangleIdentifier(symbolName))
												
						if (symbol) {
							symbol.location = new Pointer(writer.size)
							symbol.size = FILE_TYPES[DataType.BtlSetElement].size * objects.length
						} else {
							console.warn("Could not find symbol for " + symbolName)
						}
						
						serializeObjects(writer, dataStringRelocations, undefined, DataType.BtlSetElement, objects)
					}
					
					let symbol = binary.symbolTable.find(sym => sym.name === mangleIdentifier(symbolName))
												
					if (symbol) {
						symbol.location = new Pointer(writer.size)
						symbol.size = FILE_TYPES[DataType.BtlSetCategory].size * objects.length
					} else {
						console.warn("Could not find symbol for " + symbolName)
					}
					
					serializeObjects(writer, dataStringRelocations, undefined, DataType.BtlSetCategory, objects)
				}
				
				// data table
				for (const { symbolName } of binary.data.get(ElfBinary.ObjectType.Main)) {
					symbolRelocations.set(writer.size, symbolName)
					writer.writeBigInt64(0n)
				}
				
				writer.writeBigInt64(0n)
				
				
				// reloctions towards custom symbols
				// would probably would make more sense where the other relocations are generated but who cares
				let dataRelocations: Relocation[] = []
				allRelocations.set('.data', dataRelocations)
				
				let symbolReference = Object.fromEntries(binary.symbolTable.map((symbol, index) => [demangle(symbol.name), index]))
				
				for (const [offset, symbolName] of symbolRelocations) {
					dataRelocations.push(new Relocation(new Pointer(offset), 0x101, symbolReference[symbolName], Pointer.ZERO))
				}
				
				break
			}
				
			case DataType.DataNpcModel:
			case DataType.DataItemModel:
			case DataType.DataGobjModel:
			case DataType.DataHarikoModel:
			case DataType.DataNaviModel:
			case DataType.DataMobjModel:
			case DataType.DataPlayerModel:
			{
				let dataRelocations = new Map()
				objectRelocations.set('.data', dataRelocations)
				
				serializeObjects(writer, dataStringRelocations, dataRelocations, dataType,
					binary.data.get(ElfBinary.ObjectType.Main))
					
				serializeObjects(writer, dataStringRelocations, dataRelocations, dataType,
					[FILE_TYPES[dataType].instantiate()])
				
				
				let rodataStringRelocations = new Map()
				stringRelocations.set('.rodata', rodataStringRelocations)
				
				let rodataRelocations = new Map()
				objectRelocations.set('.rodata', rodataRelocations)
								
				let rodataReferences = binary.data.get(ElfBinary.ObjectType.Main).map(npc => 
					[npc.id, binary.modelSymbolReference.get(npc), npc.assetGroups, npc.states] as RodataReference)
				
				updatedSections.set('.rodata', serializeModelRodata(rodataReferences, rodataStringRelocations, rodataRelocations))
				
				for (const npc of binary.data.get(ElfBinary.ObjectType.Main)) {
					binary.modelSymbolReference.set(npc, npc.id)
				}
				
				break
			}
			
			case DataType.DataEffect: {
				// .rodata section contains normal data, dataCount and category count
				{
					const rodataWriter = new BinaryWriter()
					
					const rodataStringRelocations = new Map() as Map<Offset, string>
					stringRelocations.set(".rodata", rodataStringRelocations)
					
					serializeObjects(rodataWriter, rodataStringRelocations, undefined, dataType, binary.data.get(ElfBinary.ObjectType.Main))
					
					symbolLocationReference.set("eft::data::s_dataCount", new Pointer(rodataWriter.size))
					rodataWriter.writeInt32(binary.data.get(ElfBinary.ObjectType.Main).length)
					
					symbolLocationReference.set("eft::data::s_categoryCount", new Pointer(rodataWriter.size))
					rodataWriter.writeInt32(binary.data.get(ElfBinary.ObjectType.Category).length)
					
					updatedSections.set('.rodata', rodataWriter.toArrayBuffer())
				}
				
				// .data section is an array of category name strings
				for (const category of binary.data.get(ElfBinary.ObjectType.Category)) {
					allStrings.add(category)
					dataStringRelocations.set(writer.size, category)
					
					writer.writeBigInt64(0n)
				}
				break
			}

			case DataType.DataConfettiTotalHoleInfo: {
				const rodataWriter = new BinaryWriter()
				const rodataStringRelocations = new Map() as Map<Offset, string>
				const rodataPointers = new Map()
				
				rodataWriter.writeBigInt64(BigInt(binary.data.get(ElfBinary.ObjectType.Version)[0].version))
				
				serializeObjects(rodataWriter, rodataStringRelocations, rodataPointers, DataType.ConfettiMap,
					binary.data.get(ElfBinary.ObjectType.Map))
				
				symbolLocationReference.set("confetti::data::hole::data", new Pointer(rodataWriter.size))
				
				serializeObjects(rodataWriter, rodataStringRelocations, rodataPointers, DataType.ConfettiData,
					binary.data.get(ElfBinary.ObjectType.DataHeader))
				
				for (const map of binary.data.get(ElfBinary.ObjectType.Map) as Struct<DataType.ConfettiMap>[]) {
					symbolLocationReference.set(`confetti::data::hole::${map.id}_Hole_List`, new Pointer(rodataWriter.size))

					serializeObjects(rodataWriter, rodataStringRelocations, rodataPointers, DataType.ConfettiHole,
						map.holes)
				}
				
				console.log('rodataPointers', rodataPointers)
				
				objectRelocations.set('.rodata', rodataPointers)
				stringRelocations.set(".rodata", rodataStringRelocations)
				updatedSections.set('.rodata', rodataWriter.toArrayBuffer())

				break
			}
			
			default:
				serializeObjects(writer, dataStringRelocations, undefined,
					dataType, binary.data.get(ElfBinary.ObjectType.Main))
				
				let isStandardDataFile = dataType >= DataType.DataNpc && dataType < DataType.DataNpcModel
				
				if (isStandardDataFile || dataType == DataType.DataItemSet || dataType == DataType.DataMaplinkZoom || dataType == DataType.DataParty) {
					serializeObjects(writer, dataStringRelocations, undefined,
						dataType, [FILE_TYPES[dataType].instantiate()])
				}
				break
		}
		
		updatedSections.set('.data', writer.toArrayBuffer())
		
		type RodataReference = [id: string, originalId: string, assetGroups: Struct<DataType.NpcFiles>[], states: Struct<DataType.NpcState>[]]
		
		function serializeModelRodata(rodataReferences: RodataReference[], rodataStringRelocations: Map<number, string>, rodataRelocations: Map<number, object>) {
			const rodataWriter = new BinaryWriter()
			
			const serializeObjectsRodata = serializeObjects.bind(undefined, 
				rodataWriter, rodataStringRelocations, rodataRelocations) as 
				(dataType: DataType, objects: object[]) => void
				
			// .rodata section is structured like this:
			
			// AssetGroup[]
			// State[]
			// ...
			// modelNpc_num (amount of objects in .data)
			// for each entry in .data:
			//   substate[]
			//   substate[]
			//     face[]
			//       anime[]
			//     face[]
			//       anime[]
			//       anime[]
			//       ...
			
			// the strings in .rodata are serialized in this order:
			// for each entry in .data
			//     AssetGroup, State, all animes connected to this state...
			
			// While it may seem unnnecessary to serialize the strings in exactly
			// the same order they were in originally, it is important to me that
			// the input file and unmodified output file are exactly equal, in order
			// to prevent bugs that would go unnoticed
			
			// step 1: Serialize Asset Groups, States and the strings from animes
			for (const [id, originalId, assetGroups, states] of rodataReferences) {
				serializeObjectsRodata(DataType.NpcFiles, assetGroups)
				serializeObjectsRodata(DataType.NpcFiles, [FILE_TYPES[DataType.NpcFiles].instantiate()])
				
				serializeObjectsRodata(DataType.NpcState, states)
				serializeObjectsRodata(DataType.NpcState, [FILE_TYPES[DataType.NpcState].instantiate()])
				
				let animes = (states as any[])
					.flatMap(state => state.substates)
					.flatMap(substate => substate.faces)
					.flatMap(face => face.animations)
				
				serializeStringsOnly(DataType.NpcAnime, animes)
			}
			
			// generate symbol reference for asset groups and states
			for (const [id, originalId, assetGroups, states] of rodataReferences) {
				let assetGroupOffset = assetGroups.length > 0 ? objectOffsets.get(assetGroups[0]) : objectOffsets.get(assetGroups)
				symbolLocationReference?.set(`wld::fld::data:::${originalId}_model_files`, assetGroupOffset)
				symbolNameOverrides?.set(`wld::fld::data:::${originalId}_model_files`, `wld::fld::data:::${id}_model_files`)
				
				let stateOffset = states.length > 0 ? objectOffsets.get(states[0]) : objectOffsets.get(states)
				symbolLocationReference?.set(`wld::fld::data:::${originalId}_state`, stateOffset)
				symbolNameOverrides?.set(`wld::fld::data:::${originalId}_state`, `wld::fld::data:::${id}_state`)
			}
			
			// step 2: serialize modelNpc_num
			symbolLocationReference?.set(FILE_TYPES[dataType].countSymbol, new Pointer(rodataWriter.size))
			rodataWriter.writeBigInt64(BigInt(binary.data.get(ElfBinary.ObjectType.Main).length))
			
			// step 3: serialize substates, faces and animes
			for (const [id, originalId, assetGroups, states] of rodataReferences) {
				
				let animeCount = 0
				
				for (const [state, i] of enumerate(states)) {
					symbolLocationReference?.set(`wld::fld::data:::${originalId}_state${i}`, new Pointer(rodataWriter.size))
					symbolNameOverrides?.set(`wld::fld::data:::${originalId}_state${i}`, `wld::fld::data:::${id}_state${i}`)
					
					serializeObjectsRodata(DataType.NpcSubState, state.substates)
					serializeObjectsRodata(DataType.NpcSubState, [FILE_TYPES[DataType.NpcSubState].instantiate()])
				}
				
				for (const [state, i] of enumerate(states)) {
					let { substates } = state
					
					for (const [substate, j] of enumerate(substates)) {
						let { faces } = substate as Struct<DataType.NpcSubState>
						
						symbolLocationReference?.set(`wld::fld::data:::${originalId}_state${i}_face${j}`, new Pointer(rodataWriter.size))
						symbolNameOverrides?.set(`wld::fld::data:::${originalId}_state${i}_face${j}`, `wld::fld::data:::${id}_state${i}_face${j}`)
						
						serializeObjectsRodata(DataType.NpcFace, faces)
						serializeObjectsRodata(DataType.NpcFace, [FILE_TYPES[DataType.NpcFace].instantiate()])
					}
					
					for (const substate of substates) {
						let faces = substate.faces
						
						for (const face of faces) {
							let animes = face.animations
							
							symbolLocationReference?.set(`wld::fld::data:::${originalId}_anime${animeCount}`, new Pointer(rodataWriter.size))
							symbolNameOverrides?.set(`wld::fld::data:::${originalId}_anime${animeCount}`, `wld::fld::data:::${id}_anime${animeCount}`)
							
							animeCount += 1
							
							serializeObjectsRodata(DataType.NpcAnime, animes)
							serializeObjectsRodata(DataType.NpcAnime, [FILE_TYPES[DataType.NpcAnime].instantiate()])
						}
					}
				}
			}
			
			return rodataWriter.toArrayBuffer()
		}
		
		function serializeObjects(writer: BinaryWriter, sectionStringRelocations, sectionPointers, dataType: DataType, objects: object[]) {
			if (objects.length == 0) {
				objectOffsets.set(objects, new Pointer(writer.size))
			}
			
			for (const instance of objects) {
				objectOffsets.set(instance, new Pointer(writer.size))
				
				for (const [fieldName, fieldType] of Object.entries(FILE_TYPES[dataType].typedef)) {
					let fieldValue = instance[fieldName]
					
					switch (fieldType) {
						case "string": 
							allStrings.add(fieldValue)
							
							if (fieldValue != null)
								sectionStringRelocations.set(writer.size, fieldValue)
							
							writer.writeBigInt64(0n)
							break
						case "symbol": 
							if (fieldValue != null)
								symbolRelocations.set(writer.size, fieldValue)
							
							writer.writeBigInt64(0n)
							break
						case "pointer":
							// empty arrays are null as well
							if (!Pointer.NULL.equals(fieldValue)) {
								if (fieldValue === undefined)
									console.warn()
								
								sectionPointers.set(writer.size, fieldValue)
							}
						
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
	// .rodata additionally contains a lot of indipendent structs or struct arrays similar to
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
				writer.writeInt32(binary.data.get(ElfBinary.ObjectType.Main).length)
		}
		
		updatedSections.set('.rodata', writer.toArrayBuffer())
	}
	
	// The .rodata.str1.1 section maybe sounds like it's similar to .rodata, 
	// but in terms of content, it's not. It contains all of the strings in the content sections
	// (as opposed to .strtab, which contains ELF format related strings).
	// Because we collected the strings earlier into the allStrings variable, we can now serialize
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
	
	
	// In Maplink files, symbol 9 always points to the beginning of the Maplink Header
	if (dataType == DataType.Maplink) {
		const dataSection = updatedSections.get('.data')
		
		const maplinkSymbol = binary.symbolTable[9]
		const maplinkHeaderSize = FILE_TYPES[DataType.MaplinkHeader].size
		
		maplinkSymbol.location = new Pointer(dataSection.byteLength - maplinkHeaderSize)
	}
	
	
	// @ts-ignore
	const sections = binary.sections
	
	
	// In many file formats, the Symbol Table contains references to the content of the files.
	// This means that for these data types, it has to be modified and serialized again.
	
	// The symbol table is very straight forward. It's an array of `Symbol`s. However, the
	// first element is always completely zero.
	{
		const stringTable = sections.find(section => section.name == ".strtab")
		
		let writer = new BinaryWriter()
		
		for (const symbol of binary.symbolTable) {
			let symbolId = demangle(symbol.name)
			
			if (symbolLocationReference?.has(symbolId)) {
				symbol.location = symbolLocationReference.get(symbolId)
			} else {
				// console.warn(`Symbol ${JSON.stringify(symbolId)} offset is not being updated`)
			}
			
			if (symbolNameOverrides?.has(symbolId)) {
				let newId = symbolNameOverrides.get(symbolId)
				
				// if the symbol *actually* changed, then warn, otherwise log
				if (symbolId != newId) {
					console.warn(`Updating name of Symbol ${JSON.stringify(symbolId)} to ${JSON.stringify(newId)}`)
				} else {
					// console.log(`Updating name of Symbol ${JSON.stringify(symbolId)} to ${JSON.stringify(newId)}`)
				}
				
				symbol.name = mangleIdentifier(newId)
			}
			
			
			symbol.toBinaryWriter(writer, stringTable)
		}
		
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
		let rodataSectionIndex = sections.findIndex(section => section.name === ".rodata")
		let symbolIndex = binary.symbolTable.findIndex(symbol => symbol.info == 3 && symbol.sectionHeaderIndex == rodataSectionIndex)
		
		for (const [sectionName, sectionObjectRelocations] of objectRelocations) {
			if (!allRelocations.has(sectionName))
				allRelocations.set(sectionName, [])
			
			let rawRelocations: Relocation[] = allRelocations.get(sectionName)
			
			for (const [location, target] of sectionObjectRelocations) {
				let targetLocation = objectOffsets.get(target instanceof Array && target.length > 0 ? target[0] : target)
				
				if (!targetLocation)
					console.warn()
				
				if (targetLocation != Pointer.NULL)
					rawRelocations.push(new Relocation(new Pointer(location), DEFAULT_RELOCATION_TYPE, symbolIndex, targetLocation))
			}
		}
	}
	
	// Maplink files always have a relocation for field_0x20 in the header to symbol 8
	if (dataType == DataType.Maplink) {
		let headerSize = FILE_TYPES[DataType.MaplinkHeader].size
		
		let offset = updatedSections.get('.data').byteLength - headerSize + 0x10
		
		allRelocations.get('.data').push(new Relocation(new Pointer(offset), 0x101, 0x8, Pointer.ZERO))
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
	// Basically, an ELF file is made up of these things: Header, Sections, Section Header Table.
	
	const writer = new BinaryWriter()
	
	function alignWithPadding(writer: BinaryWriter, byteAlignment: number) {
		writer.writeUint8Array(new Array((byteAlignment - writer.size % byteAlignment) % byteAlignment).fill(0))
	}
	
	writer.writeArrayBuffer(BINARY_HEADER)
	
	
	// Sort sections by offset
	const offsetSortedSections = [...sections]
	offsetSortedSections.sort((a, b) => a.offset - b.offset)
	
	// Serialize sections
	for (const section of offsetSortedSections) {
		if (section.addrAlign > 0) {
			alignWithPadding(writer, section.addrAlign)
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
	alignWithPadding(writer, 8)

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
	
	
	
	return output
}