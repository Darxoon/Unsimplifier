import type EditorStrip from "$lib/editor/EditorStrip.svelte"
import { showModal } from "$lib/modal/modal"
import TextAlert from "$lib/modal/TextAlert.svelte"
import DataTypePrompt from "$lib/modals/DataTypePrompt.svelte"
import SaveAsDialog from "$lib/modals/SaveAsDialog.svelte"
import { globalEditorStrip, loadedAutosave } from "$lib/stores"
import { compress, decompress, downloadBlob, createFileTab, downloadText } from "$lib/util"
import { Pointer, type ElfBinary, type DataDivision } from "paper-mario-elfs/elfBinary"
import { DataType } from "paper-mario-elfs/dataType"
import parseElfBinary from "paper-mario-elfs/parser"
import serializeElfBinary from "paper-mario-elfs/serializer"
import stripBinary from "paper-mario-elfs/strip"
import type { MenuCategory } from "$lib/types"
import { Vector3 } from "paper-mario-elfs/misc"
import { Symbol } from "paper-mario-elfs/types"
import { getRomfsVfs } from "$lib/save/projects"
import yaml from 'js-yaml'
import { FILE_TYPES } from "paper-mario-elfs/fileTypes"
import { VALUE_UUID, type UuidTagged, ValueUuid, DATA_TYPE } from "paper-mario-elfs/valueIdentifier"
import { enumerate } from "paper-mario-elfs/util"
import { addToRecentFiles } from "$lib/save/recent"

let editorStrip: EditorStrip
globalEditorStrip.subscribe(value => editorStrip = value)

/**
 * Symbol without its methods
 */
interface PlainSymbol {
	name?: string
	isNameMangled?: boolean
	info?: number
	visibility?: number
	sectionHeaderIndex?: number
	location?: Pointer
	size?: number
}

export function getFileMenu(): MenuCategory {
	return {
		title: "File",
		items: [
			{
				name: "Close session",
				onClick() {
					let result = confirm("Do you want to close all tabs?")
					
					if (result) {
						loadedAutosave.set(true)
						editorStrip.reset()
					}
				}
			},
			{
				name: "Open...",
				onClick: openFileSelector
			},
			{
				name: "Save...",
				onClick: saveFile
			},
			{
				name: "Save As...",
				onClick: openSaveDialog,
			},
			{
				name: "Export To Yaml...",
				onClick: saveYaml,
			},
		],
	}
}

export async function openFileToEditor(file: File) {
	if (file.name.endsWith('.yaml')) {
		await openYamlToEditor(await file.text(), file.name)
			.catch(async (e: Error) => {
				await showModal(TextAlert, {
					title: "Invalid File",
					content: `
Error: Tried to load invalid Unsimplifier Yaml file

(reason: ${e.message})`,
				})
				throw e
			})
	} else {
		await openElfToEditor(file)
	}
}

export async function openElfToEditor(file: File) {
	const contentPromise = file.arrayBuffer()
	
	const {dataType, isCompressed} = await showModal(DataTypePrompt, {
		fileName: file.name,
	})

	if (!dataType) {
		return
	}
	
	console.log(DataType[dataType])
	
	const content = isCompressed ? await decompress(await contentPromise) : await contentPromise
	
	let binary: ElfBinary
	
	try {
		binary = parseElfBinary(dataType, content)
	} catch (e) {
		showModal(TextAlert, {
			title: "Parse Error",
			content: `There has been an issue with the parsing of the file
${file.name}. Please report this to the developer (Darxoon)

(reason: ${e.message})`
		})
		
		throw e
	}
	
	addToRecentFiles({
		label: `???/${file.name}`,
		dataType,
		saveId: -1,
	})
	
	editorStrip.appendTab(createFileTab(file.name, null, binary, dataType, isCompressed))
}

