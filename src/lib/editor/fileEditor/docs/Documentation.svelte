<script lang="ts">
    import StringViewer from "$lib/modal/StringViewer.svelte";
    import { onMount } from "svelte";

    type PageId = "introduction"
    
    let loadedPages: {[key in PageId]?: string} = {}
    let currentPage: PageId = "introduction"
    
    onMount(async () => {
        // TODO: make sure currentPage is valid before fetching
        let response = await fetch(`docs/${currentPage}.md`)
        let text = (await response.text()).replaceAll('\r', '')
        console.log(JSON.stringify(text))
        loadedPages[currentPage] = text
    })
</script>

<div class="documentation">
    <h1>Documentation</h1>

    <div class="documentation-content-container">
        <div class="left">
            <div class="card home">
                <ul>
                    <li>Introduction</li>
                </ul>
            </div>
            <div class="card">
                <h2>Tutorials</h2>
                
                <ul>
                    <li>Creating an NPC</li>
                    <li>Testing your mod</li>
                    <li>WIP</li>
                </ul>
            </div>
            <div class="card">
                <h2>Unsimplifier</h2>
                
                <ul>
                    <li>Lesser known features</li>
                    <li>Using Yaml files</li>
                </ul>
            </div>
            <div class="card">
                <h2>TTYD</h2>
                
                <ul>
                    <li>NPC Reference</li>
                    <li>Item Reference</li>
                </ul>
            </div>
        </div>
        <div class="card open-file">
            {#if loadedPages[currentPage]}
                <StringViewer text={loadedPages[currentPage]} inline={false} />
            {:else}
                <p>Loading...</p>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .documentation {
        margin: 2rem auto 0 auto;
        width: 52rem;
        color: white;
    }
    
    .documentation-content-container {
        margin: 0 auto 1rem auto;
        display: flex;
        /* width: fit-content; */
        color: black;
        gap: 2rem;
        
        .card {
            height: fit-content;
        }
        
        .left {
            flex: 1;
        }
        
        .left .card {
            margin-top: 1.5rem;
        }
        
        .left .card:first-child {
            margin-top: 0;
        }
        
        .left ul {
            margin: 0;
        }
        
        .open-file {
            flex: 2;
        }
    }
    
    h1 {
        font-size: 38pt;
        text-align: center;
    }
    
    h2 {
        margin-top: 0;
    }
</style>
