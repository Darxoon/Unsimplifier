<script lang="ts">
	import type { DataType } from "paper-mario-elfs/dataType";
	import { createEventDispatcher, onMount } from "svelte";
    import { DataTypeExtension, dataTypeExtensions } from "../dataTypeExtensions";
    import { nonnativeButton } from "$lib/nonnativeButton";
    import { OpenWindowEvent } from "$lib/editor/events";
    import type { ElfBinary } from "paper-mario-elfs/elfBinary";

	const dispatch = createEventDispatcher()
	
	export let binary: ElfBinary
	export let dataType: DataType
	export let fileName: string
	
	let editorElements = []
	
	export function collapseAll() {
		editorElements.forEach(editor => editor.open = false)
	}
	
	export function expandAll() {
		editorElements.forEach(editor => editor.open = true)
	}
	
	onMount(() => {
		// @ts-ignore
		feather.replace()
	})
	
	$: items = Object.entries(dataTypeExtensions(DataTypeExtension.ComplexEditorCategory, dataType))
</script>

<div class="editor">
	{#each items as [name, {dataType, label}]}
		<div class="card link" use:nonnativeButton={() => {
			dispatch("open", new OpenWindowEvent(`${name} (${fileName})`, false, {
				type: "cardList",
				binary,
				dataType,
			}))
		}}>
			<i data-feather="external-link" class="icon-link"></i>
			<div style="user-select: none">
				{label ?? name}
			</div>
		</div>
	{/each}
</div>

<style lang="scss">
	.link {
		margin: 1rem auto;
		max-width: 56rem;
		height: 20px;
		
		.icon-link {
			float: left;
			margin-top: -2px;
			margin-right: 6px;
		}
	}
</style>
