<script lang="ts">
	import { createEventDispatcher } from "svelte";
    import { CopyIcon, XIcon } from "svelte-feather-icons";
	
	const dispatch = createEventDispatcher()
</script>

<div class="buttons">
    <button class="icon duplicate" on:click|stopPropagation={() => {
        dispatch('duplicate')
    }}><CopyIcon /></button>
    <button class="icon delete" on:click|stopPropagation={() => {
        dispatch('delete')
    }}><XIcon /></button>
</div>

<style>
    .buttons {
        position: absolute;
        display: flex;
        
        top: 0;
        right: 0;
    }
    
    .icon {
        --size: 24px;
        
        height: var(--size);
        width: var(--size);
        
        margin-left: 2px;
        margin-top: -2px;
        
        border: 0;
        padding: 0;
        background: none;
    }
</style>

