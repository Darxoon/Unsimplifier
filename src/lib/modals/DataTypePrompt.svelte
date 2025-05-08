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
  "data_Effect": DataType.Effect,
  "data_GobjRes": DataType.GobjRes,
  "data_MapLink": DataType.Maplink,
  "MapParam": DataType.MapParam,
  "MapId": DataType.MapId,
  "EventFlg": DataType.EventFlag,
  "data_map_itemlottable": DataType.MapItemLotTable,
  "data_ItemList": DataType.ItemList,
  "data_character_npc": DataType.CharacterNpc,
  "data_character_mobj": DataType.CharacterMobj,
  "data_character_party": DataType.CharacterParty,
  "data_character_item": DataType.CharacterItem,
  "data_character_aobj": DataType.CharacterAobj,
  "data_model_npc": DataType.DataNpcModel,
  "data_model_player": DataType.DataPlayerModel,
  "data_model_item": DataType.DataItemModel,
  "data_model_mobj": DataType.DataMobjModel,
  "data_model_gobj": DataType.DataGobjModel,
  "data_model_battle": DataType.DataBattleModel,
  "data_sndBattle": DataType.SndBattle,
  "data_param_actionballoon": DataType.ParamActionBalloon,
  "data_param_fade": DataType.ParamFade,
  "data_param_field": DataType.ParamField,
  "data_param_housedoor": DataType.ParamHouseDoor,
  "data_param_jump": DataType.ParamJump,
  "data_param_partyhint": DataType.ParamPartyHint,
  "data_param_player": DataType.ParamPlayer,
  "data_param_gobj": DataType.ParamGobj,
  "data_param_gobj_item": DataType.ParamGobjItem,
  "DataMinigame_Paper_Aiper": DataType.DataMinigamePaperAiper,
  "DataMinigame_Paper_Fan": DataType.DataMinigamePaperFan,
  "DataMinigame_Paper_Runner": DataType.DataMinigamePaperRunner,
  "DataMinigame_Paper_Runnerai": DataType.DataMinigamePaperRunnerai,
  "data_Monosiri": DataType.Monosiri,
  "data_FallObj": DataType.FallObj,
  "data_Nozzle": DataType.Nozzle,
  "data_HeartParam": DataType.HeartParam,
  "data_Parameter": DataType.Parameter,
  "data_battle_weapon_mario": DataType.BattleWeaponMario,
  "data_battle_weapon_party": DataType.BattleWeaponParty,
  "data_battle_weapon_other": DataType.BattleWeaponOther,
  "data_battle_weapon_enemy": DataType.BattleWeaponEnemy,
  "data_battle_weapon_item": DataType.BattleWeaponItem,
  "data_battle_weaponac_mario_ac": DataType.BattleWeaponAcMarioAc,
  "data_battle_weaponac_party_ac": DataType.BattleWeaponAcPartyAc,
  "data_battle_audiencekind": DataType.BattleAudienceKind,
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
		<option value="Effect">Effect Placement (data_Effect)</option>
		<option value="GobjRes">Gobj Placement (data_GobjRes)</option>
		<option value="Maplink">Map Transitions (data_MapLink)</option>
		<option value="MapParam">Map Parameters (data_MapParam)</option>

		<option value="CharacterNpc">NPC Registry (data_character_npc)</option>
		<option value="CharacterMobj">Mobj Registry (data_character_mobj)</option>
		<option value="CharacterParty">Partner Registry (data_character_party)</option>
		<option value="CharacterItem">Item Registry (data_character_item)</option>
		<option value="CharacterAobj">Aobj Registry (data_character_aobj)</option>
    <option value="DataNpcModel">NPC Models (data_model_npc)</option>
    <option value="DataPlayerModel">Player Models (data_model_player)</option>
    <option value="DataItemModel">Item Models (data_model_item)</option>
    <option value="DataMobjModel">Mobj Models (data_model_mobj)</option>
    <option value="DataGobjModel">Gobj Models (data_model_gobj)</option>
    <option value="DataBattleModel">Battle Models (data_model_battle)</option>

    <option value="SndBattle">Battle BGM Registry (data_sndBattle)</option>

    <option value="EventFlag">Event Flags (EventFlg)</option>
    <option value="MapItemLotTable">Map Item Lot Table (data_map_itemlottable)</option>
    <option value="MapId">Map Registry (MapId)</option>
		<option value="ItemList">Battle Item RNG Table (ItemList)</option>

    <option value="ParamActionBalloon">Action Balloon Parameters (data_param_actionballoon)</option>
    <option value="ParamFade">Screen Transitions (data_param_fade)</option>
    <option value="ParamField">Field Parameters (data_param_field)</option>
    <option value="ParamHouseDoor">House Door Parameters (data_param_housedoor)</option>
    <option value="ParamJump">Jump Parameters (data_param_jump)</option>
    <option value="ParamPartyHint">Party Hint Parameters (data_param_partyhint)</option>
    <option value="ParamPlayer">Player Parameters (data_param_player)</option>
    <option value="ParamGobj">Gobj Parameters (data_param_gobj)</option>
		<option value="ParamGobjItem">Gobj Item Parameters (data_param_gobj_item)</option>
		<option value="DataMinigamePaperAiper">Paper Minigame Aiper Parameters (DataMinigame_Paper_Aiper)</option>
		<option value="DataMinigamePaperFan">Paper Minigame Fan Parameters (DataMinigame_Paper_Fan)</option>
		<option value="DataMinigamePaperRunner">Paper Minigame Runner Parameters (DataMinigame_Paper_Runner)</option>
		<option value="DataMinigamePaperRunnerai">Paper Minigame Runner AI Parameters (DataMinigame_Paper_Runnerai)</option>

		<option value="Monosiri">Tattle Log (Monosiri)</option>
		<option value="FallObj">Falling Stage Objects (FallObj)</option>
		<option value="Nozzle">Stage Spray Nozzles (Nozzle)</option>
		<option value="HeartParam">Heart and Flower Drop Parameters (HeartParam)</option>
		<option value="Parameter">Battle Parameters (Parameter)</option>

    <option value="BattleWeaponMario">Player Attacks (BattleWeaponMario)</option>
    <option value="BattleWeaponParty">Party Attacks (BattleWeaponParty)</option>
    <option value="BattleWeaponOther">Other Attacks (BattleWeaponOther)</option>
    <option value="BattleWeaponEnemy">Enemy Attacks (BattleWeaponEnemy)</option>
    <option value="BattleWeaponItem">Item Attacks (BattleWeaponItem)</option>
    <option value="BattleWeaponAcMarioAc">Player Action Commands (BattleWeaponAcMarioAc)</option>
    <option value="BattleWeaponAcPartyAc">Party Action Commands (BattleWeaponAcPartyAc)</option>

    <option value="BattleAudienceKind">Battle Audience Parameters (BattleAudienceKind)</option>

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