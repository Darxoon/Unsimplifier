<script lang="ts">
	import type { MenuStripEntry } from "$lib/types";
	import { openedMenu } from "$lib/stores";
    import { nonnativeButton } from "$lib/nonnativeButton";
    import logging from "$lib/logging";

	export let name: string
	export let items: MenuStripEntry[] = []
	
	$: shown = ($openedMenu) == name
	
	let li: HTMLLIElement
	
	function updateOpenedMenu() {
		if ($openedMenu != null)
			openedMenu.set(name)
	}
	
	function open(e) {
		let isInvalidKey = e instanceof KeyboardEvent && e.key != " " && e.key != "Enter"
		
		if (isInvalidKey) {
			return
		}
		
		if ($openedMenu == name) {
			li.blur()
			e.preventDefault()
		}
		
		logging.trace("Changing opened menu", $openedMenu, name)
		openedMenu.set($openedMenu == name ? null : name)
	}
	
	function activate(item: MenuStripEntry) {
		logging.trace("Activating item", item.name)
		openedMenu.set(null)
		item.onClick()
	}
</script>

<li role="menuitem" tabindex="0" class:shown={shown} bind:this={li} on:mouseenter={updateOpenedMenu}
	on:mousedown|stopPropagation={open} on:keyup|stopPropagation={open}>
	
	{name}
	
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div on:mousedown|stopPropagation={() => {}} class="menu" role="menubar" tabindex="0">
		<ul>
			{#each items as item}
				<li class="menu_item" role="menuitem" tabindex="0" use:nonnativeButton={() => activate(item)}>{item.name}</li>
			{/each}
		</ul>
	</div>
</li>

<style>
	li {
		position: relative;
		padding: 0 0.9rem 6px 0.9rem;
		
		border-radius: 6px;
		
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}
	
	li:hover, li.shown {
		background: #d9d9d9;
	}
	
	.menu_item:active {
		background: #b3b3b3;
	}
	
	.menu {
		position: absolute;
		
		left: -0.0rem;
		top: 1.8rem;
		
		display: none;
		z-index: 2;
	}
	
	.shown .menu {
		display: block;
	}
	
	.menu ul {
		padding: 0.6rem;
		min-width: 12rem;
		
		border: 1px solid #b5b5b5;
		background: white;
		list-style-type: none;
		
		box-shadow: 0px 5px 7px 0px #0000002e, -1px 5px 12px 5px #0000001a;
	}
</style>
