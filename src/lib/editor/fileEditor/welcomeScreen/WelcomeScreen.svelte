<script lang="ts">
    import { loadFilesToRomfsStore, getRomfsVfs } from "$lib/save/projects";
    import type { FileSystem } from "$lib/save/vfs";
    import { createEventDispatcher, onMount } from "svelte";
    import Dexie from "dexie";
    import { decompress, wait, waitAnimationFrame } from "$lib/util";
    import FileTree from "./FileTree.svelte";
    import { showModal } from "$lib/modal/modal";
    import DataTypePrompt from "$lib/modals/DataTypePrompt.svelte";
    import path from "path-browserify";
    import { DataType } from "paper-mario-elfs/dataType";
    import parseElfBinary from "paper-mario-elfs/parser";
    import { OpenWindowEvent } from "$lib/editor/events";
    import { romfsInitialized } from "$lib/stores";
    import TextAlert from "$lib/modal/TextAlert.svelte";
    import { addToRecentFiles, type RecentFile, recentFiles } from "$lib/save/recent";
    import { openYamlToEditor } from "$lib/menu/fileMenu";
    
    const dispatch = createEventDispatcher()
    
    let folderSelector: HTMLInputElement
    let romfs: FileSystem
    
    let showSetup = false
    let loadingRomfs = false
    let setupLabelOverride: string = ""
    let setupProgress = "initializing"
    
    let recentFilesShort = true
    
    let checkboxId = "checkbox" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    let onlyShowSupported = true
    let onlyShowUnsupported = false
    
    $: if (romfs) {
        localStorage.setItem('romfs_list_onlyshowsupported', onlyShowSupported ? 1 : 0)
    }
    
    onMount(async () => {
        // if I add these in the html, I get a typescript error that can't be suppressed
	    folderSelector.setAttribute('webkitdirectory', "webkitdirectory")
	    folderSelector.setAttribute('directory', "directory")
        
        onlyShowSupported = !!parseInt(localStorage.getItem('romfs_list_onlyshowsupported') ?? "1")
        
        if ($romfsInitialized) {
            romfs = await getRomfsVfs()
        } else {
            showSetup = true
        }
    })
    
    function toggleUnsupported(e: MouseEvent) {
        e.preventDefault()
        onlyShowUnsupported = !onlyShowUnsupported
        if (onlyShowUnsupported) {
            onlyShowSupported = true
        }
    }
    
    function disableUnsupported(e: MouseEvent) {
        if (onlyShowUnsupported) {
            e.preventDefault()
            onlyShowUnsupported = false
            onlyShowSupported = true
        }
    }
    
    function uploadRomfs(e: Event) {
        setupLabelOverride = ""
        loadingRomfs = true
        
        requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
                await Dexie.delete('VFS:romfs_data')
                console.log('romfs VFS deleted')
                
                await waitAnimationFrame()
                
                const files: FileList = (e.target as any).files
                
                try {
                    await loadFilesToRomfsStore([...files], label => setupProgress = label)
                } catch (e) {
                    setupLabelOverride = "Error while loading (" + e + ")"
                    throw e
                }
                
                console.log('new romfs was loaded')
                
                await waitAnimationFrame()
                setupLabelOverride = "Done!"
                                
                await wait(1000)
                
                romfs = await getRomfsVfs()
                console.log('romfs initialized', romfs)
                $romfsInitialized = true
            })
        })
    }
    
    async function openFile(filePath: string, dataType?: DataType, isCompressed?: boolean, addToRecent?: boolean = true) {
        if (!romfs)
            return
        
        let contentPromise = romfs.getFileContent(filePath, false)
        const fileName = path.basename(filePath)
        
        if (dataType == undefined || isCompressed == undefined) {
            ({ dataType, isCompressed } = await showModal(DataTypePrompt, {
                fileName,
            }))
        }

        if (!dataType) {
            return
        }
        
        console.log(DataType[dataType])
        
        const content = isCompressed ? await decompress(await contentPromise) : await contentPromise
        
        try {
            var binary = parseElfBinary(dataType, content)
        } catch (e) {
            showModal(TextAlert, {
                title: "Parse Error",
                content: `There has been an issue with the parsing of the file
${filePath}. Please report this to the developer (Darxoon)

(reason: ${e.message})`
            })
            throw e
        }
        
        if (addToRecent) {
            addToRecentFiles({
                label: filePath.split('/').slice(-2).join('/'),
                dataType,
                filePath,
            })
        }
        
        dispatch('open', new OpenWindowEvent(fileName, true, {
            type: "cardList",
            binary,
            dataType,
            filePath: filePath.slice(1),
        }))
    }
    
    function openRecentFile(file: RecentFile) {
        const { filePath, yamlContent, saveId, dataType } = file
        
        if (filePath) {
            openFile(filePath, dataType, true, false)
        } else if (yamlContent) {
            openYamlToEditor(yamlContent, path.basename(filePath))
        } else if (saveId) {
            showModal(TextAlert, {
                title: "Not Implemented",
                content: "Can't load recent files originally loaded through `File > Open` yet :(",
            })
            throw new Error("TODO")
        }
    }
</script>

