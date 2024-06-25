<script lang="ts">
	import { onMount } from "svelte";
	import type { DataType } from "paper-mario-elfs/dataType";
	import { FILE_TYPES, type Property, type PropertyType } from "paper-mario-elfs/fileTypes";
	import Alert from "../modal/Alert.svelte";
	import StringViewer from "../modal/StringViewer.svelte";
    import { toReadableString } from "$lib/util";

	export let allMetadata: Map<DataType, {[fieldName: string]: Property<PropertyType>}>
	
	$: allMetadataEntries = Array.from(allMetadata.entries())
	$: console.log('allMetadata', allMetadata, allMetadataEntries)
	let wrapper: HTMLDivElement
	
	onMount(() => {
		wrapper.focus()
	})
	
	function toPlural(name: string) {
		if (name.endsWith('y') && !'aeiou'.includes(name[name.length - 2]))
			return name.slice(0, -1) + 'ies'
		else
			return name + 's'
	}
</script>

<Alert title="All Field Descriptions">
	<div class="wrapper tabbable" bind:this={wrapper}>
		{#each allMetadataEntries as [dataType, typeMetadata]}
		{#if Object.entries(typeMetadata).filter(s => s[1].description).length > 0}
			<h2>{toPlural(FILE_TYPES[dataType].displayName)}:</h2>
			
			<div class="descriptions">
				{#each Object.entries(typeMetadata) as [fieldName, metadata], i}
					{#if metadata.description}
						<div class="element">
							<b>{toReadableString(fieldName)}:</b>
							<StringViewer text={metadata.description} inline={true} />
						</div>
					{/if}
				{/each}
			</div>
		{/if}
		{/each}
	</div>
</Alert>

<style>
	h2 {
		margin-top: 0;
	}
	
	.wrapper {
		overflow: auto;
		max-height: 70vh;
	}
	
	.descriptions {
		margin-bottom: 3rem;
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
