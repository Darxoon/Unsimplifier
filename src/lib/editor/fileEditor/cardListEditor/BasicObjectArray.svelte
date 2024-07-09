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
    import { toReadableString } from "$lib/util";
    import { showModal } from "$lib/modal/modal";
    import FieldOptionAlert from "$lib/modals/FieldOptionAlert.svelte";
	
	const INITIAL_COUNT_SHOWN = 60
	
	export let binary: ElfBinary
	export let objects: UuidTagged[]
	export let dataType: DataType
	export let indices: Set<number> = undefined
	export let highlightedFields: WeakMap<object, string[]> = undefined
	
	let objectEditors: ObjectEditor[] = []
	let areEditorsOpen: boolean[] = []
	let countShown = INITIAL_COUNT_SHOWN
	
	let debouncer: Debouncer
	
	$: objectSlice = indices
		? [...indices].slice(0, countShown).map(i => objects[i])
		: objects.slice(0, countShown)
	
	$: if (objects && debouncer) debouncer.reset()
	
	$: if (indices) countShown = INITIAL_COUNT_SHOWN
	
	onMount(() => {
		let isDebug = !!parseInt(PUBLIC_DEBUG)
		
		if (isDebug && !objects.every(x => x[VALUE_UUID] != undefined)) {
			debugger
			throw new Error("Not all objects have a UUID")
		}
		
		if (isDebug && !objects.every(value => value[DATA_TYPE] == dataType)) {
			debugger
			let irregular = objects.find(item => item[DATA_TYPE] != dataType)
			throw new Error("Objects of inconsistent data types passed to BasicObjectArray of data type " + DataType[dataType]
				+ `, found ${DataType[irregular[DATA_TYPE]]} at index ${objects.indexOf(irregular)}`)
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
	
	function showFieldMenu(fieldName: string) {
		showModal(FieldOptionAlert, {
			title: `Field '${toReadableString(fieldName)}'`,
			fieldName,
			
			dataType,
			binary,
			objects,
		})
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
	
	function titleOf(obj: any) {
		let { displayName, identifyingField } = FILE_TYPES[dataType]
		let index = objects.indexOf(obj)
		return `${displayName} ${index}: ${obj[identifyingField]}`
	}
	
	function appear(index: number) {
		if (index >= countShown - 20) {
			countShown += 40
		}
	}
</script>

<Debouncer bind:this={debouncer} requiredDelaySeconds={1} autoStart={true} on:finished={() => countShown += 80} />

{#each objectSlice as obj, i (obj[VALUE_UUID])}
	<ObjectEditor bind:this={objectEditors[i]} bind:obj={obj} bind:open={areEditorsOpen[i]}
		on:open on:duplicate={() => duplicateObject(obj)} on:delete={() => deleteObject(i)}
		on:appear={() => appear(i)} on:showFieldMenu={e => showFieldMenu(e.detail)} on:createContent
		binary={binary} dataType={dataType} title={titleOf(obj)} highlightedFields={highlightedFields?.get(obj)} />
{/each}
