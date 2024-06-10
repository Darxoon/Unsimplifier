<script lang="ts">
	import type { ElfBinary } from "paper-mario-elfs/elfBinary";
	import { DataType } from "paper-mario-elfs/dataType";
	import { FILE_TYPES } from "paper-mario-elfs/fileTypes";
	import { toReadableString } from "$lib/util";
	import { createEventDispatcher, onDestroy, onMount } from "svelte";
	
	import { dataTypeColors, defaultDataTypeColor, defaultObjectEditorHighlight, objectEditorHighlights } from "./dataTypeColors";
	import CrossObjectLink from "./CrossObjectLink.svelte";
	import InputField from "./InputField.svelte"
	import { hexFields } from "./viewAsHex";
	import ButtonStrip from './ButtonStrip.svelte';
	import FieldIcons from './FieldIcons.svelte';
	import ObjectEditorTailExpander from './ObjectEditorTailExpander.svelte';
	import { showModal } from "$lib/modal/modal";
	import FieldOptionAlert from "$lib/modals/FieldOptionAlert.svelte";
	
	// TODO: try using event maps
	const dispatch = createEventDispatcher()

	export let title: string
	export let obj: object
	export let dataType: DataType | undefined = undefined
	export let showButtons = true
	export let binary: ElfBinary
	
	export let backgroundColor: string = dataTypeColors[dataType] ?? defaultDataTypeColor
	export let labelHighlightColor: string = objectEditorHighlights[dataType] ?? defaultObjectEditorHighlight
	
	export let open = false
	
	export let highlightedFields: string[] = []
	
	$: entries = Object.entries(obj)
	$: objectId = obj[FILE_TYPES[dataType].identifyingField]
	$: dynTitle = title.replaceAll('{dynamic}', FILE_TYPES[dataType].getDynamicDisplayName(obj))
	
	// SetBattle contains both Stage Definitions and Battles
	// to differentiate between the two, Custom Colors are only used for Stage Definitions
	$: usesCustomColors = dataType != DataType.SetBattle || dynTitle.startsWith('Stage Definition')
	$: actualBackgroundColor = usesCustomColors ? backgroundColor : defaultDataTypeColor
	$: actualLabelHighlightColor = usesCustomColors ? labelHighlightColor : defaultObjectEditorHighlight
	
	let initialized = false
	
	let mouseY = 0
	let mouseInside = false
	let entryLabelElements: HTMLDivElement[] = []
	
	let fieldErrors: {[fieldName: string]: any} = {}
	
	export function scrollIntoView() {
		editor.scrollIntoView({
			behavior: 'smooth',
		})
	}
	
	function updateEntries(e) {
		const { key, value } = e.detail
		obj[key] = value
	}
	
	onMount(() => {
		// @ts-ignore
		feather.replace()
		
		window.addEventListener('scroll', viewportCheck)
		window.addEventListener('mousemove', onMouseMove)
		
		viewportCheck()
	})
	
	onDestroy(() => {
		window.removeEventListener('scroll', viewportCheck)
		window.removeEventListener('mousemove', onMouseMove)
	})
	
	function viewportCheck() {
		if (!hasEnteredViewport && editor?.getBoundingClientRect().y < window.innerHeight) {
			hasEnteredViewport = true
			dispatch('appear')
		}
	}
	
	function onMouseMove(e: MouseEvent) {
		mouseY = e.clientY
	}
	
	function areIconsShown(i: number, mouseY: number) {
		return mouseInside
			&& mouseY >= entryLabelElements[i]?.getBoundingClientRect()?.y
			&& (mouseY < (entryLabelElements[i + 1] ? entryLabelElements[i + 1] : Array.from(entryLabelElements).slice(i + 2).find(x => x))
				?.getBoundingClientRect()?.y || entryLabelElements.length - 1 <= i);
	}
	
	function showFieldMenu(dataType: DataType, fieldName: string) {
		let objects = binary.data[FILE_TYPES[dataType].objectType]
		
		// find sub array if necessary
		let containsSubArrays = objects.find(v => 'children' in v || v instanceof Array) != undefined
		
		if (containsSubArrays)
			objects = objects.find(arr => (arr instanceof Array ? arr : arr.children).includes(obj))
		
		if ('children' in objects)
			objects = objects.children as any[]
		
		
		// TODO: In future, make this handled by
		// BasicObjectArray by using a dispatch to prevent this ^
		
		showModal(FieldOptionAlert, {
			title: `Field '${toReadableString(fieldName)}'`,
			fieldName,
			
			dataType,
			binary,
			objects,
		})
	}
	
	async function createContent(obj: any, fieldName: string) {
		let resolve, reject
		const promise = new Promise((innerResolve, innerReject) => {
			resolve = innerResolve
			reject = innerReject
		})
		
		dispatch('createContent', { obj, fieldName, resolve, reject })
		
		try {
			await promise
		} catch (e) {
			fieldErrors[fieldName] = e
			console.error(e)
		}
	}
	
	function onTitleClick() {
		open = !open;
		initialized = true;
	}
	
	function keyPress(e: KeyboardEvent) {
		if (e.key == "Enter" || e.key == " ") {
			e.preventDefault()
			e.stopPropagation()
			
			onTitleClick()
		}
	}
	
	let editor: HTMLDivElement
	
	let hasEnteredViewport = false
