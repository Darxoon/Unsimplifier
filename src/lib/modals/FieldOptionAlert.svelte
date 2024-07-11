<script lang="ts">
	import InputField from "$lib/editor/objectEditor/InputField.svelte";
	import { hexFields, setHexField } from "$lib/editor/objectEditor/viewAsHex";
	
	import type { ElfBinary } from "paper-mario-elfs/elfBinary";
	import { DataType } from "paper-mario-elfs/dataType";
	import { FILE_TYPES, isNumber } from "paper-mario-elfs/fileTypes";
	import { onMount } from "svelte";

	import StringViewer from "../modal/StringViewer.svelte";
	import TabbedAlert from "../modal/TabbedAlert.svelte"
    import { DATA_TYPE, type UuidTagged } from "paper-mario-elfs/valueIdentifier";

	export let dataType: DataType
	export let objects: any[]
	export let binary: ElfBinary
	export let fieldName: string
	export let title: string
	
	$: fieldType = FILE_TYPES[dataType].typedef[fieldName]
	$: allGlobalValues = FILE_TYPES[dataType].dataDivision == null && scanAllGlobalValues()
	$: hideNulls = fieldType === "string"
	
	$: forceMaxHeight = hideNulls && objects.length * 35 + 18 * 16 >= window.visualViewport.height
	
	$: globalFieldId = DataType[dataType] + "/" + fieldName
	
	let notes: string
	
	
	$: if (notes) localStorage[globalFieldId + ".ttyddesc"] = notes
	
	onMount(() => {
		notes = localStorage[globalFieldId + ".ttyddesc"]
	})
	
	type GlobalValuesEntry = readonly [UuidTagged, number, number]
	
	function scanAllGlobalValues() {
		let result: GlobalValuesEntry[] = []
		scanArrayForGlobalValues(binary.data.main, result)
		
		console.log(result)
		return result
	}
	
	function scanArrayForGlobalValues(array: any[], result: GlobalValuesEntry[]) {
		for (const item of array) {
			for (const fieldValue of Object.values(item)) {
				if (typeof fieldValue == 'object' && 'symbolName' in fieldValue && 'children' in fieldValue) {
					
					if (fieldValue.children[0] && fieldValue.children[0][DATA_TYPE] == dataType) {
						result.push(
							...(fieldValue.children as UuidTagged[])
								.map((child, i) => [child, array.indexOf(item), i] as const)
						)
					}
					
					scanArrayForGlobalValues(fieldValue.children as unknown[], result)
					
				}
			}
		}
	}
</script>

<TabbedAlert title={title} selectedIndex={0} tabNames={allGlobalValues 
		? ["General Information", "All Local Values", "All Global Values"]
		: ["General Information", "All Values"]}>
	<div class="info">
		<div>Name:</div>
		<div class="box field">{fieldName}</div>
		
		<div>Data Type:</div>
		<div class="box">{fieldType}</div>
		
		{#if fieldType == "int" || fieldType == "short" || fieldType == "long" || fieldType == "byte"}
			<div>
				<input type="checkbox" name="viewAsHex" checked={$hexFields[dataType] && $hexFields[dataType][fieldName]} on:change={e => {
					// @ts-ignore
					setHexField(dataType, fieldName, e.target.checked)
				}}>
				<label for="viewAsHex">View as Hexadecimal</label>
			</div>
		{/if}
		
		{#if FILE_TYPES[dataType].metadata[fieldName]?.description}
			<div>Description:</div>
			<div class="box description">
				<StringViewer text={FILE_TYPES[dataType].metadata[fieldName]?.description} nopadding={true} />
			</div>
		{/if}
		
		<div>Personal Notes:</div>
		<div>
			<input class="box notes" type="text" name="notes" bind:value={notes} placeholder="Write something...">
		</div>
	</div>
	<div>
		{#if fieldType === "string"}
			<div class="hideNullContainer">
				<input type="checkbox" id="hideNull" bind:checked={hideNulls}>
				<label for="hideNull">Hide all "null" values</label>
			</div>
		{/if}
		{#if isNumber(fieldType)}
			<div class="hideNullContainer">
				<input type="checkbox" id="hideNull" bind:checked={hideNulls}>
				<label for="hideNull">Hide all zeroes</label>
			</div>
		{/if}
		<div class="allValues local tabbable" class:forceMaxHeight={forceMaxHeight}>
			{#each objects as obj, i}
				{#if hideNulls ? obj[fieldName] !== null && obj[fieldName] != 0 || obj[fieldName] === "" : true}
					<div class="index">
						{i}
					</div>
					<div class="fieldName">
						{obj[FILE_TYPES[dataType].identifyingField]}
					</div>
					<div class="field">
						<InputField key={fieldName} value={obj[fieldName]} readonly={true} />
					</div>
				{/if}
			{/each}
		</div>
	</div>
	{#if allGlobalValues}
		<div><!-- TODO: Make this a Svelte 5 snippet in the future to reduce repetition -->
			{#if fieldType === "string"}
				<div class="hideNullContainer">
					<input type="checkbox" name="hideNull" bind:checked={hideNulls}>
					<label for="hideNull">Hide all "null" values</label>
				</div>
			{/if}
			<div class="allValues nested tabbable">
				{#each allGlobalValues as [obj, i, j]}
					{#if hideNulls ? obj[fieldName] !== null : true}
						<div class="index">
							{i}&nbsp;/&nbsp;{j}
						</div>
						<div class="fieldName" class:highlight={j > 0 ? j % 2 == 1 : i % 2 == 1}>
							{obj[FILE_TYPES[dataType].identifyingField]}
						</div>
						<div class="field">
							<InputField key={fieldName} value={obj[fieldName]} readonly={true} />
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</TabbedAlert>

<style>
	.hideNullContainer {
		margin: 0 0 12px -4px;
	}
	
	.allValues {
		display: grid;
		grid-template-columns: min-content minmax(min-content, 30%) auto;
		max-height: calc(100vh - 18rem);
		min-width: min(48rem, 70vw);
		overflow-y: auto;
	}
	
	.allValues.forceMaxHeight {
		min-height: calc(100vh - 18rem);
		
		/* if it has more than 1000 items, welp  */
		/* necessary so that the entries don't spread across the entire box height */
		grid-template-rows: repeat(1000, min-content);
	}
	
	.allValues.local :nth-child(6n-1) {
		background: #eaeaea;
		border-radius: 3px;
	}
	
	.allValues.nested .fieldName:nth-child(6n-1) {
		background: #eaeaea;
		border-radius: 3px;
	}
	
	.allValues div {
		margin-bottom: 8px;
	}
	
	.index {
		padding: 3px 0;
		margin-right: 8px;
	}
	
	.fieldName {
		padding: 3px 4px 3px 2px;
		margin-right: 2px;
	}
	
	.field {
		margin-right: 6px;
	}
	
	.box {
		margin: 4px 0 1rem 0;
		padding: 6px 12px;
		
		border-radius: 4px;
		
		background: #eaeaea;
	}
	
	.field {
		font-family: var(--ff-monospace);		
	}
	
	.description {
		padding: 12px 12px;	
		min-height: 5rem;
	}
	
	.notes {
		width: calc(100% - 27.2px);
		font: inherit;
	}
	
	.notes::placeholder {
		font-style: italic;
	}
</style>
