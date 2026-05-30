<script lang="ts">
	import type { ElfBinary } from "paper-mario-elfs/elfBinary";
	import type { DataType } from "paper-mario-elfs/dataType";
	import { FILE_TYPES } from "paper-mario-elfs/fileTypes";
	import { toReadableString } from "$lib/util";
	import { createEventDispatcher, onDestroy, onMount } from "svelte";
	
	import { dataTypeColors, defaultDataTypeColor, defaultObjectEditorHighlight, objectEditorHighlights } from "./dataTypeColors";
	import CrossObjectLink from "./CrossObjectLink.svelte";
	import InputField from "./InputField.svelte"
	import { hexFields } from "./viewAsHex";
	import ButtonStrip from './ButtonStrip.svelte';
	import FieldIcons from './FieldIcons.svelte';
    import { ChevronDownIcon } from "svelte-feather-icons";
    import BasicObjectArray from "../fileEditor/cardListEditor/BasicObjectArray.svelte";
	
	// TODO: try using event maps
	const dispatch = createEventDispatcher()

	export let title: string
	export let obj: object
	export let dataType: DataType | undefined = undefined
	export let showButtons = true
	export let binary: ElfBinary
	export let depth = 0
	
	export let backgroundColor: string = dataTypeColors[dataType] ?? defaultDataTypeColor
	export let labelHighlightColor: string = objectEditorHighlights[dataType] ?? defaultObjectEditorHighlight
	export let noVerticalPadding: boolean = false
	
	export let open = false
	
	export let highlightedFields: string[] = []
	
	$: entries = Object.entries(obj)
	$: objectId = obj[FILE_TYPES[dataType].identifyingField]
	
	// SetBattle contains both Stage Definitions and Battles
	// to differentiate between the two, Custom Colors are only used for Stage Definitions
	$: usesCustomColors = false
	$: actualBackgroundColor = usesCustomColors ? backgroundColor : defaultDataTypeColor
	$: actualLabelHighlightColor = usesCustomColors ? labelHighlightColor : defaultObjectEditorHighlight
	
	let initialized = false
	
	let mouseY = 0
	let mouseInside = false
	let entryLabelElements: HTMLDivElement[] = []
	
	let fieldErrors: {[fieldName: string]: any} = {}
	
	let loadedChildViews: {[fieldName: string]: boolean} = {}
	let openedChildViews: {[fieldName: string]: boolean} = {}
	
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
		document.body.addEventListener('scroll', viewportCheck)
		window.addEventListener('mousemove', onMouseMove)
		
		viewportCheck()
	})
	
	onDestroy(() => {
		document.body.removeEventListener('scroll', viewportCheck)
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
	
	function createContent(obj: any, fieldName: string) {
		dispatch('createContent', { obj, fieldName })
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
<div class="card editor" class:no-vertical-padding={noVerticalPadding} bind:this={editor}
		style="--bg-card: {actualBackgroundColor}; --bg-label-highlight: {actualLabelHighlightColor}"
		on:mouseenter={e => mouseInside = true} on:mouseleave={e => mouseInside = false}>
	
	<div class="title" class:rotated={open}
		on:click={onTitleClick} on:keypress={keyPress} tabindex="0" role="button">
		
		<ChevronDownIcon class="icon-arrow" /><span class="titleLabel">{title}</span>
		
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
						on:showMenu={e => dispatch('showFieldMenu', field)} />
				</div>
				
				<!-- Value Input -->
				<div class="value">
					{#if FILE_TYPES[dataType].typedef[field] === "symbol" || FILE_TYPES[dataType].typedef[field] === "symbolAddr"}
						<CrossObjectLink binary={binary} targetObjects={value} sourceDataType={dataType} objectId={objectId}
							targetDataType={FILE_TYPES[dataType].childTypes[field]}
							tabTitle={FILE_TYPES[dataType].metadata[field]?.tabName} error={fieldErrors[field]}
							on:open on:create={() => createContent(obj, field)} />
						
						{#if value != null}
							<button class="children-expander" class:opened={openedChildViews[field]} on:click={() => {
								loadedChildViews[field] = true
								openedChildViews[field] = !openedChildViews[field]
							}}><ChevronDownIcon class="arrow-icon" /><span>{
								openedChildViews[field] ? "Hide" : "Show"
							}</span></button>
						{/if}
					{:else}
						<InputField on:valueChanged={updateEntries} noSpaces={FILE_TYPES[dataType].metadata[field]?.noSpaces ?? false}
							fieldType={FILE_TYPES[dataType].typedef[field]} key={field} value={value}
							viewAsHex={$hexFields[dataType] && $hexFields[dataType][field]} />
					{/if}
				</div>
				
				<!-- Children -->
				{#if loadedChildViews[field]}
					<div class="children card"
						style="--child-view-bg: var(--child-view-bg-{depth % 4})"
						class:invisible={!openedChildViews[field]}
					>
						<p class="children-title">Contents of '{toReadableString(field)}':</p>
						
						<BasicObjectArray binary={binary} dataType={FILE_TYPES[dataType].childTypes[field]}
							depth={depth + 1} objects={"children" in value ? value.children : value} on:open />
					</div>
				{/if}
				
			{/if}
			{/each}
		</div>
	{/if}	
</div>

<style lang="scss">
	:root {
		--bg-label-highlight: #eaeaea;
		--child-view-bg-0: #afda7b;
		--child-view-bg-1: #83caf4;
		--child-view-bg-2: #f7a3ae;
		--child-view-bg-3: #fdd5bd;
	}
	
	.editor {
		margin: 0 auto 1rem auto;
		max-width: 56rem;
		
		&.no-vertical-padding {
			margin: 0 auto;
		}
	}
	
	.title {
		position: relative;
		user-select: none;
		height: 20px;
		
		:global(.icon-arrow) {
			float: left;
			
			margin-top: -1px;
			margin-right: 1px;
		}
		
		&.rotated :global(.icon-arrow) {
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
			
			&:nth-child(4n-1) {
				background: var(--bg-label-highlight);
				border-radius: 3px;
			}
		}
		
		.value {
			margin-bottom: 6px;
			display: flex;
			
			.children-expander {
				flex-shrink: 0;
				padding: 0 2px;
				border: none;
				background: none;
				font-size: inherit;
				
				&.opened {
					& > :global(.arrow-icon) {
						rotate: 180deg;
					}
				}
				
				& > :global(.arrow-icon) {
					height: 100%;
				}
				
				span {
					vertical-align: center;
					padding-bottom: 5px;
					display: inline-block;
				}
			}
		}
		
		.children {
			grid-column: 1 / -1;
			margin-bottom: 1rem;
			background: var(--child-view-bg);
			
			.children-title {
				margin-top: 0;
				font-size: 14pt;
			}
		}
	}
	
	.invisible {
		display: none;
	}
</style>
