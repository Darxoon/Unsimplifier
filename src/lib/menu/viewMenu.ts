import type EditorStrip from "$lib/editor/EditorStrip.svelte"
import { DataTypeExtension, dataTypeExtensions } from "$lib/editor/fileEditor/dataTypeExtensions"
import { showModal } from "$lib/modal/modal"
import TextAlert from "$lib/modal/TextAlert.svelte"
import DescriptionViewer from "$lib/modals/DescriptionViewer.svelte"
import NoteViewer from "$lib/modals/NoteViewer.svelte"
import { globalEditorStrip } from "$lib/stores"
import type { MenuCategory } from "$lib/types"
import type { DataType } from "paper-mario-elfs/dataType"
import { FILE_TYPES, Property, type PropertyType } from "paper-mario-elfs/fileTypes"

let editorStrip: EditorStrip
globalEditorStrip.subscribe(value => editorStrip = value)

export function getViewMenu(): MenuCategory {
	return {
		title: "View",
		items: [
			{
				name: "Collapse all",
				onClick: () => editorStrip.collapseAll(),
			},
			{
				name: "Expand all",
				onClick: () => editorStrip.expandAll(),
			},
			{
				name: "View all User Notes...",
				onClick: () => {
					showModal(NoteViewer, {})
				}
			},
			{
				name: "View all Descriptions...",
				onClick: () => {
					let tab = editorStrip.activeTab()
					
					if (tab == null) {
						showModal(TextAlert, {
							title: "All Field Descriptions",
							content: `This menu requires an active file to be open.  
Please open one before trying again.`
						})
					} else if (tab.content.type === "cardList") {
						const { dataType } = tab.content
						viewAllDescriptions(dataType)
					} else {
						// TODO: ideally, this menu option should just be grayed out in the first place
						throw new Error("Cannot view descriptions on non-card list page")
					}
				}
			},
		],
	}
}

type Metadata = {[fieldName: string]: Property<PropertyType>}

function viewAllDescriptions(dataType: DataType) {
	let allMetadata: Map<DataType, Metadata> = new Map()
	
	// TODO: get better name for data types without entry point data type,
	// as literally, ones with can also be complex (e.g. BtlSet)
	let isComplex = dataTypeExtensions(DataTypeExtension.HasComplexEditor, dataType)
	
	if (!isComplex) {
		addMetadataRecursive(dataType, allMetadata)
	} else {
		let childTypes = dataTypeExtensions(DataTypeExtension.ComplexEditorCategory, dataType)
		
		for (const [name, { dataType }] of Object.entries(childTypes)) {
			addMetadataRecursive(dataType, allMetadata)
		}
	}
	
	// if (dataType == DataType.Maplink) {
	// 	addMetadataRecursive(DataType.MaplinkHeader, allMetadata)
	// }
	
	if (allMetadata.size >= 1) {
		showModal(DescriptionViewer, { allMetadata })
	} else {
		showModal(TextAlert, {
			title: "No Descriptions",
			content: "This file format contains no field descriptions.",
		})
	}
}

function addMetadataRecursive(dataType: DataType, allMetadata: Map<DataType, Metadata>) {
	if (allMetadata.has(dataType))
		return
	
	allMetadata.set(dataType, FILE_TYPES[dataType].metadata)
	
	// recursively add all child types too
	if (FILE_TYPES[dataType].childTypes) {
		let childTypes = Object.values(FILE_TYPES[dataType].childTypes)
		
		if (childTypes.length > 0) {
			for (const childType of childTypes) {
				addMetadataRecursive(childType, allMetadata)
			}
		}
	}
}
