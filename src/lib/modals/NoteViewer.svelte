<script lang="ts">
	import { onMount } from "svelte";
	import { FILE_TYPES } from "paper-mario-elfs/fileTypes";
	import Alert from "../modal/Alert.svelte";
	import StringViewer from "../modal/StringViewer.svelte";
	import { DataType } from "paper-mario-elfs/dataType";
	import { toReadableString } from "$lib/util";

	let wrapper: HTMLDivElement
	
	let allNotes = Object.entries(localStorage)
		.filter(arr => arr[0].endsWith('.ttyddesc'))
		.map(arr => [arr[0].slice(0, -'.ttyddesc'.length).split('/'), arr[1]])
	
	$: console.log('allNotes', allNotes)
	
	onMount(() => {
		wrapper.focus()
	})
</script>

<Alert title="All User Notes">
	<div class="wrapper tabbable" class:empty={allNotes.length == 0} bind:this={wrapper}>
		{#if allNotes.length == 0}
			<p>You can add notes by hovering over a field name if you have an active file open
				and clicking on •••, then typing something into the Personal Notes box.</p>
			<p>Nothing here yet.</p>
		{/if}
		{#each allNotes as [id, content], i}
			<div class="element">
				<b>{FILE_TYPES[DataType[id[0]]].displayName + ' > ' + toReadableString(id[1])}:</b>
				<StringViewer text={content} inline={true} />
			</div>
		{/each}
	</div>
</Alert>

<style>
	.wrapper {
		overflow: auto;
		max-height: 70vh;
		
		min-width: 32rem;
		min-height: 14rem;
	}
	.empty {
		max-width: min-content;
	}
	.element {
		margin: 0 1rem 1rem 0;
		padding: 6px 12px;
		
		border-radius: 4px;
		
		background: #eaeaea;
	}
	.element:last-child {
		margin-bottom: 0;
	}
</style>
