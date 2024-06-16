<script lang="ts">
	import { DataType } from "paper-mario-elfs/dataType";
	import { FILE_TYPES } from "paper-mario-elfs/fileTypes";
	
	import { createEventDispatcher, onMount } from "svelte";
    import { nonnativeButton } from "$lib/nonnativeButton";
    import { OpenWindowEvent } from "../events";
    import type { ElfBinary } from "paper-mario-elfs/elfBinary";

	const dispatch = createEventDispatcher()
	
	export let targetObjects: any[] | {symbolName: string, children: any[]} | undefined
	export let sourceDataType: DataType
	export let targetDataType: DataType
	export let binary: ElfBinary
	export let objectId: string
	export let tabTitle: string
	export let error: any = undefined
	
	let link: HTMLDivElement
	
	$: label = targetObjects != undefined
		? `Click to open (${length(targetObjects)} item${length(targetObjects) < 2 ? '' : 's'})`
		: error == undefined ? `Click to create new content` : 'Could not create content (Error)'
		
	
	onMount(() => {
		if (tabTitle == undefined) {
			console.error(`Missing tabTitle metadata on link to ${DataType[targetDataType]} from ${DataType[sourceDataType]}`)
		}
	})
	
	function click() {
		if (targetObjects == undefined) {
			dispatch('create')
			
			return
		}
		
		let title = tabTitle.replaceAll('{id}', objectId).replaceAll('{type}', FILE_TYPES[sourceDataType].displayName)
		let objects = targetObjects instanceof Array ? targetObjects : targetObjects.children
		
		console.log('opening', objects)
		
		dispatch("open", new OpenWindowEvent(title, false, {
			type: "cardList",
			binary,
			dataType: targetDataType,
			overrideObjects: objects,
		}))
	}
	
	function length(arrayOrObj) {
		if (typeof arrayOrObj == "string") {
			// this shouldn't happen
			throw new Error("Symbol value can't be a string")
		}
		if (arrayOrObj instanceof Array)
			return arrayOrObj.length
		else if ("children" in arrayOrObj)
			return arrayOrObj.children.length
		else {
			throw new Error(`Argument is not an array, ${arrayOrObj}`)
		}
	}
	
	function focusLink() {
		link.focus({ focusVisible: true })
	}
</script>

<div class="linkWrapper">
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<div class="link"
		bind:this={link} on:mousedown={focusLink}
		use:nonnativeButton={click}><span class="text">{label}</span></div>
</div>

<style lang="scss">
	.linkWrapper {
		position: relative;
		display: flex;
		width: 100%;
	}
	
	.link {
		border: 1px solid #8f8f9d;
		border-radius: 4px;
		padding: 5px 2px 3px 1px;
		margin-left: 2px;

		font-family: var(--ff-monospace);
		font-size: 14px;

		color: #0000EE;
		text-decoration: underline;
		
		cursor: pointer;

		width: 100%;
	}
	
	// webkit alternative to unsupported focusVisible (see function focusLink)
	.link:focus {
		outline: -webkit-focus-ring-color auto 1px;
	}
	
	.text {
		user-select: none;
	}
</style>
