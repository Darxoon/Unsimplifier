<script lang="ts">
	import { globalDraggedTab, tabWasAccepted, type Tab, type DockDirection } from "$lib/editor/globalDragging";
	import TernaryPrompt from "$lib/modals/TernaryPrompt.svelte";
	import { showModal } from "$lib/modal/modal";
	import { globalEditorStrip, loadedAutosave } from "$lib/stores";
    import EditorTabBar from "./EditorTabBar.svelte";
	
	import { createEventDispatcher } from "svelte";
    import logging from "$lib/logging";
    import { HTML_FOCUSABLE_ELEMENTS } from "$lib/util";
    import { OpenWindowEvent } from "../events";
    import Page from "../fileEditor/Page.svelte";
    import WelcomeScreen from "../fileEditor/welcomeScreen/WelcomeScreen.svelte";
    import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "svelte-feather-icons";
	
	interface ContentComponent {
		collapseAll(): void
		expandAll(): void
	}
	
	export let tabs: Tab[] = []
	export let selectedIndex: number = 0
	export let isActive = true
	export let showBugReporter: boolean = false
	export let index: number
	
	const dispatch = createEventDispatcher()
	
	let mainElement: HTMLDivElement
	let contentDivElements: HTMLDivElement[] = []
	let contentElements: ContentComponent[] = []
	
	let mouseOutside = false
	let disableSideDocking = false
	
	
	$: dockAreaShown = !mouseOutside && $globalDraggedTab != undefined
	
	export function collapseAll() {
		contentElements[selectedIndex].collapseAll()
	}
	
	export function expandAll() {
		contentElements[selectedIndex].expandAll()
	}
	
	export function addTab(tab: Tab) {
		tabs = [...tabs, tab]
		selectedIndex = tabs.length - 1
	}
	
	export function setActive() {
		isActive = true
	}
	
	export function closeTab(index: number) {
		let arr = [...tabs]
		arr.splice(index, 1)
		tabs = arr
		
		if (tabs.length == 0) {
			isActive = false
			dispatch('removeEditor')
			return
		}
		
		if (selectedIndex >= arr.length) {
			selectedIndex = arr.length - 1
		}
	}
	
	export function selectTabBarElement(index: number) {
		let focusable = getAllFocusableInTabBar()
		let element = focusable.at(index)
		
		if (!(element instanceof HTMLElement)) {
			throw new Error("Cannot focus an element that is not an HTMLElement")
		}
		
		element.focus()
	}
	
	function getAllFocusableInTabBar() {
		return Array.from(mainElement.querySelectorAll('li.tab_button, .close_button:not(.dummy_close_button)'))
	}
	
	function onKeyDown(e: KeyboardEvent) {
		if (e.key == "Tab") {
			// if the selected element before tab is the last tab close button or the first tab button,
			// cancel the event and emit a custom event to select the first tab button of the next window
			// or the last close button of the previous window to trap focus inside header area including menu bar
			let headerFocusable = getAllFocusableInTabBar()
			let activeElementIndex = headerFocusable.indexOf(document.activeElement)
			
			logging.trace('onKeyDown', headerFocusable, activeElementIndex)
			
			if (activeElementIndex == 0 && index != 0 && e.shiftKey) {
				logging.trace('beginning surpassed in window tab bar')
				
				e.preventDefault()
				e.stopPropagation()
				
				dispatch('selectTabBar', -1)
			}
			
			if (activeElementIndex == headerFocusable.length - 1 && !e.shiftKey) {
				logging.trace('end reached of window tab bar')
				
				e.preventDefault()
				e.stopPropagation()
				
				dispatch('selectTabBar', 1)
			}
		}
	}
	
	function onMouseLeave(e: MouseEvent) {
		mouseOutside = true
	}
	
	function onMouseEnter(e: MouseEvent) {
		mouseOutside = false
	}
	
	function onDockMouseUp(direction: DockDirection) {
		$tabWasAccepted = $globalDraggedTab.tab
		
		dispatch('dockTab', {
			direction,
			tab: $globalDraggedTab,
		})
		
		$globalDraggedTab = undefined
	}
	
	function selectTabContent(tabIndex: number) {
		// if I don't delay this, the tab's content might not even have been loaded yet
		// and would get focused very inconsistently
		setTimeout(() => {
			let firstFocusable = contentDivElements[tabIndex]?.querySelector(HTML_FOCUSABLE_ELEMENTS.join(', '))
			
			if (firstFocusable == null)
				return
			
			dispatch('activate')
			
			if (firstFocusable instanceof HTMLElement) {
				firstFocusable.focus()
			} else {
				console.log('firstFocusable', firstFocusable)
				throw new Error("Cannot focus a not-HTML element")
			}
		})
	}
	
	function handleOpenWindowEvent(e: unknown, tab: Tab = null) {
		if (!(e instanceof OpenWindowEvent))
			throw new TypeError("Expected an OpenWindowEvent as event detail for open event, not " + e)
		
		e.parentTab = tab
		dispatch('open', e)
	}
	
	async function closeTabPrompt(tab: Tab) {
		let tabChildren: Tab[] = []
		
		for (const childId of tab.children) {
			let child = $globalEditorStrip.getTab(childId)
			
			if (child)
				tabChildren.push(child)
		}
		
		if (tabChildren.length > 0) {
			let result = await showModal(TernaryPrompt, {
				title: "Close all child tabs?",
				content: `
Closing this tab will render all of its child tabs useless.
Do you want to close those too?`,
			})
			
			if (result == null)
				return
			
			if (result == true) {
				for (const tab of tabChildren) {
					$globalEditorStrip.closeTab(tab, true)
				}
			}
		}
		
		let tabIndex = tabs.indexOf(tab)
		
		if (tabIndex == -1)
			throw new Error("Tab to be removed is not in the editor window.")
		
		closeTab(tabIndex)
	}