export async function openYamlToEditor(text: string, fileName: string) {
	const romfs = getRomfsVfs()
	
	const [metadata, data, symbolNameTable, symbolTable] = yaml.loadAll(text)
	console.log(yaml.loadAll(text))
	
	// metadata
	if (!(typeof metadata == 'object'
		&& 'base_file_path' in metadata
		&& 'data_type' in metadata
		&& 'compressed' in metadata
		&& typeof metadata.base_file_path == 'string'
		&& typeof metadata.data_type == 'string'
		&& typeof metadata.compressed == 'boolean'))
		throw new Error('Invalid yaml file, first document (metadata) does not match requirements')
	
	const { data_type: dataTypeString, base_file_path: baseFilePath, compressed } = metadata
	const dataType = DataType[dataTypeString]
	
	let baseFile = await (await romfs).getFileContent('/' + baseFilePath, false)
	let binary = parseElfBinary(dataType, await decompress(baseFile))
	
	// symbol table
	if (symbolTable) {
		const { modified_symbols: modifiedSymbols, new_symbols: newSymbols } = symbolTable as { modified_symbols?: unknown, new_symbols?: unknown}
		
		if (modifiedSymbols) {
			for (const yamlSymbol of modifiedSymbols as ({ index: number } & PlainSymbol)[]) {
				console.log(`modifying symbol ${yamlSymbol.index} previously\
with name '${binary.symbolTable[yamlSymbol.index].name}' and now '${yamlSymbol.name}'`)
				
				let symbol = binary.symbolTable[yamlSymbol.index]
				
				
				if (yamlSymbol.name != undefined)
					symbol.name = yamlSymbol.name
				if (yamlSymbol.isNameMangled != undefined)
					symbol.isNameMangled = yamlSymbol.isNameMangled
				if (yamlSymbol.info != undefined)
					symbol.info = yamlSymbol.info
				if (yamlSymbol.visibility != undefined)
					symbol.visibility = yamlSymbol.visibility
				if (yamlSymbol.sectionHeaderIndex != undefined)
					symbol.sectionHeaderIndex = yamlSymbol.sectionHeaderIndex
				if (yamlSymbol.location != undefined)
					symbol.location = yamlSymbol.location
				if (yamlSymbol.size != undefined)
					symbol.size = yamlSymbol.size
			}
		}
		
		if (newSymbols instanceof Array) {
			for (const yamlSymbol of newSymbols as PlainSymbol[]) {
				console.log(`adding symbol '${yamlSymbol.name}'`)
				
				let symbol = new Symbol()
				symbol.name = yamlSymbol.name
				symbol.isNameMangled = yamlSymbol.isNameMangled
				symbol.info = yamlSymbol.info
				symbol.visibility = yamlSymbol.visibility
				symbol.sectionHeaderIndex = yamlSymbol.sectionHeaderIndex
				symbol.location = yamlSymbol.location
				symbol.size = yamlSymbol.size
				binary.symbolTable.push(symbol)
			}
		}
	}
	
	// data
	if (!(typeof data == 'object'))
		throw new Error('Invalid yaml file, second document (data section) is not a dict')
	
	// TODO: support for data types with other data divisions than 'main'
	const dataDivisions: DataDivision[] = ['main']
	let resultData: {[dataDivision in DataDivision]?: UuidTagged[]} = {}
	
	for (const dataDivision of dataDivisions) {
		if (!(dataDivision in data && data[dataDivision] instanceof Array))
			throw new Error(`Invalid yaml file, data division '${dataDivision}' does not exist or is invalid`)
		
		resultData[dataDivision] = parseYamlItems(dataType, data[dataDivision] as unknown[], dataDivision, symbolNameTable, binary)
	}
	
	// apply changes to base file
	binary.data = resultData
	
	// TODO: apply modifications to symbol table
	
	let outFileName = fileName.slice(0, fileName.lastIndexOf('.')) + (compressed ? '.elf.zst' : '.elf')
	
	addToRecentFiles({
		label: `???/${outFileName}`,
		dataType,
		yamlContent: text,
	})
	
	editorStrip.appendTab(createFileTab(outFileName, baseFilePath, binary, dataType, compressed))
}

