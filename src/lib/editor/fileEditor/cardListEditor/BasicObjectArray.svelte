<script lang="ts">
    import ObjectEditor from "$lib/editor/objectEditor/ObjectEditor.svelte";
    import type { ElfBinary } from "paper-mario-elfs/elfBinary";
	import { DataType } from "paper-mario-elfs/dataType";
    import { FILE_TYPES } from "paper-mario-elfs/fileTypes";
    import { demangle } from "paper-mario-elfs/nameMangling";
    import { duplicateObjectInBinary, duplicateSymbolInBinary } from "paper-mario-elfs/util";
    import { VALUE_UUID, type UuidTagged, DATA_TYPE } from "paper-mario-elfs/valueIdentifier";
    import Debouncer from "./Debouncer.svelte";
    import { onMount } from "svelte";
    import { PUBLIC_DEBUG } from "$env/static/public";

	export let binary: ElfBinary
	export let objects: UuidTagged[]
	export let referenceObjects: UuidTagged[]
	export let dataType: DataType
	export let highlightedFields: WeakMap<object, string[]> = undefined
	
	let objectEditors: ObjectEditor[] = []
	let areEditorsOpen: boolean[] = []
	let countShown = 60
	
	let debouncer: Debouncer
	
	$: objectSlice = objects.slice(0, countShown)
	
	$: if (objects && debouncer) debouncer.reset()
	
	onMount(() => {
		let isDebug = !!parseInt(PUBLIC_DEBUG)
		
		if (isDebug && !objects.every(x => x[VALUE_UUID] != undefined)) {
			debugger
			throw new Error("Not all objects have a UUID")
		}
		
		// TODO: replace with opt-in entry-specific data type handling
		if (isDebug && !objects.every(value => value[DATA_TYPE] == dataType)) {
			debugger
			throw new Error("Objects of inconsistent data types passed to BasicObjectArray of data type " + DataType[dataType])
		}
	})
	
	
	export function scrollIntoView(object?: UuidTagged) {
		let index = object ? objects.indexOf(object) : objects.length - 1
		
		if (index <= countShown) {
			objectEditors[index].scrollIntoView()
		} else {
			window.scrollTo({
				behavior: "smooth",
				left: 0,
				top: document.body.scrollHeight,
			})
		}
	}
	
	export function collapseAll() {
		areEditorsOpen.fill(false)
		areEditorsOpen = areEditorsOpen
	}
	
	export function expandAll() {
		areEditorsOpen.fill(true)
		areEditorsOpen = areEditorsOpen
	}
	
	function duplicateObject(obj: UuidTagged) {
		duplicateObjectInBinary(binary, dataType, objects, obj)
		objects = objects
	}
	
	function deleteObject(index: number) {
		objects.splice(index, 1)
		objects = objects
	}
	
	// TODO: move this up to ElfEditor
	function createContent({ obj, fieldName, resolve, reject }: { obj: UuidTagged, fieldName: string, resolve: Function, reject: Function }) {
		// find object with symbol
		let cloneSource = objects.find(v => v[fieldName] != undefined)
		
		if (cloneSource == undefined) {
			return reject(new Error("Could not create content, there is other object with content to orientate by"))
		}
		
		let sourceSymbol = binary.findSymbol(cloneSource[fieldName].symbolName)
		let duplicateSymbol = duplicateSymbolInBinary(binary, sourceSymbol)
		
		obj[fieldName] = {
			symbolName: duplicateSymbol.name,
			children: [],
		}
		
		objects = objects
		
		resolve()
	}
	
	function titleOf(obj: any) {
		let { displayName, identifyingField } = FILE_TYPES[dataType]
		let index = referenceObjects.indexOf(obj)
		return `${displayName} ${index}: ${obj[identifyingField]}`
	}
	
	function appear(index: number) {
		if (index >= countShown - 20) {
			countShown += 40
		}
	}
</script>

<Debouncer bind:this={debouncer} requiredDelaySeconds={2} autoStart={true} on:finished={() => countShown += 80} />

{#each objectSlice as obj, i (obj[VALUE_UUID])}
	<ObjectEditor bind:this={objectEditors[i]} bind:obj={obj} bind:open={areEditorsOpen[i]}
		on:open on:duplicate={() => duplicateObject(obj)} on:delete={() => deleteObject(i)}
		on:appear={() => appear(i)} on:createContent={e => createContent(e.detail)}
		binary={binary} dataType={dataType} title={titleOf(obj)} highlightedFields={highlightedFields?.get(obj)} />
{/each}