</script>

<svelte:options accessors={true} />

<!-- TODO: revisit this svelte-ignore -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="main" bind:this={mainElement} class:inactive={!isActive} on:mouseleave={onMouseLeave} on:mouseenter={onMouseEnter} on:keydown={onKeyDown}>
	
	<EditorTabBar bind:tabs={tabs} bind:activeIndex={selectedIndex} bind:disableSideDocking={disableSideDocking}
		on:closeTab={e => closeTabPrompt(e.detail)} on:selectTabContent={e => selectTabContent(e.detail)}
		showBugReporter={showBugReporter} debugIndex={index} />
	
	<div class="content">
		{#if !$loadedAutosave && tabs.length == 0}
			<p class="loadinglabel">Loading...</p>
		{/if}
		
		{#each tabs as tab, i (tab.id)}
			<div bind:this={contentDivElements[i]} class:invisible={selectedIndex != i}>
				<Page bind:this={contentElements[i]} bind:content={tab.content} tabVisible={selectedIndex == i}
					fileName={tab.name} on:open={e => handleOpenWindowEvent(e.detail, tab)}/>
			</div>
		{/each}
		
		{#if tabs.length == 0}
			<div>
				<WelcomeScreen on:open={e => handleOpenWindowEvent(e.detail)} />
			</div>
		{/if}
		
		<div class="card dockArea dockLeft" on:mouseup={() => onDockMouseUp('left')}
			class:hidden={!dockAreaShown || disableSideDocking}>
			
			<ChevronLeftIcon class="icon-dock" />
		</div>
		
		<div class="card dockArea dockRight" on:mouseup={() => onDockMouseUp('right')}
			class:hidden={!dockAreaShown || disableSideDocking}>
			
			<ChevronRightIcon class="icon-dock" />
		</div>
		
		<div class="card dockArea dockUp" on:mouseup={() => onDockMouseUp('origin')}
			class:hidden={!dockAreaShown || tabs.includes($globalDraggedTab.tab)}>
			
			<ChevronUpIcon class="icon-dock" />
		</div>
	</div>
	
</div>

<style lang="scss">
	:root {
		--selected-tab-height: 6;
		--editor-bg: #3a4d7d; // alternate color: #4b709b
		--inactive-editor-bg: #2b3141;
	}
	
	.main {
		width: 100%;
		height: 100%;
		
		display: flex;
		flex-direction: column;
		
		&.inactive {
			--editor-bg: var(--inactive-editor-bg);
		}
	}
	
	.content {
		position: relative;
		padding: 0 1rem;
		background: var(--editor-bg);
		transition: background 0.08s;
		flex: 1;
		
		.loadinglabel {
			text-align: center;
			font-size: 16pt;
			color: white;
		}
		
		.dockArea {
			--translate-x: 0;
			
			background: #61697c;
			color: white;
			cursor: pointer;
			
			position: absolute;
			top: calc(14vh + 5rem);
			
			width: 48px;
			height: 48px;
			
			transition: transform 0.3s;
			transform: translateX(var(--translate-x));
			
			&:hover {
				transform: translateX(var(--translate-x)) scale(1.4);
			}
			
			&.hidden {
				transform: translateX(var(--translate-x)) scale(0);
				pointer-events: none;
			}
			
			:global(.icon-dock) {
				width: 100%;
				height: 100%;
			}
		}
		
		.dockLeft {
			left: 4rem;
		}
		
		.dockRight {
			right: 4rem;
		}
		
		.dockUp {
			left: 50%;
			top: 0.7rem;
			
			--translate-x: -50%;
		}
	}
	
	.invisible {
		display: none;
	}
</style>
