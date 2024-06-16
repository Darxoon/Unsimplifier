<script lang="ts">
	import { afterUpdate, onMount } from "svelte";

	import EditorWindow from "./windowing/EditorWindow.svelte";
	import { globalDraggedTab, tabWasAccepted, type Tab } from "./globalDragging";
	import type { SaveFile } from "$lib/save/autosave";
    import { excludeFromArrayPure, insertIntoArrayPure, replaceInArrayPure } from "$lib/util";
    import logging from "$lib/logging";
    import { OpenWindowEvent } from "./events";
    import CardListEditor from "./fileEditor/CardListEditor.svelte";
    import serializeElfBinary from "paper-mario-elfs/serializer";

	let tabs: Tab[][] = [[]]
	let selectedTabs = [0]
	let activeEditor: number =  0
	
	let editorWindows: EditorWindow[] = []
	
	let isWide = false
	
	$: logging.trace('~~ globalDraggedTab', $globalDraggedTab)
	$: logging.trace('~~ tabWasAccepted', $tabWasAccepted)
	
	onMount(() => {
		let mediaQuery = window.matchMedia("(min-width: 1000px)")
		mediaQuery.addEventListener('change', e => {
			isWide = e.matches
		})
		
		isWide = mediaQuery.matches
	})
	
	let tabToAdd: Tab
	let tabToAddEditorIndex = 0
	
	afterUpdate(() => {
		if (tabToAdd) {
			editorWindows[tabToAddEditorIndex].addTab(tabToAdd)
			activeEditor = tabToAddEditorIndex
			tabToAdd = null
		}
		
		// close all windows with no tabs, except window #0
		if (tabs.length > 1)
			for (let i = tabs.length - 1; i >= 0; i--) {
				if (tabs[i].length == 0)
					tabs = excludeFromArrayPure(tabs, tabs[i])
			}
		
		if (tabs.length == 0)
			tabs = [[]]
	})
	
	export function load(newTabs: Tab[][]) {
		tabs = newTabs
	}
	
	export function collapseAll() {
		editorWindows[activeEditor].collapseAll()
	}

	export function expandAll() {
		editorWindows[activeEditor].expandAll()
	}
	
	export function reset() {
		tabs = [[]]
		selectedTabs = [0]
	}
	
	export function appendTab(tab: Tab) {
		selectedTabs[0] = tabs[0].length
		
		tabs[0] = [
			...tabs[0],
			tab
		]
	}
	
	export function activeTab(): Tab {
		return tabs[activeEditor][selectedTabs[activeEditor]]
	}
	
	// used for temporary saves
	export function toSaveData(): SaveFile[][] {
		return tabs.map(currentTabs => windowToSaveFiles(currentTabs))
	}
	
	function windowToSaveFiles(windowTabs: Tab[]): SaveFile[] {
		let saveFiles: SaveFile[] = []
		
		for (const tab of windowTabs) {
			const { name, isCompressed } = tab
			const { content } = tab
			
			if (content.type === "cardList") {
				const { dataType, binary, filePath } = content
				
				saveFiles.push({
					name,
					filePath,
					dataType,
					isCompressed,
					content: serializeElfBinary(dataType, binary)
				})
			} else if (content.type === "docs") {
				// TODO
			} else {
				throw new Error("Unknown page type")
			}
		}
		
		return saveFiles
	}
	
	export function getTab(tabId: Symbol) {
		return tabs.flat().find(tab => tab.id == tabId)
	}
	
	export function closeTab(tab: Tab, recursive: boolean) {
		if (recursive)
			for (const childId of tab.children) {
				let child = getTab(childId)
				
				if (child)
					closeTab(child, true)
			}
		
		for (let i = 0; i < tabs.length; i++) {
			let index = tabs[i].indexOf(tab)
			
			if (index != -1) {
				editorWindows[i].closeTab(index)
				return
			}
		}
	}
	
	function tabIdentity(tab: Tab): Tab {
		return tab
	}
</script>

<div class="editors">
	<!-- TODO: replace tabs with windows and use a proper persistent each key -->
	{#each tabs as tabList, i (tabList)}
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div on:mousedown|capture={e => activeEditor = i}>
			<EditorWindow isActive={activeEditor == i} showBugReporter={i == 0} index={i}
				bind:this={editorWindows[i]} bind:selectedIndex={selectedTabs[i]} bind:tabs={tabList} 
				on:removeEditor={e => {
					if (tabs.length > 1) {
						editorWindows[i].setActive()
						
						let newTabs = [...tabs]
						newTabs.splice(i, 1)
						
						tabs = newTabs
					} else {
						tabs[0] = []
						editorWindows[0]?.setActive()
					}
				}}
				on:dockTab={e => {
					let { tab, direction } = e.detail
					
					if (direction == 'origin') {
						tabs = replaceInArrayPure(tabs, tabs[i], [...tabs[i], tab])
						selectedTabs[i] = tabs[i].length - 1
					} else {
						let index = direction == 'right' ? i + 1 : i
						tabs = insertIntoArrayPure(tabs, index, [tab])
						selectedTabs = insertIntoArrayPure(selectedTabs, index, 0)
					}
				}}
				on:open={e => {
					let { detail } = e
					
					if (detail instanceof OpenWindowEvent) {
						const { title, parentTab, content, isCompressed } = detail
						
						// triple equals because if parentTab is null that means that this probably was intended
						if (parentTab === undefined) {
							console.warn(`OpenWindowEvent with title "${title}" does not have a parentTab set.`)
						}
						
						const childID = Symbol(`Tab ID ${detail.title}`)
						
						tabList[selectedTabs[i]]?.children?.push(childID)
						
						let tab = tabIdentity({
							id: childID,
							parentId: parentTab?.id,
							name: title,
							isCompressed,
							children: [],
							content,
						})
						
						if (isWide) {
							if (tabs.length < 2) {
								tabs = [...tabs, [tab]]
							} else {
								tabToAddEditorIndex = 1
								tabToAdd = tab
							}
						} else {
							editorWindows[0].addTab(tab)
						}
					} else
						throw new Error(`Can't open ${JSON.stringify(e.detail.type)}, unknown type`)
				}}
				on:selectTabBar={e => {
					// detail stores difference of new window and old window: normally either -1 or 1
					let windowIndex = i + e.detail
					
					logging.trace("Selecting tab bar", e.detail, i)
					
					// if detail is 1 for the last window, it will wrap around to the first selectable object on the page.
					// windowIndex == -1 should never happen but for safety, will be accounted for
					// by also selecting the first selectable object on the page
					if (windowIndex < 0 || windowIndex >= editorWindows.length) {
						// @ts-ignore
						document.querySelector('[role="button"]').focus()
						return
					}
					
					editorWindows[windowIndex].selectTabBarElement(e.detail > 0 ? 0 : -1)
				}}
				on:activate={() => {
					activeEditor = i
				}}
			/>
		</div>
	{/each}
</div>

<style lang="scss">
	.editors {
		flex: 1;
		
		display: flex;
		flex-direction: row;
		
		div {
			flex: 1;
		}
	}
</style>
