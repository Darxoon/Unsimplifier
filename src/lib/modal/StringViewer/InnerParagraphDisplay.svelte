<script lang="ts">
	type NewlineObject = {type: "newline", text: string}
    type LinkObject = {type: "link", text: string, href: string, newTab: boolean}
	type MarkupObject = {type: "code" | "bold", text: string}
	type BulletObject = {type: "bullet", text: string}
	
	type TextSlice = string | NewlineObject | LinkObject | MarkupObject | BulletObject
    
    export let paragraph: TextSlice[]
</script>

{#each paragraph as part}
    {#if typeof part === 'object' && part.type == 'link' && part.newTab}
        <a href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>
    {:else if typeof part === 'object' && part.type == 'link'}
        <a href={part.href}>{part.text}</a>
    {:else if typeof part === 'object' && part.type == 'code'}
        <pre>{part.text}</pre>
    {:else if typeof part === 'object' && part.type == 'bold'}
        <strong>{part.text}</strong>
    {:else if typeof part === 'object' && part.type == 'newline'}
        <br>{part.text}
    {:else}
        {part}
    {/if}
{/each}

<style>
	pre {
		display: inline-block;
		font-family: "Fira Mono";
		font-size: 12pt;
		padding: 0 4px;
		margin: 0;
	}
</style>