function parseYamlItems(dataType: DataType, yamlItems: unknown[],
	dataDivision: DataDivision, symbolNameTable: unknown, baseBinary: ElfBinary): UuidTagged[] {
	
	let elfItems: UuidTagged[] = []
	
	for (const [item, i] of enumerate(yamlItems)) {
		if (!(typeof item == 'object'))
			throw new Error(`Invalid yaml file, object ${i} in '${dataDivision}' is invalid`)
		
		// @ts-expect-error
		let obj: UuidTagged = {}
		
		for (const [fieldName, fieldType] of Object.entries(FILE_TYPES[dataType].typedef)) {
			let yamlValue: unknown
			
			if (fieldName in item)
				yamlValue = item[fieldName]
			else {
				let defaultFieldName = 'field_0x' + FILE_TYPES[dataType].fieldOffsets[fieldName].toString(16)
				
				if (defaultFieldName in item)
					yamlValue = item['field_0x' + FILE_TYPES[dataType].fieldOffsets[fieldName].toString(16)]
				else
					throw new Error(
`Invalid yaml file, object ${i} in '${dataDivision}' \
is missing field '${fieldName}' or '${defaultFieldName}'`)
			}
			
			switch (fieldType) {
				case "string":
					if (typeof yamlValue != 'string' && yamlValue != null)
						throw new Error(
`Invalid yaml file, expected string for '${fieldName}' \
in '${dataDivision}' object ${i} but got '${yamlValue}'`)
					
					obj[fieldName] = yamlValue
					break
				case "bool8":
				case "bool32":
					if (typeof yamlValue != 'boolean')
						throw new Error(
`Invalid yaml file, expected boolean for '${fieldName}' \
in '${dataDivision}' object ${i} but got '${yamlValue}'`)
					
					obj[fieldName] = yamlValue
					break
				case "byte":
				case "short":
				case "int":
				case "long":
					if (typeof yamlValue != 'number' || Math.round(yamlValue) != yamlValue)
						throw new Error(
`Invalid yaml file, expected ${fieldType} for '${fieldName}' \
in '${dataDivision}' object ${i} but got '${yamlValue}'`)
					
					obj[fieldName] = yamlValue
					break
				case "float":
				case "double":
					if (typeof yamlValue != 'number')
						throw new Error(
`Invalid yaml file, expected ${fieldType} for '${fieldName}' \
in '${dataDivision}' object ${i} but got '${yamlValue}'`)
					
					obj[fieldName] = yamlValue
					break
				case "Vector3":
					if (typeof yamlValue != 'object')
						throw new Error(
`Invalid yaml file, expected Vector3 for '${fieldName}' \
in '${dataDivision}' object ${i} but got ${yamlValue}`)
					
					const { x, y, z } = yamlValue as { x: number, y: number, z: number }
					
					if (typeof x != 'number' || typeof y != 'number' || typeof z != 'number')
						throw new Error(`Invalid yaml file, invalid Vector3 '${fieldName}' in '${dataDivision}' object ${i}`)
					
					obj[fieldName] = new Vector3(x, y, z)
					break
				case "symbol":
				case "symbolAddr": {
					if (!(yamlValue instanceof Array))
						throw new Error(`Invalid yaml file, invalid child array '${fieldName}' in '${dataDivision}' object ${i}`)
					
					let symbolName = symbolNameTable[dataDivision][item[FILE_TYPES[dataType].identifyingField]]
					
					if (symbolName == undefined) {
						symbolName = "new_symbol_" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
					}
					
					let childObj = {
						symbolName,
						children: parseYamlItems(
							FILE_TYPES[dataType].childTypes[fieldName],
							yamlValue,
							dataDivision,
							symbolNameTable,
							baseBinary,
						),
					}
					
					if (baseBinary.findSymbol(childObj.symbolName) == null) {
						let symbol = new Symbol()
						symbol.name = childObj.symbolName
						symbol.info = 1
						symbol.sectionHeaderIndex = 3
						baseBinary.symbolTable.push(symbol)
					}
					
					obj[fieldName] = childObj
					
					break
				}
				default:
					throw new Error(`Invalid field type ${fieldType} (object ${i} in '${dataDivision}')`)
			}
		}
		
		obj[VALUE_UUID] = ValueUuid(`yaml ${DataType[dataType]} ${obj[FILE_TYPES[dataType].identifyingField]}`)
		obj[DATA_TYPE] = dataType
		
		elfItems.push(obj)
	}
	
	return elfItems
}