<div class="welcome-wrapper">
    <div class="welcome" class:invisible={romfs == undefined && !showSetup}>
        {#if romfs}
            <h1>Getting Started</h1>
    
            <div class="welcome-content-container">
                <div class="left">
                    <div class="card learn">
                        <h2>Learn</h2>
                        
                        <ul>
                            <li><a href="https://github.com/Darxoon/Unsimplifier#unsimplifier">Read the introduction</a></li>
                            <li><a href="https://docs.google.com/spreadsheets/d/1pZogGh00xy939FdCG62uWjxZnkP1G4gjDGBG4TntbKY/"
                                target="_blank" rel="noopener noreferrer">Visit jdaster's spreadsheet documentation</a></li>
                            <li>Join <a href="https://discord.gg/pdYpWw8">Star Haven</a>
                                or <a href="https://discord.gg/9EzRrfVfPg">Modern Paper Mario Modding</a> on discord</li>
                        </ul>
                    </div>
                    <div class="card recent">
                        <h2>Recent Files</h2>
                        
                        {#if $recentFiles && $recentFiles.length > 0}
                            <ul>
                                {#each recentFilesShort ? $recentFiles.slice(0, 3) : $recentFiles as item}
                                    <li><button class="item" on:click={() => openRecentFile(item)}>{item.label}</button></li>
                                {/each}
                            </ul>
                            {#if recentFilesShort && $recentFiles.length > 3}
                                <button class="show-more" on:click={() => recentFilesShort = false}>Show more...</button>
                            {/if}
                        {:else}
                            <p>Nothing here yet</p>
                        {/if}
                    </div>
                </div>
                <div class="card open-file">
                    <h2>Open a file</h2>
                    
                    <input type="checkbox" id={checkboxId} class:unsupported={onlyShowUnsupported}
                        bind:checked={onlyShowSupported}
                        on:dblclick={toggleUnsupported}
                        on:click={disableUnsupported}>
                    <label for={checkboxId} on:dblclick={toggleUnsupported}>
                        {#if onlyShowUnsupported}
                            Only show UNsupported!!!
                        {:else}
                            Only show supported files
                        {/if}
                    </label>
                    
                    <FileTree romfs={romfs}
                        onlyShowSupported={onlyShowSupported}
                        onlyShowUnsupported={onlyShowUnsupported}
                        on:selectFile={e => openFile(e.detail)} />
                </div>
            </div>
        {:else}
            <h1>Setting up</h1>
            
            <div class="welcome-content-container">
                <div class="card setup">
                    <p>Let's set up Unsimplifier so you can start modding! :)</p>
                    
                    <p>To use this tool, you need a copy of the Paper Mario: TTYD Remake
                        and either the&nbsp;emulator <a href="https://www.ryujinx.org/">Ryujinx</a> or a homebrewed
                        Nintendo Switch with <a href="https://nh-server.github.io/switch-guide/">Atmosphere</a>
                        in order to create a RomFS dump. (Skip the following step if you already have one)</p>
                    
                    <p>If you are using <em>Atmosphere</em>, install
                        <a href="https://github.com/DarkMatterCore/nxdumptool/releases">NXDumpTool</a> and extract
                        a RomFS dump with it.</p>
                    
                    <p>If you are using <em>Ryujinx</em>, create a folder named "romfs"
                        somewhere in your file system and make sure you have TTYD appearing in Ryujinx's main menu.
                        Right click the game, then select Extract&nbsp;Data&nbsp;&gt;&nbsp;RomFS and select the
                        <em>romfs</em> folder you just created.</p>
                    
                    <p>Once it is done extracting, open the romfs folder here:</p>
                        
                    <p><input type="file" bind:this={folderSelector} on:change={uploadRomfs} multiple></p>
                    
                    <p>(it will not be uploaded, only stored locally in your browser)</p>
                    
                    {#if setupLabelOverride}
                        <p>{setupLabelOverride}</p>
                    {:else if loadingRomfs}
                        <p>Loading romfs... ({setupProgress})</p>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .welcome {
        margin: 2rem auto 0 auto;
        width: 52rem;
        color: white;
    }
    
    .welcome-content-container {
        margin: 0 auto 1rem auto;
        display: flex;
        /* width: fit-content; */
        color: black;
        gap: 1rem;
        
        .card {
            height: fit-content;
        }
        
        .left {
            flex: 1;
        }
        
        .recent {
            margin-top: 1.5rem;
            
            p {
                margin-bottom: 0.5rem;
            }
            
            ul {
                margin-bottom: 0.4rem;
            }
            
            .item {
                font: inherit;
                border: none;
                background: none;
                padding: 0;
                
                color: LinkText;
                text-decoration: underline;
                cursor: pointer;
                
                vertical-align: top;
                text-align: left;
            }
            
            .item:active {
                color: ActiveText;
            }
            
            .show-more {
                font: inherit;
                border: none;
                background: none;
                padding: 0;
                
                margin-top: 0;
                margin-left: 1rem;
            }
        }
        
        .open-file {
            flex: 2;
        }
        
        .unsupported {
            filter: sepia(1) saturate(20) hue-rotate(-43deg) contrast(2);
        }
    }
    
    .setup {
        margin: 0 auto;
        max-width: 40rem;
    }
    
    h1 {
        font-size: 38pt;
        text-align: center;
    }
    
    h2 {
        margin-top: 0;
    }
    
    ul {
        padding-left: 2rem;
    }
    
    .invisible {
        display: none;
    }
</style>
