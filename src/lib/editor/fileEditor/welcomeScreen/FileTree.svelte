<script lang="ts">
  import type { FileSystem } from "$lib/save/vfs";
  import path from "path-browserify";
  import { afterUpdate, createEventDispatcher, onMount } from "svelte";
  import areaNames from "./areaNames.json"
  import { ChevronDownIcon } from "svelte-feather-icons";

  interface FsItem {
  path: string
  name: string
  intuitiveName?: string
  indentation: number
  isFile: boolean
  isCollapsed: boolean
  }

  const supportedFiles = [
  "data_Npc",
  "data_Item",
  "data_Mobj",
  "data_Aobj",
  "data_Bshape",
  "data_Effect",
  "data_GobjRes",
  "data_MapLink",
  "MapParam",
  "MapId",
  "EventFlg",
  "data_map_itemlottable",
  "data_ItemList",
  "data_character_npc",
  "data_character_mobj",
  "data_character_party",
  "data_character_item",
  "data_character_aobj",
  "data_sndBattle",
  "data_param_actionballoon",
  "data_param_fade",
  //"data_param_field",
  "data_param_housedoor",
  "data_param_jump",
  "data_param_gobj",
  //  "data_param_gobj_item",
  "data_param_partyhint",
  "data_param_player",
  "DataMinigame_Paper_Aiper",
  "DataMinigame_Paper_Fan",
  "DataMinigame_Paper_Runner",
  "DataMinigame_Paper_Runnerai",
  "data_Monosiri",
  "data_FallObj",
  "data_Nozzle",
  // "data_HeartParam",
  "data_Parameter",
  "data_battle_weapon_mario",
  "data_battle_weapon_party",
  "data_battle_weapon_other",
  "data_battle_weapon_enemy",
  "data_battle_weapon_item",
  "data_battle_weaponac_mario_ac",
  "data_battle_weaponac_party_ac",
  "data_battle_audiencekind",
  ]

  const dispatch = createEventDispatcher()

  export let romfs: FileSystem | undefined
  export let onlyShowSupported: boolean
  export let onlyShowUnsupported: boolean = false

  let prevRomfs: FileSystem
  let prevOnlyShowSupported: boolean
  let prevOnlyShowUnsupported: boolean
  let fileTree: FsItem[] = JSON.parse(localStorage.getItem('romfs_list_cache'))

  let treeElement: HTMLUListElement
  let short = true
  let showMoreVisible = true

  $: itemsVisible = fileTree && calculateItemsVisible(fileTree)
    
    $: if (romfs && (romfs != prevRomfs || prevOnlyShowSupported != onlyShowSupported || prevOnlyShowUnsupported != onlyShowUnsupported)) {
        // if I don't do this, romfs keeps getting set to itself all the time for some reason
        // which causes the file tree to be regenerated on every click which is janky
        prevRomfs = romfs
        prevOnlyShowSupported = onlyShowSupported
        prevOnlyShowUnsupported = onlyShowUnsupported
        
        getRomfsList().then(async list => {
            fileTree = list
            console.log('updated romfs list')
        })
    }
    
    $: localStorage.setItem('romfs_list_cache', JSON.stringify(fileTree))
    
    afterUpdate(() => {
        showMoreVisible = treeElement?.getBoundingClientRect().height >= 400
    })
    
    async function readRawRomfsList(outFiles: FsItem[], startPath: string = "/", indentation = -1): Promise<void> {
        let dir = await romfs.getDirectoryMetadata(startPath)
        
        if (dir.name) {
            outFiles.push({
                path: dir.path,
                name: dir.name,
                intuitiveName: areaNames[dir.name],
                indentation,
                isFile: false,
                isCollapsed: fileTree?.find(item => item.name == dir.name)?.isCollapsed
                    ?? dir.directories.length == 0,
            })
        }
        
        dir.directories.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
        dir.files.sort((a, b) => a.name.localeCompare(b.name))
        
        for (const child of dir.directories) {
            await readRawRomfsList(outFiles, child, indentation + 1)
        }
        
        for (const file of dir.files) {
            let isSupported = supportedFiles.some(name => file.name.includes(name))
                && !file.name.includes("data_param_gobj_item") // TODO: TEMP
            
            if (onlyShowUnsupported ? !isSupported : (!onlyShowSupported || isSupported)) {
                outFiles.push({
                    path: file.path,
                    name: file.name,
                    indentation: indentation + 1,
                    isFile: true,
                    isCollapsed: false,
                })
            }
        }
    }
    
    async function getRomfsList(): Promise<FsItem[]> {
        let out: FsItem[] = []
        await readRawRomfsList(out)
        
        // purge all empty folders
        let prevIndentation = 0
        
        for (let i = out.length - 1; i >= 0; i--) {
            if (!out[i].isFile && out[i].indentation >= prevIndentation) {
                out.splice(i, 1)
            } else {
                prevIndentation = out[i].indentation
            }
        }
        
        return out
    }
    
    function calculateItemsVisible(items: FsItem[]): boolean[] {
        let collapsedStack: boolean[] = []
        let collapsedCount = 0
        let out: boolean[] = []
        
        let prevIndentation = -1
        for (const item of items) {            
            if (item.indentation < prevIndentation) {
                // I don't know why *this* specifically works but it does
                for (let i = 0; i < prevIndentation - item.indentation + 1; i++) {
                    if (collapsedStack[collapsedStack.length - 1])
                        collapsedCount -= 1
                    collapsedStack.pop()
                }
            }
            
            out.push(collapsedCount == 0)
            
            if (item.indentation != prevIndentation) {
                collapsedStack.push(item.isCollapsed)
                if (item.isCollapsed)
                    collapsedCount += 1
            }
            
            prevIndentation = item.indentation
        }
        
        return out
    }
    
    function toggleFolderCollapse(dir: FsItem) {
        if (!dir.isFile) {
            dir.isCollapsed = !dir.isCollapsed;
            fileTree = fileTree
        }
    }
    
    function openFile(file: FsItem) {
        if (!file.isFile)
            return
        
        dispatch('selectFile', file.path)
    }
