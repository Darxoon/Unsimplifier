<script lang="ts">
    import fuzzysort from "fuzzysort"
    import type { IndexValue, SearchIndex } from "./searchIndex";
    import { SearchIcon } from "svelte-feather-icons";
    
    export let index: SearchIndex
    export let searchTerm: string = ""
    
    export let results: SearchIndex = undefined
    
    $: results = searchTerm ? sort(searchTerm, index) : undefined
    
    function sort(searchTerm, index) {
        const results = fuzzysort.go<IndexValue>(searchTerm, index, {key: 'value'})
        return results.map(result => result.obj)
    }
    
	let searchInput: HTMLInputElement = undefined
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="card search" on:click={() => searchInput.focus()} on:keydown={() => searchInput.focus()}>
    <div class="icon"><SearchIcon /></div>
    &nbsp;
    <input type="text" class="input" placeholder="Search" size="1"
        bind:this={searchInput} bind:value={searchTerm}>
</div>

<style lang="scss">
    .search {
        flex: 1;
        cursor: text;
        
        display: flex;
        padding: 0 12px;
        
    }
    
    .search:hover {
        background: #d2d2d2;
    }

    .input {
        height: 44px;
        
        flex: 1;
        
        border: 0;
        padding: 0;
        
        outline: none;
        background: none;
        
        font-size: inherit;
        font-family: inherit;
        
        &::placeholder {
            color: black;
            font: inherit;
            opacity: 1;
        }
        
        &:focus::placeholder {
            opacity: 0;
        }
    }
    
    .icon {
		margin: auto 0 auto -2px;
		height: 24px;
		width: 24px;
		float: left;
	}
</style>

