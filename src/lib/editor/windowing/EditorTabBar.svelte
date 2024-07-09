<script lang="ts">
    import { nonnativeButton } from "$lib/nonnativeButton";
    import { clamp, excludeFromArrayPure, insertIntoArrayPure, noop } from "$lib/util";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { type Tab, tabWasAccepted, globalDraggedTab } from "../globalDragging";
    import { browser } from "$app/environment";
    import logging from "$lib/logging";
    import { XIcon } from "svelte-feather-icons";

	export let tabs: Tab[]
	export let activeIndex: number
	export let showBugReporter: boolean
	export let disableSideDocking: boolean
	export let debugIndex: number
	
	const dispatch = createEventDispatcher()
	
	/**
	 * Current state of the tab bar.
	 * 
	 * "default": All tabs are standing still and are not being moved around.
	 * 
	 * "dragging": A tab is being moved around inside the bounds of the tab bar. Could be owned by this window or by another.
	 * 
	 * "draggingDetached": A tab that is owned by this window is being dragged around outside of the bounds of this tab bar.
	 */
	let state: 'default' | 'dragging' | 'draggingDetached' = 'default'
	
	let tabBar: HTMLUListElement
	let tabElements: HTMLLIElement[] = []
	
	let floating: Tab
	let floatingInsertIndex = 0
	let hasFloatingOwnership = false
	
	let mouseX = 0
	let baseMouseX = 0
	
	$: tabsWithoutFloating = state == 'default' ? tabs : excludeFromArrayPure(tabs, floating)
	$: immediateTabs = state == 'default' ? tabs : insertIntoArrayPure(tabsWithoutFloating, floatingInsertIndex, floating)
	$: immediateActiveIndex = state == 'default' ? activeIndex : floatingInsertIndex
	
	$: floatingOverlayX = state == 'dragging' && getOverlayX(mouseX, floatingInsertIndex)
	
	// exported variable
	$: disableSideDocking = hasFloatingOwnership && tabs.length <= 1
	
	$: logging.trace('state', debugIndex, state)
	$: logging.trace('floatingInsertIndex', debugIndex, floatingInsertIndex)
	$: logging.trace('tabs', debugIndex, tabs)
	
	onMount(() => {
		document.addEventListener('mousemove', onMouseMove)
		document.addEventListener('mouseup', onMouseUp)
	})
	
	onDestroy(() => {
		if (browser) {
			document.removeEventListener('mousemove', onMouseMove)
			document.removeEventListener('mouseup', onMouseUp)
		}
	})
	
	function getOverlayX(mouseX: number, floatingInsertIndex: number) {
		if (tabElements[floatingInsertIndex] == undefined) {
			console.error("Attempting to access a nonexistant tab", debugIndex, 'index', floatingInsertIndex, 'in', [...tabElements])
			
			return 0
		}
		
		let floatingWidth = tabElements[floatingInsertIndex].getBoundingClientRect().width
		let tabBarBounds = tabBar?.getBoundingClientRect()
		
		return clamp(mouseX - baseMouseX, tabBarBounds.x, tabBarBounds.x + tabBarBounds.width - floatingWidth)
	}
	
	function afterDetached() {
		console.log('afterDetached happening', debugIndex)
		
		if ($tabWasAccepted) {
			console.log('tab was accepted', debugIndex, $tabWasAccepted)
			tabs = excludeFromArrayPure(tabs, $tabWasAccepted)
			activeIndex = clamp(activeIndex, 0, tabs.length - 1)
			
			$tabWasAccepted = undefined
		} else {
			console.log('tab was not accepted, returning home', debugIndex, $tabWasAccepted)
			$globalDraggedTab = undefined
		}
	}
	
	function onMouseMove(e: MouseEvent) {
		mouseX = e.clientX
	}
	
	function onMouseUp(e: MouseEvent) {
		if (state == 'default')
			return
		
		if (state == 'dragging') {
			logging.trace('ending movement', debugIndex, floatingInsertIndex, floating)
			
			let tabsUnchanged = immediateTabs.length == tabs.length
				&& immediateTabs.every((value, index) => value === tabs[index])
			
			if (!tabsUnchanged) {
				tabs = [...immediateTabs]
			}
			
			activeIndex = clamp(floatingInsertIndex, 0, tabs.length - 1)
			
			if (!hasFloatingOwnership) {
				console.log('setting tabWasAccepted', $tabWasAccepted?.id, floating?.id)
				$tabWasAccepted = floating
				$globalDraggedTab = undefined
			}
			
			floating = undefined
			hasFloatingOwnership = false
			
			state = 'default'
			return
		}
		
		if (state == 'draggingDetached') {
			activeIndex = tabs.indexOf(floating)
			floating = undefined
			
			if (hasFloatingOwnership)
				setTimeout(afterDetached, 0)
			
			hasFloatingOwnership = false
			state = 'default'
			return
		}
	}
	
	function onMouseEnter() {
		if ($globalDraggedTab && !hasFloatingOwnership) {
			logging.trace('entering tab bar with global dragged tab', debugIndex, $globalDraggedTab)
			floating = $globalDraggedTab.tab
			baseMouseX = $globalDraggedTab.baseMouseX
			floatingInsertIndex = tabs.length
			state = 'dragging'
		}
		
		if (state == 'draggingDetached') {
			state = 'dragging'
			
			if (hasFloatingOwnership)
				$globalDraggedTab = undefined
		}
	}
	
	function onMouseLeave() {
		if (state == 'dragging') {
			if (hasFloatingOwnership) {
				$globalDraggedTab = { tab: floating, baseMouseX }
				state = 'draggingDetached'
			} else {
				state = 'default'
			}
		}
	}
	
	function onTabMouseDown(tab: Tab, index: number) {
		if (state != 'default')
			return
		
		activeIndex = index
		baseMouseX = mouseX - tabElements[index].getBoundingClientRect().x
		
		floating = tab
		floatingInsertIndex = index
		hasFloatingOwnership = true
		
		state = 'dragging'
	}
	
	function onTabMouseMove(tab: Tab, index: number) {
		if (state != 'dragging' || tab == floating)
			return
		
		let floatingWidth = tabElements[floatingInsertIndex].getBoundingClientRect().width
		let { width: enteredWidth, x } = tabElements[index].getBoundingClientRect()
		
		let minMouseOffset = Math.max(0, enteredWidth - floatingWidth)
		
		if (index > floatingInsertIndex) {
			// tab that is being entered is to the right of floating tab
			if (mouseX - x > minMouseOffset) {
				floatingInsertIndex += 1
			}
		} else {
			// tab that is being entered is to the left of floating tab
			if (x + enteredWidth - mouseX > minMouseOffset) {
				floatingInsertIndex -= 1
			}
		}
	}
