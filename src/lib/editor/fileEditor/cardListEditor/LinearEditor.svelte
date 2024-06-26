<script lang="ts">
	import { afterUpdate } from "svelte";
	import type { ElfBinary } from "paper-mario-elfs/elfBinary";
	import type { DataType } from "paper-mario-elfs/dataType";
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
	let searchResultObjects: UuidTagged[]
	
	let searchResultObjectBuffer: UuidTagged[]
	
	$: objects = overrideObjects ?? binary.data[FILE_TYPES[dataType].dataDivision]
	$: index = createIndex(objects)
	
	$: if (tabVisible) initialized = true
	
	$: highlightedFields = searchResults && new WeakMap(
		searchResultObjects.map(obj => [
			obj, 
			searchResults.filter(result => result.obj == obj).map(result => result.field),
		]))
	
	$: if (searchResults) {
		searchResultObjects = []
		searchResultObjectBuffer = [...new Set(searchResults.map(result => result.obj))]
	} else {
		searchResultObjects = null
	}
	
	export function collapseAll() {
		arrayComponent.collapseAll()
	}
	
	export function expandAll() {
		arrayComponent.expandAll()
	}
	
	function createIndex(objects: UuidTagged[]) {
		let index: SearchIndex = []
		
		for (const obj of objects) {
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] == 'string') {
					index.push({
						obj,
						field: key,
						value: obj[key],
					})
				}
			}
		}
		
		return index
	}
	
	afterUpdate(() => {
		// @ts-ignore
		feather.replace()
		
		if (addingNewObject) {
			addingNewObject = false
			arrayComponent.scrollIntoView(objects[objects.length - 1])
		}
		
		if (searchResultObjectBuffer) {
			searchResultObjects = searchResultObjectBuffer
			searchResultObjectBuffer = null
		}
	})
	
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
	<!-- TODO: if objects contain symbol references, it's important that there is always one object left -->
	<!-- Ask for confirmation in this case when pressing Delete All -->
	<!-- TODO: do the same on delete button in object editors -->
	<FileToolbar on:add={addObject} on:clear={deleteAll} searchIndex={index} bind:searchTerm={searchTerm} bind:searchResults={searchResults} />
	
	<div class="listing" style="--content-height: {objects?.length * 60 + 80}px;">
		{#if searchResults}
			<div class="resultlabel">Showing {searchResultObjects.length} results
				(out of {objects.length} objects):</div>
		{/if}
		
		{#if objects.length == 0}
			<p>No content here yet. Create one with 'Add new object'</p>
		{/if}
		
		<BasicObjectArray on:open on:createContent={e => handleCreateContent(e.detail)}
			bind:this={arrayComponent} binary={binary} dataType={dataType} referenceObjects={objects}
			objects={searchResults ? searchResultObjects : objects} highlightedFields={highlightedFields} />
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
