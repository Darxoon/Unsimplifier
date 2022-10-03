import type EditorStrip from "$lib/editor/EditorStrip.svelte"
import { showModal } from "$lib/modal/modal"
import TextAlert from "$lib/modal/TextAlert.svelte"
import DataTypePrompt from "$lib/modals/DataTypePrompt.svelte"
import { globalEditorStrip, loadedAutosave } from "$lib/stores"
import { compress, decompress, downloadBlob, loadFile, Tab } from "$lib/util"
import type { ElfBinary } from "paper-mario-elfs/elfBinary"
import parseElfBinary, { EmptyFileError } from "paper-mario-elfs/parser"
import serializeElfBinary from "paper-mario-elfs/serializer"

let editorStrip: EditorStrip
globalEditorStrip.subscribe(value => editorStrip = value)

export function getFileMenu() {
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
		],
	}
}

function openFileSelector() {
	console.log("opening file")

	const fileSelector = document.createElement('input')
	fileSelector.setAttribute('type', 'file')
	fileSelector.click()
	
	fileSelector.addEventListener('change', async (e: any) => {
		const file: File = e.target.files[0]
		
		const contentPromise = loadFile(file)
		
		const {dataType, isCompressed} = await showModal(DataTypePrompt, {
			fileName: file.name,
		})

		if (!dataType) {
			return
		}
		
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

		editorStrip.appendTab(Tab(file.name, binary, dataType, isCompressed))
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

	const { name, isCompressed, properties: { dataType, binary } } = tab
	
	let serialized = serializeElfBinary(dataType, binary)
	let output = isCompressed ? await compress(serialized) : serialized
	
	downloadBlob(output, name)
}