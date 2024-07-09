<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import SearchBar from "../../search/SearchBar.svelte";
    import type { SearchIndex } from "../../search/searchIndex";
    import { nonnativeButton } from "$lib/nonnativeButton";
    import { PlusIcon, XIcon } from "svelte-feather-icons";
	
	export let searchIndex: SearchIndex
	export let searchTerm: string = ""
	export let searchResults: SearchIndex = undefined
	
	const dispatch = createEventDispatcher()
</script>

<div class="toolbar">
	<div class="card btn" use:nonnativeButton={() => dispatch('add')}>
		<div class="icon"><PlusIcon /></div>
		<span>Add new Object</span>
	</div>
	<div class="card btn" use:nonnativeButton={() => dispatch('clear')}>
		<div class="icon"><XIcon /></div>
		Delete all Objects
	</div>
	<SearchBar index={searchIndex} bind:searchTerm={searchTerm} bind:results={searchResults} />
</div>

<style>
	.toolbar {
		margin: 1rem auto 2rem auto;
		max-width: 54rem;
		
		display: flex;
		user-select: none;
	}		
		
	.toolbar div {
		margin-right: 0.5rem;
	}
	
	.toolbar div:last-child {
		margin-right: 0;
	}
	
	.btn {
		padding-bottom: 9px;
	}
	
	.btn:hover {
		background: #d2d2d2;
	}
	
	.btn:active, .btn:focus {
		background: #808080;
	}
	
	.btn .icon {
		float: left;
		height: 24px;
		width: 24px;
		margin: -1px 0 0 -5px;
	}
	
	.btn span {
		margin-top: -1px;
	}
</style>