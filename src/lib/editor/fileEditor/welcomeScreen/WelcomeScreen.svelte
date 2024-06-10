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
    
    const dispatch = createEventDispatcher()
    
    let folderSelector: HTMLInputElement
    let romfs: FileSystem
    
    let showSetup = false
    let loadingRomfs = false
    let setupLabelOverride: string = ""
    let setupProgress = "initializing"
    
    let checkboxId = "checkbox" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    let onlyShowSupported: boolean = true
    
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
    
    async function openFile(filePath: string) {
        if (!romfs)
            return
        
        let contentPromise = romfs.getFileContent(filePath, false)
        const fileName = path.basename(filePath)
        
        const {dataType, isCompressed} = await showModal(DataTypePrompt, {
            fileName,
        })

        if (!dataType) {
            return
        }
        
        console.log(DataType[dataType])
        
        const content = isCompressed ? await decompress(await contentPromise) : await contentPromise
        const binary = parseElfBinary(dataType, content)
        
        dispatch('open', new OpenWindowEvent(fileName, {
            type: "cardList",
            binary,
            dataType,
        }))
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
                            <li><a href="https://github.com/Darxoon/OrigamiWand#usage">Read the introduction</a></li>
                            <li><a href="https://docs.google.com/spreadsheets/d/1n5Y-fE2lAtEFBWkpXFYqbb6iKa4cqEIj2pGoXztAuRw/"
                                target="_blank" rel="noopener noreferrer">Visit the ""documentation"" (TOK Spreadsheet)</a></li>
                            <li><a href="https://discord.gg/y7qfTKyhZy" target="_blank" rel="noopener noreferrer">Join the TOK Refolded discord</a></li>
                            <li>Open a file with File > Open</li>
                        </ul>
                    </div>
                    <div class="card recent">
                        <h2>Recent Files</h2>
                        
                        <p>TODO</p>
                    </div>
                </div>
                <div class="card open-file">
                    <h2>Open a file</h2>
                                        
                    <input type="checkbox" id={checkboxId} bind:checked={onlyShowSupported}>
                    <label for={checkboxId}>Only show supported files</label>
                    
                    <FileTree romfs={romfs} onlyShowSupported={onlyShowSupported} on:selectFile={e => openFile(e.detail)} />
                </div>
            </div>
        {:else}
            <h1>Setting up</h1>
            
            <div class="welcome-content-container">
                <div class="card setup">
                    <p>Let's set up Unsimplifier so you can start modding! :)</p>
                    
                    <p>To use this tool, you need a copy of the Paper Mario: TTYD Remake
                        and either the&nbsp;emulator <a href="https://www.ryujinx.org/">Ryujinx</a> or a homebrewed
                        Nintendo Switch with <a href="https://nh-server.github.io/switch-guide/">Atmosphere</a>.</p>
                    
                    <p>If you are using <em>Atmosphere</em>, install
                        <a href="https://github.com/DarkMatterCore/nxdumptool/releases">NXDumpTool</a> and extract
                        a RomFS dump with it.</p>
                    
                    <p>If you are using <em>Ryujinx</em>, create a folder named "romfs"
                        somewhere in your file system and make sure you have TTYD appearing in Ryujinx's main menu.
                        Right click the game, then select Extract&nbsp;Data&nbsp;&gt;&nbsp;RomFS and select the
                        <em>romfs</em> folder you just created.</p>
                    
                    <p>Once it is done extracting, open the romfs folder here:</p>
                        
                    <p><input type="file" bind:this={folderSelector} on:change={uploadRomfs} multiple></p>
                    
                    <p>(it will not get uploaded, only stored locally in your browser)</p>
                    
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
            margin-top: 1.5rem
        }
        
        .open-file {
            flex: 2;
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
    
    .invisible {
        display: none;
    }
</style>