</script>

<ul class="tab_bar" role="menubar" aria-orientation="horizontal" bind:this={tabBar} on:mouseenter={onMouseEnter} on:mouseleave={onMouseLeave}>
	{#if showBugReporter}
		<li style="font-weight: 600;">
			<a href="https://discord.com/invite/pdYpWw8"
				target="_blank" rel="noopener noreferrer">Need help?</a>
		</li>
	{/if}
	{#if tabs.length != 0 && immediateTabs.length == 0}
		<li>&nbsp</li>
	{/if}
	{#if tabs.length === 0}
		<li class="active">
			<span class="tabName">Welcome</span>
			<div class="close_button disabled white-x" role="button" aria-disabled="true">
				<XIcon class="icon-close" />
			</div>
		</li>
	{/if}
	{#each immediateTabs as tab, i}
		<li bind:this={tabElements[i]} use:nonnativeButton={() => { activeIndex = i; dispatch('selectTabContent', i) }}
			class="tab_button" role="menuitem"
			class:active={immediateActiveIndex == i}
			class:colorInvisible={tab == floating}
			on:mousedown={() => onTabMouseDown(tab, i)} 
			on:mousemove={e => onTabMouseMove(tab, i)}>
			
			<span class="tabName">{tab.name}</span>
			<!-- svelte-ignore a11y-no-static-element-interactions -- nonnativeButton gives it a role="button" -->
			<div class="close_button" class:white-x={state == 'default' && immediateActiveIndex == i}
				on:mousedown|stopPropagation={noop} use:nonnativeButton={() => dispatch('closeTab', tab)}>
				<XIcon class="icon-close" />
			</div>
		</li>
	{/each}
	
	<li class="dragged_tab_overlay" class:invisible={state != 'dragging'} style="--left: {floatingOverlayX}">
		{floating?.name}
		
		<!-- decoration only -->
		<div class="close_button dummy_close_button white-x">
			<XIcon class="icon-close" />
		</div>
	</li>
</ul>

<style lang="scss">
	.tab_bar {
		margin: 0;
		padding: 0 6px 0 0;
		
		list-style-type: none;
		display: flex;
	}
	
	li {
		padding: 10px 16px;
		border-radius: 9px 9px 0 0;
					
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		
		white-space: nowrap;
		
		&.active {
			color: white;
			background: var(--editor-bg);
			transition: background 0.08s;
		}
		
		&.dragged_tab_overlay {
			position: absolute;
			left: calc(var(--left) * 1px);
			
			pointer-events: none;
			
			color: white;
			background: var(--editor-bg);
		}
		
		.tabName {
			white-space: initial;
		}
	}
	
	.close_button {
		position: relative;
		
		border-radius: 4px;
		
		top: 2px;
		
		width: 20px;
		height: 20px;
		float: right;
		
		margin-right: -4px;
		margin-left: 2px;
		
		color: black;
		
		&:not(.disabled):hover {
			background: #ffffff4f;
		}
		
		&.disabled {
			color: gray;
		}
		
		&.white-x {
			color: white;
		}
		
		&.white-x.disabled {
			color: #828282;
		}
		
		:global(.icon-close) {
			width: 100%;
			height: 100%;
			stroke-width: 2.5px;
		}
	}
	
	.colorInvisible {
		opacity: 0;
	}
	
	.invisible {
		display: none;
	}
</style>
