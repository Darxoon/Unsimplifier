<script lang="ts">
	import type { DataType } from "paper-mario-elfs/dataType";
	import { FILE_TYPES } from "paper-mario-elfs/fileTypes";
	import { showModal } from "$lib/modal/modal";
	import TextAlert from "$lib/modal/TextAlert.svelte";
	import { toReadableString } from "$lib/util";
    import { createEventDispatcher, onMount } from "svelte";
    import { nonnativeButton } from "$lib/nonnativeButton";
    import { InfoIcon, MoreHorizontalIcon } from "svelte-feather-icons";
	
    const dispatch = createEventDispatcher()
    
    export let fieldName: string
	export let dataType: DataType | undefined = undefined
    export let shown: boolean
    
    function showDescription() {
        showModal(TextAlert, {
            title: `${toReadableString(fieldName)}`,
            content: fieldDescription,
        })
    }
    
    $: fieldDescription = FILE_TYPES[dataType].metadata[fieldName]?.description?.trim()
</script>

<div class="buttons" class:shown={shown}>
    <div class="button description" class:hidden={fieldDescription == undefined} use:nonnativeButton={showDescription}>
        <InfoIcon class="icon-field" />
    </div>
    
    <div class="button options" use:nonnativeButton={() => dispatch('showMenu', { fieldName, dataType })}>
        <MoreHorizontalIcon class="icon-field" />
    </div>
</div>

<style lang="scss">
    .buttons {
        display: flex;
        
        position: absolute; 
        right: 0; top: 0;
        
        margin: -1px 2px 0 2px;
        opacity: 0;
        
        &.shown, &:focus-within { opacity: 1; }
    }
    
    .button {
        margin-left: 8px;
        font-size: 20px;
        color: #b6b8be;
        
        &:hover { color: #777a80 }
        
        :global(.icon-field) {
            width: 18px;
            height: 18px;
            transform: translateY(1px);
            stroke-width: 3px;
        }
    }
    
    .hidden {
        visibility: hidden;
    }
</style>