function openFileSelector() {
	console.log("opening file")

	const fileSelector = document.createElement('input')
	fileSelector.setAttribute('type', 'file')
	fileSelector.setAttribute('accept', ".elf,.elf.zst,.yaml")
	fileSelector.click()
	
	fileSelector.addEventListener('change', async (e: any) => {
		const file: File = e.target.files[0]
		await openFileToEditor(file)
	})
}

async function saveFile() {
	let tab = editorStrip.activeTab()
	
	if (tab.parentId) {
		showModal(TextAlert, {
			title: "Cannot Save",
			content: "Try saving the parent file instead."
		})
		return
	}

	let { name, isCompressed, content } = tab
	
	if (content.type != "cardList") {
		// TODO: ideally, this menu option should just be grayed out in the first place
		throw new Error("Cannot save non-cards list file")
	}
	
	if (isCompressed && !name.endsWith('.zst')) {
		name += '.zst'
	}
	
	if (!isCompressed && name.endsWith('.zst')) {
		name = name.slice(0, name.length - 4)
	}
	
	const { dataType, binary } = content
	
	let serialized = serializeElfBinary(dataType, binary)
	let output = isCompressed ? await compress(serialized) : serialized
	
	downloadBlob(output, name)
}

async function saveYaml() {
	const romfs = getRomfsVfs()
	
	let tab = editorStrip.activeTab()
	
	if (tab.parentId) {
		showModal(TextAlert, {
			title: "Cannot Save",
			content: "Try saving the parent file instead."
		})
		return
	}

	const { name, content, isCompressed } = tab
	
	if (content.type != "cardList") {
		// TODO: ideally, this menu option should just be grayed out in the first place
		throw new Error("Cannot save non-cards list file")
	}
	
	let { dataType, binary, filePath } = content
	
	if (filePath == null) {
		if (FILE_TYPES[dataType].romfsPath == null) {
			// TODO: make file picker modal
			await showModal(TextAlert, {
				title: "Export To Yaml (WIP)",
				content: `
You probably opened the current file through File > Open, which means that because
of browser limitations, Unsimplifier is not able to see the path inside the romfs
of your file. For yaml exporting however, this is required to know.

For now, this means you cannot export this file :( In the future this problem
will be solved.`
			})
			return
		}
		
		filePath = FILE_TYPES[dataType].romfsPath
	}
	
	let outFileName: string
	
	if (name.endsWith('.elf.zst')) {
		outFileName = name.slice(0, -'.elf.zst'.length) + '.yaml'
	} else if (name.endsWith('.elf.zst')) {
		outFileName = name.slice(0, -'.elf'.length) + '.yaml'
	} else {
		outFileName = name + '.yaml'
	}
	
	const baseFile = await (await romfs).getFileContent('/' + filePath, false)
	const baseBinary = parseElfBinary(dataType, await decompress(baseFile))
	
	console.log('isCompressed', tab)
	
	try {
		var yaml = toYaml(binary, baseBinary, filePath, dataType, isCompressed)
	} catch (e) {
		await showModal(TextAlert, {
			title: "Saving Error",
			content: `
Unfortunately, there has been an error while saving the YAML file.

Reason: ${e.message}`
		})
		return
	}
	
	downloadText(yaml, outFileName, 'application/x-yaml')
}

