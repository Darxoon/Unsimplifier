<script lang="ts">
	import { afterUpdate } from "svelte";
	import type { ElfBinary } from "paper-mario-elfs/elfBinary";
	import { DataType } from "paper-mario-elfs/dataType";
	import { FILE_TYPES } from "paper-mario-elfs/fileTypes";
	import { Symbol } from "paper-mario-elfs/types";
	import type { SearchIndex } from "$lib/editor/search/searchIndex";
    import FileToolbar from "./FileToolbar.svelte";
    import BasicObjectArray from "./BasicObjectArray.svelte";
    import type { UuidTagged } from "paper-mario-elfs/valueIdentifier";
    import { incrementName } from "paper-mario-elfs/nameMangling";

	export let binary: ElfBinary
	export let dataType: DataType
	export let overrideObjects: UuidTagged[] | undefined = undefined
	export let tabVisible: boolean
	
	let initialized = tabVisible
	
	let arrayComponent: BasicObjectArray
	
	let addingNewObject = false
	let searchTerm = ""
	let searchResults: SearchIndex
	
	$: objects = overrideObjects ?? binary.data[FILE_TYPES[dataType].dataDivision]
	$: index = createIndex(objects)
	
	$: if (tabVisible) initialized = true
	
	$: highlightedFields = searchResults && getHighlightedFields(searchResults)
	
	
	export function collapseAll() {
		arrayComponent.collapseAll()
	}
	
	export function expandAll() {
		arrayComponent.expandAll()
	}
	
	function createIndex(objects: UuidTagged[]) {
		let index: SearchIndex = []
		
		for (let i = 0; i < objects.length; i++) {
			const obj = objects[i]
			
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] == 'string') {
					index.push({
						index: i,
						field: key,
						value: obj[key],
					})
				}
			}
		}
		
		return index
	}
	
	afterUpdate(() => {
		if (addingNewObject) {
			addingNewObject = false
			arrayComponent.scrollIntoView(objects[objects.length - 1])
		}
	})
	
	function getHighlightedFields(searchResults: SearchIndex) {
		let highlightedFields: WeakMap<UuidTagged, string[]> = new WeakMap()
		
		for (const index of new Set(searchResults.map(result => result.index))) {
			let fields: string[] = []
			
			for (const result of searchResults) {
				if (result.index == index) {
					fields.push(result.field)
				}
			}
			
			highlightedFields.set(objects[index], fields)
		}
		
		return highlightedFields
	}
	
	function addObject() {
		objects.push(createObject(dataType))
		objects = objects
		
		if (overrideObjects)
			overrideObjects = overrideObjects
		
		addingNewObject = true
	}
	
	function createObject(dataType: DataType) {
		let object = FILE_TYPES[dataType].instantiate()
		
		for (const fieldName of Object.keys(object)) {
			let fieldType = FILE_TYPES[dataType].typedef[fieldName]
			console.log(fieldName, fieldType)
			
			if (fieldType != "symbol" && fieldType != "symbolAddr")
				continue
			
			object[fieldName] = createSymbolObject()
		}
		
		// TODO: implement a 'name index' to make this work with sub types that don't have a data division
		let identifyingField = FILE_TYPES[dataType].identifyingField
		object[identifyingField] = "unnamed"
		
		let allObjects = binary.data[FILE_TYPES[dataType].dataDivision]
		
		while (allObjects && allObjects.find(item => item[identifyingField] == object[identifyingField])) {
			object[identifyingField] = incrementName(object[identifyingField])
		}
		
		console.log('created new', object)
		
		return object
	}
	
	function createSymbolObject() {
		let symbolName = "new_symbol_" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
		
		// TODO: make sure these values are correct for future data types
		let symbol = new Symbol()
		symbol.name = symbolName
		symbol.info = 1
		symbol.sectionHeaderIndex = 3
		binary.symbolTable.push(new Symbol)
		
		return {
			symbolName,
			children: [],
		}
	}
	
	function handleCreateContent({ obj, fieldName }: { obj: UuidTagged, fieldName: string }) {
		obj[fieldName] = createSymbolObject()
		objects = objects
	}
	
	function deleteAll() {
		objects.length = 0
		objects = objects
		
		if (overrideObjects)
			overrideObjects = overrideObjects
	}
</script>

{#if initialized}
<div class="editor">
	<FileToolbar on:add={addObject} on:clear={deleteAll} searchIndex={index} bind:searchTerm={searchTerm} bind:searchResults={searchResults} />
	
	<div class="listing" style="--content-height: {objects?.length * 60 + 80}px;">
		{#if searchResults}
			<div class="resultlabel">Showing {searchResults.length} results
				(out of {objects.length} objects):</div>
		{/if}
		
		{#if objects.length == 0}
			<p>No content here yet. Create one with 'Add new object'</p>
		{/if}
		
		<BasicObjectArray on:open on:createContent={e => handleCreateContent(e.detail)}
			bind:this={arrayComponent} bind:objects={objects} binary={binary} dataType={dataType}
			highlightedFields={highlightedFields} indices={searchResults && new Set(searchResults.map(result => result.index))} />
	</div>
	
	<!-- TODO: use a dedicated special elf editor instead -->
	<!-- {#if dataType === DataType.Maplink}
		<ObjectEditor title="Maplink Header" bind:obj={binary.data.main[0]} 
			dataType={DataType.MaplinkHeader} showButtons={false} binary={binary} />
	{/if} -->
</div>
{/if}

<style lang="scss">
	p {
		color: white;
		text-align: center;
	}
	
	.resultlabel {
		font-size: 17pt;
		color: white;
		max-width: 56rem;
		margin: -0.8rem auto 1.6rem auto;
	}
	
	.listing {
		min-height: var(--content-height);
	}
</style>