</script>

{#if fileTree}
    <ul role="menu" class="tree" bind:this={treeElement} class:shortened={short && showMoreVisible}>
        {#each fileTree as item, i (item.path)}
            <!-- TODO: keyboard support -->
            <li style="padding-left: calc(var(--padding-left) + var(--indent-width) * {item.indentation});"
                on:mousedown={() => toggleFolderCollapse(item)}
                on:dblclick={() => openFile(item)}
                class:collapsed={item.isCollapsed} class:file={item.isFile} class="fs-item"
                class:invisible={!itemsVisible[i]} role="menuitem" tabindex="0">
                {#if !item.isFile}
                    <ChevronDownIcon class="arrow" />
                {/if}
                <span>{item.name}</span>
                {#if item.intuitiveName}
                    <span class="intuitiveName">{item.intuitiveName}</span>
                {/if}
            </li>
        {/each}
    </ul>
    {#if short}
        <button class="show-more" class:invisible={!showMoreVisible} on:click={() => short = false}>Show more...</button>
    {/if}
{/if}

<style>
    .tree {
        --padding-left: 0px;
        --indent-width: 32px;
        padding-left: 0px;
        list-style: none;
        margin-bottom: 0.5rem;
    }
    
    .tree.shortened {
        max-height: 400px;
        overflow: hidden;
        margin-bottom: 0;
    }
    
    .tree li {
        position: relative;
        user-select: none;
        cursor: pointer;
    }
    
    .tree li:hover {
        background: #d0d0d0;
    }
    
    .tree li:focus, .tree li:active {
        background: #bfbfbf;
    }
    
    .file {
        --padding-left: 24px;
    }
    
    .intuitiveName {
        position: absolute;
        left: 0;
        right: 0;
        text-align: center;
    }
    
    :global(.arrow) {
        float: left;
        height: 20px;
        transform: translateY(1px);
    }
    
    .collapsed :global(.arrow) {
        transform: translateY(1px) rotateZ(-90deg);
    }
    
    .show-more {
        font: inherit;
        border: none;
        background: none;
        padding: 0;
        
        margin-top: 0;
        margin-left: 1rem;
    }
    
    .invisible {
        display: none;
    }
</style>