function toYaml(binary: ElfBinary, baseBinary: ElfBinary, basePath: string, dataType: DataType, compressed: boolean) {
	let out = ""
	
	// first section: metadatadata
	out += "---\n# Metadata (do not modify)\n"
	out += "base_file_path: " + basePath + "\n",
	out += "data_type: " + DataType[dataType] + "\n",
	out += "compressed: " + compressed + "\n",
	
	// second section: data
	out += "---\n# Content of the elf file\n"
	
	let symbolNameRegistry: Map<DataDivision, Map<string, string>> = new Map()
	
	for (const [ dataDivision, items ] of Object.entries(binary.data)) {
		let symbolNames: Map<string, string> = new Map()
		symbolNameRegistry.set(dataDivision as DataDivision, symbolNames)
		
		out += dataDivision + ":\n"
		
		let isFirst = true
		for (const obj of items) {
			if (isFirst) {
				isFirst = false
			} else {
				out += '  \n'
			}
			out += '  - ' + objToYaml(obj, 2, symbolNames)
		}
	}
	
	// get symbol table diff
	const baseSymbols = baseBinary.symbolTable
	const symbols = binary.symbolTable
	
	console.log(baseSymbols.length, symbols.length)
	
	// collect data
	let modifiedSymbols: ({ index: number } & PlainSymbol)[] = []
	
	for (let i = 0; i < baseSymbols.length; i++) {
		if (!symbols[i].equals(baseSymbols[i])) {
			console.log(symbols[i], baseSymbols[i])
			
			let clone = { index: i, ...symbols[i] }
			
			for (const [fieldName, fieldValue] of Object.entries(clone)) {
				if (baseSymbols[i][fieldName] == fieldValue && fieldName != 'name')
					delete clone[fieldName]
			}
			
			modifiedSymbols.push(clone)
		}
	}
	
	let newSymbols: Symbol[] = []
	
	for (let i = baseSymbols.length; i < symbols.length; i++) {
		newSymbols.push(symbols[i])
	}
	
	// third section: symbol name registry
	if (symbolNameRegistry.size > 0 || modifiedSymbols.length > 0 || newSymbols.length > 0) {
		out += "\n---\n# Symbol Names\n"
		
		for (const [dataDivision, symbolNames] of symbolNameRegistry) {
			out += dataDivision + ':\n'
			
			for (const [id, symbolName] of symbolNames) {
				out += `  ${id}: ${stringToYaml(symbolName, 1)}\n`
			}
		}
	}
	
	// fourth section: symbol table	
	if (modifiedSymbols.length > 0 || newSymbols.length > 0) {
		out += "\n---\n# Symbol Table\n"
	}
	
	if (modifiedSymbols.length > 0) {
		out += "modified_symbols:\n"
		
		for (const symbol of modifiedSymbols) {
			out += '  - ' + objToYaml(symbol, 2)
		}
	}
	
	if (newSymbols.length > 0) {
		out += "new_symbols:\n"
		
		for (const symbol of newSymbols) {
			out += '  - ' + objToYaml(symbol, 2)
		}
	}
	
	return out
}

const PLAIN_STRING_NOT_ALLOWED = ['!', '&', '*', '- ', ': ', '? ', '{', '}', '[', ']',' ,', '#', '|', '>', '@', '`', '"', '\'', '//']

