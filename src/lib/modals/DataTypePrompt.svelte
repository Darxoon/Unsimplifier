<script lang="ts">
	import { DataType } from "paper-mario-elfs/dataType";

	import { afterUpdate, beforeUpdate, onMount } from "svelte";
	
	import Alert from "../modal/Alert.svelte";
	import { hideActiveModal } from "../modal/modal";

	export let fileName: string = ""
	
	let select: HTMLSelectElement
	let okButton: HTMLButtonElement
	
	let selectedIndex = 0
	
	let isCompressed = false
	
	const defaultFileNames = {
		"data_Npc": DataType.Npc,
		"data_Item": DataType.Item,
		"data_Mobj": DataType.Mobj,
		"data_Aobj": DataType.Aobj,
		"data_Bshape": DataType.Bshape,
		"MapId": DataType.MapId,
		"data_ItemList": DataType.ItemList,
		"data_character_npc": DataType.CharacterNpc,
		"data_character_mobj": DataType.CharacterMobj,
		"data_character_party": DataType.CharacterParty,
		"data_character_item": DataType.CharacterItem,
	}
	
	onMount(() => {
		okButton.disabled = true
		
		select.onchange = function(e) {
			okButton.disabled = select.selectedIndex < 1
		}
		
		const sortedEntries = Object.entries(defaultFileNames).sort(([a], [b]) => b.length - a.length)
		
		for (const [defaultName, type] of sortedEntries) {
			if (fileName.indexOf(defaultName) > -1) {
				select.value = DataType[type]
				selectedIndex = select.selectedIndex
				okButton.disabled = false
				
				break
			}
		}
		
		if (fileName.includes('.zst')) {
			isCompressed = true
		}
	})
	
	beforeUpdate(() => {
		if (select)
			selectedIndex = select.selectedIndex
	})
	
	afterUpdate(() => {
		if (select)
			select.selectedIndex = selectedIndex
	})
</script>

<Alert title="Select data type">
	<select bind:this={select}>
		<option value="invalid">Please select data type</option>
		<option value="Npc">NPC Placement (data_Npc)</option>
		<option value="Item">Item Placement (data_Item)</option>
		<option value="Mobj">Mobj Placement (data_Mobj)</option>
		<option value="Aobj">Aobj Placement (data_Aobj)</option>
		<option value="Bshape">Bshape Placement (data_Bshape)</option>
		
		<option value="CharacterNpc">NPC Registry (data_character_npc)</option>
		<option value="CharacterMobj">Mobj Registry (data_character_mobj)</option>
		<option value="CharacterParty">Partner Registry (data_character_party)</option>
		<option value="CharacterItem">Item Registry (data_character_item)</option>
		<option value="MapId">Map Registry (MapId)</option>
		<option value="ItemList">Battle Item RNG Table (ItemList)</option>
	</select>
	
	<div class="checkbox" style="margin-top: 0.3rem;">
		<input type="checkbox" id="iscompressed" bind:checked={isCompressed}>
		<label for="iscompressed">Is Compressed with ZSTD?</label>
	</div>
	
	<div class="buttons" style="margin-top: 1rem;">
		<button class="modalbtn" on:click={() => hideActiveModal(false)}>Cancel</button>
		<button class="modalbtn" on:click={() => hideActiveModal({
			dataType: DataType[select.options[select.selectedIndex].value],
			isCompressed,
		})} bind:this={okButton}>Confirm</button>
	</div>
</Alert>

<style>
	select {
		border: none;
		padding: 6px 12px;
		font-size: var(--alert-font-size);
		min-width: 4rem;
		background: #dcdcdc;
		border-radius: 6px;
		transition: background 0.1s;
	}

	select:hover {
		background: #aeaeae;
	}
	
	label {
		font-size: 13pt;
	}
</style>