</script>

<svelte:options accessors={true} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="card editor" style="--bg-card: {actualBackgroundColor}; --bg-label-highlight: {actualLabelHighlightColor}" bind:this={editor}
		on:mouseenter={e => mouseInside = true} on:mouseleave={e => mouseInside = false}>
	
	<div class="title" class:rotated={open}
		on:click={onTitleClick} on:keypress={keyPress} tabindex="0" role="button">
		
		<i data-feather="chevron-down" class="icon-arrow"></i><span class="titleLabel">{dynTitle}</span>
		
		{#if showButtons}
			<ButtonStrip on:duplicate on:delete></ButtonStrip>
		{/if}
	</div>
	
	{#if initialized || open}
		<div class="content" class:invisible={!open}>
			{#each entries as [field, value], i}
			{#if !(FILE_TYPES[dataType].metadata[field]?.hidden ?? false)}
				
				<!-- Field Label -->
				<div class="key" class:highlighted={highlightedFields?.includes(field)} 
				class:bold={!field.startsWith('field_')} bind:this={entryLabelElements[i]} 
				class:italic={field.startsWith('field_') && FILE_TYPES[dataType].metadata[field]?.description}>
					<!-- \xa0 Non breaking space -->
					{toReadableString(field).replaceAll(' ', '\xa0')}
					
					<FieldIcons fieldName={field} dataType={dataType} shown={areIconsShown(i, mouseY)} 
						on:showMenu={e => showFieldMenu(dataType, field)} />
				</div>
				
				<!-- Value Input -->
				<div class="value">
					{#if FILE_TYPES[dataType].typedef[field] === "symbol"}
						<CrossObjectLink binary={binary} targetObjects={value} sourceDataType={dataType} objectId={objectId}
							targetDataType={FILE_TYPES[dataType].childTypes[field]}
							tabTitle={FILE_TYPES[dataType].metadata[field]?.tabName} error={fieldErrors[field]}
							on:open on:create={() => createContent(obj, field)} />
					{:else}
						<InputField on:valueChanged={updateEntries} noSpaces={FILE_TYPES[dataType].metadata[field]?.noSpaces ?? false}
							fieldType={FILE_TYPES[dataType].typedef[field]} key={field} value={value}
							viewAsHex={$hexFields[dataType] && $hexFields[dataType][field]} />
					{/if}
				</div>
				
			{/if}
			{/each}
		</div>
		
		{#if FILE_TYPES[dataType].childField && typeof obj[FILE_TYPES[dataType].childField] === "object" && obj[FILE_TYPES[dataType].childField]}
			<ObjectEditorTailExpander dataType={dataType} visible={open} child={obj[FILE_TYPES[dataType].childField]} binary={binary} />
		{:else if FILE_TYPES[dataType].childField}
			<p class="child-content-null">Content could not be created because there are no other valid objects present</p>
		{/if}
	{/if}	
</div>

<style lang="scss">
	:root {
		--bg-label-highlight: #eaeaea;
	}
	
	.editor {
		margin: 1rem auto;
		max-width: 56rem;
	}
	
	.title {
		position: relative;
		user-select: none;
		height: 20px;
		
		.icon-arrow {
			float: left;
			
			margin-top: -1px;
			margin-right: 1px;
		}
		
		&.rotated .icon-arrow {
			transform: rotate(180deg);
		}
		
		.titleLabel {
			transform: translateY(-1px);
			display: inline-block;
		}
	}
	
	.content {
		margin-top: 8px;
		display: grid;
		grid-template-columns: minmax(min-content, 24%) auto;
		
		.key {
			position: relative;
			height: min-content;
			padding: 3px 3rem 3px 2px;
			margin-right: 2px;
			
			&.bold { font-weight: bold }
			&.italic { font-style: italic }
			&.highlighted { background: #ffe687; border-radius: 3px }
		}
		
		.value {
			margin-bottom: 6px;
		}
		
		:nth-child(4n-1) {
			background: var(--bg-label-highlight);
			border-radius: 3px;
		}
	}
	
	.child-content-null {
		margin-top: 0.3em;
		margin-bottom: 0;
		
		font-size: 20px;
	}
	
	.invisible {
		display: none;
	}
</style>
