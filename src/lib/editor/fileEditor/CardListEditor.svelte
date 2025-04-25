<script lang="ts">
    import type { ElfBinary } from "paper-mario-elfs/elfBinary";
    import type { UuidTagged } from "paper-mario-elfs/valueIdentifier";
	import { DataType } from "paper-mario-elfs/dataType";
    import LinearEditor from "./cardListEditor/LinearEditor.svelte";
    import InnerIndexPageEditor from "./cardListEditor/InnerIndexPageEditor.svelte";
    import { DataTypeExtension, dataTypeExtensions } from "./dataTypeExtensions";

	export let binary: ElfBinary
	export let dataType: DataType
	export let tabVisible: boolean
	
	export let overrideObjects: UuidTagged[] = undefined
	export let fileName: string = undefined
	
	let inner: InnerIndexPageEditor | LinearEditor
	
	$: requiresIndexEditor = dataTypeExtensions(DataTypeExtension.HasComplexEditor, dataType)
	
	$: if (requiresIndexEditor && fileName == undefined) {
		throw new Error("filename property must be set in CardListEditor component with inner index editor.")
	}
	
	export function collapseAll() {
		inner.collapseAll()
	}
	
	export function expandAll() {
		inner.expandAll()
	}
</script>

{#if requiresIndexEditor}
	<InnerIndexPageEditor bind:this={inner} dataType={dataType} binary={binary} fileName={fileName} on:open />
<!-- {:else if nonStandardDataTypes.has(dataType)}
	<div>This file does not have an editor yet.</div> -->
{:else}
	<LinearEditor bind:this={inner} bind:binary={binary} bind:dataType={dataType} bind:overrideObjects={overrideObjects} tabVisible={tabVisible} on:open />
{/if}
