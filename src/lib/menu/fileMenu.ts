import type EditorStrip from "$lib/editor/EditorStrip.svelte"
import { showModal } from "$lib/modal/modal"
import TextAlert from "$lib/modal/TextAlert.svelte"
import DataTypePrompt from "$lib/modals/DataTypePrompt.svelte"
import SaveAsDialog from "$lib/modals/SaveAsDialog.svelte"
import { globalEditorStrip, loadedAutosave } from "$lib/stores"
import { compress, decompress, downloadBlob, getFileContent, createFileTab, downloadText } from "$lib/util"
import { Pointer, type ElfBinary } from "paper-mario-elfs/elfBinary"
import { DataType } from "paper-mario-elfs/dataType"
import parseElfBinary, { EmptyFileError } from "paper-mario-elfs/parser"
import serializeElfBinary from "paper-mario-elfs/serializer"
import stripBinary from "paper-mario-elfs/strip"
import type { MenuCategory } from "$lib/types"
import { Vector3 } from "paper-mario-elfs/misc"
import type { Symbol } from "paper-mario-elfs/types"
import { getRomfsVfs } from "$lib/save/projects"

let editorStrip: EditorStrip
globalEditorStrip.subscribe(value => editorStrip = value)

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
	const contentPromise = getFileContent(file)
	
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
		if (e instanceof EmptyFileError) {
			showModal(TextAlert, {
				title: "Opening File",
				content: "File is empty. Generating a new file instead."
			})
				.then(() => {
					showModal(TextAlert, {
						title: "Error",
						content: "Error: Not implemented yet."
					})
				})
		}
		
		throw e
	}

	editorStrip.appendTab(createFileTab(file.name, binary, dataType, isCompressed))
}

function openFileSelector() {
	console.log("opening file")

	const fileSelector = document.createElement('input')
	fileSelector.setAttribute('type', 'file')
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

	const { name, isCompressed, content } = tab
	
	if (content.type != "cardList") {
		// TODO: ideally, this menu option should just be grayed out in the first place
		throw new Error("Cannot save non-cards list file")
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

	const { name, content } = tab
	
	if (content.type != "cardList") {
		// TODO: ideally, this menu option should just be grayed out in the first place
		throw new Error("Cannot save non-cards list file")
	}
	
	const { dataType, binary, filePath } = content
	
	if (!filePath) {
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
	
	let yaml = toYaml(binary, baseBinary, filePath, dataType)
	
	downloadText(yaml, outFileName, 'application/x-yaml')
}

function toYaml(binary: ElfBinary, baseBinary: ElfBinary, basePath: string, dataType: DataType) {
	let out = ""
	
	// first section: metadatadata
	out += "---\n# Metadata (do not modify)\n"
	out += "base_file_path: " + basePath + "\n",
	out += "data_type: " + DataType[dataType] + "\n",
	
	// second section: data
	out += "---\n# Content of the elf file\n"
		
	for (const [ dataDivision, items ] of Object.entries(binary.data)) {
		out += dataDivision + ":\n"
		
		let isFirst = true
		for (const obj of items) {
			if (isFirst) {
				isFirst = false
			} else {
				out += '  \n'
			}
			out += '  - ' + objToYaml(obj, 2)
		}
	}
	
	// third section: symbol table	
	const baseSymbols = baseBinary.symbolTable
	const symbols = binary.symbolTable
	
	// collect data
	/**
	 * Symbol without its methods
	 */
	interface PlainSymbol {
		name: string
		isNameMangled: boolean
		info: number
		visibility: number
		sectionHeaderIndex: number
		location: Pointer
		size: number
	}
	
	let modifiedSymbols: ({ index: number } & PlainSymbol)[] = []
	
	for (let i = 0; i < baseSymbols.length; i++) {
		if (!symbols[i].equals(baseSymbols[i])) {
			console.log(symbols[i], baseSymbols[i])
			
			let clone = { index: i, ...symbols[i] }
			modifiedSymbols.push(clone)
		}
	}
	
	let newSymbols: Symbol[] = []
	
	for (let i = baseSymbols.length; i < symbols.length; i++) {
		newSymbols.push(symbols[i])
	}
	
	// print data
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

function objToYaml(obj: any, indentation: number, numbersAsFloats = false): string {
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
		
		if (fieldValue instanceof Vector3) {
			const { x, y, z } = fieldValue
			out += '\n' + "  ".repeat(indentation + 1) + objToYaml({ x, y, z }, indentation + 1, true)
			continue
		}
		
		if (fieldValue instanceof Pointer) {
			out += ' ' + fieldValue.value + '\n'
			continue
		}
		
		if (fieldValue instanceof Array || typeof fieldValue == 'object' && fieldValue !== null) {
			// TODO: implement
			debugger
			throw new Error('TODO', fieldValue)
		}
		
		out += ' '
		
		if (typeof fieldValue == 'string') {
			// strings are hella complex wow
			let requiresQuotedString = fieldValue.includes(': ')
				|| fieldValue.includes(' #')
				|| fieldValue.includes('\t')
				|| fieldValue != fieldValue.trim()
				|| !PLAIN_STRING_NOT_ALLOWED.every(str => !fieldValue.startsWith(str))
			
			if (requiresQuotedString) {
				// in "quotes"
				out += JSON.stringify(fieldValue)
			} else if (fieldValue.includes('\n')) {
				// multiline (|- ...)
				out += "|-\n"
				let lines = fieldValue.split('\n')
				
				for (const line of lines.slice(0, -1)) {
					out += "  ".repeat(indentation + 1) + line + '\n'
				}
				
				out += "  ".repeat(indentation + 1) + lines.at(-1)
			} else {
				// plain
				out += fieldValue
			}
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

function floatToString(x: number): string {
	return x.toLocaleString("en-us", { minimumFractionDigits: 1 })
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
