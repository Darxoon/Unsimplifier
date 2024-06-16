<script lang="ts">
    import CardListEditor from "./CardListEditor.svelte";
    import Documentation from "./docs/Documentation.svelte";
    import type { PageContent } from "./page";
    
    export let content: PageContent
    export let tabVisible: boolean
    export let fileName: string
    
    let contentElement: CardListEditor
    
    export function collapseAll() {
        if (content.type === "cardList") {
            contentElement.collapseAll()
        }
    }
    
    export function expandAll() {
        if (content.type === "cardList") {
            contentElement.expandAll()
        }
    }
</script>

{#if content.type == "cardList"}
    <CardListEditor
        bind:binary={content.binary}
        bind:dataType={content.dataType}
        bind:overrideObjects={content.overrideObjects}
        bind:fileName={fileName}
        
        tabVisible={tabVisible}
        on:open bind:this={contentElement} />
{:else if content.type == "docs"}
    <Documentation />
{/if}