function objToYaml(obj: any, indentation: number, symbolNames?: Map<string, string>, numbersAsFloats = false): string {
	if (typeof obj !== "object")
		throw new TypeError(`${obj} needs to be an object`)
	
	let firstField = true
	let out = ""
	
	for (const [ fieldName, fieldValue ] of Object.entries(obj)) {
		if (!firstField)
			out += "  ".repeat(indentation)
		else
			firstField = false
		
		out += fieldName + ':'
		
		// special values
		if (fieldValue instanceof Vector3) {
			const { x, y, z } = fieldValue
			out += '\n' + "  ".repeat(indentation + 1) + objToYaml({ x, y, z }, indentation + 1, symbolNames, true)
			continue
		}
		
		if (fieldValue instanceof Pointer) {
			out += ' ' + fieldValue.value + '\n'
			continue
		}
		
		if (fieldValue instanceof Array) {
			out += '\n'
			
			for (const item of fieldValue) {
				out += "  ".repeat(indentation + 1) + '- ' + objToYaml(item, indentation + 2, symbolNames)
			}
			continue
		}
		
		if (typeof fieldValue == 'object' && fieldValue !== null) {
			if ('symbolName' in fieldValue && 'children' in fieldValue && fieldValue.children instanceof Array) {
				// TODO: use identifyingField here
				const id = obj.id as string
				
				if (symbolNames.has(id))
					throw new Error(`There are two or more objects with the ID '${id}' (${DataType[obj[DATA_TYPE]]})`)
				
				symbolNames.set(id, fieldValue.symbolName as string)
				
				out += '\n'
				
				for (const item of fieldValue.children) {
					out += "  ".repeat(indentation + 1) + '- ' + objToYaml(item, indentation + 2, symbolNames)
				}
			} else {
				out += '\n' + "  ".repeat(indentation + 1) + objToYaml(fieldValue, indentation + 1, symbolNames)
			}
			continue
		}
		
		// plain values
		out += ' '
		
		if (typeof fieldValue == 'string') {
			out += stringToYaml(fieldValue, indentation)
		}
		
		else if (typeof fieldValue == 'number' && numbersAsFloats) {
			out += floatToString(fieldValue)
		}
		
		else if (typeof fieldValue == 'number'
			|| typeof fieldValue == 'boolean'
			|| fieldValue === null) {
			
			// TODO: print floats but not ints with at least one digit
			out += fieldValue
		}
		
		out += '\n'
	}
	
	return out
}

function stringToYaml(str: string, indentation: number): string {
	// strings are hella complex wow
	let requiresQuotedString = str.includes(': ')
	|| str.includes(' #')
	|| str.includes('\t')
	|| str != str.trim()
	|| !PLAIN_STRING_NOT_ALLOWED.every(str => !str.startsWith(str))

	if (requiresQuotedString) {
		// in "quotes"
		return JSON.stringify(str)
	} else if (str.includes('\n')) {
		// multiline (|- ...)
		let out = "|-\n"
		let lines = str.split('\n')
		
		for (const line of lines.slice(0, -1)) {
			out += "  ".repeat(indentation + 1) + line + '\n'
		}
		
		out += "  ".repeat(indentation + 1) + lines.at(-1)
		return out
	} else {
		// plain
		return str
	}
}

function floatToString(x: number): string {
	return x.toLocaleString("en-us", { minimumFractionDigits: 1, maximumFractionDigits: 99 })
}

export interface SaveAsDialogResults {
	fileName: string
	compressFile: boolean
	compressionRatio?: number
	stripFile: boolean
}

async function openSaveDialog() {
	let tab = editorStrip.activeTab()
	
	if (tab.parentId) {
		showModal(TextAlert, {
			title: "Cannot Save",
			content: "Try saving the parent file instead."
		})
		return
	}
	
	if (tab.content.type != "cardList") {
		// TODO: ideally, this menu option should just be grayed out in the first place
		throw new Error("Cannot save non-cards list file")
	}
	
	const { dataType, binary } = tab.content	
	
	const modalOptions = {
		fileName: tab.name,
		compressFile: tab.isCompressed,
	}
	
	let { fileName, compressFile, compressionRatio, stripFile } = await showModal<SaveAsDialogResults>(SaveAsDialog, modalOptions)
	
	tab.isCompressed = compressFile
	
	fileName = fileName.trim()
	
	if (compressFile && !fileName.endsWith('.zst')) {
		fileName += '.zst'
	}
	
	if (!compressFile && fileName.endsWith('.zst')) {
		fileName = fileName.slice(0, fileName.length - 4)
	}
	
	if (stripFile) {
		stripBinary(binary, { comment: "Made with Origami Wand by Darxoon" })
	}
	
	let serialized = serializeElfBinary(dataType, binary)
	
	try {
		let output = compressFile ? await compress(serialized, compressionRatio) : serialized
		
		downloadBlob(output, fileName)
	} catch (e) {
		if (typeof e == "string" && e.includes("OOM")) {
			showModal(TextAlert, {
				title: "Zstd Error",
				content: "Not enough memory available for Compression. Try lowering the compression ratio.",
			})
		}
	}
}
