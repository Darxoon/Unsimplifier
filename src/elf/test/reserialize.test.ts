import { test, expect } from 'vitest'
import fs from 'fs/promises'
import { ZstdCodec } from 'zstd-codec'
import parseElfBinary from 'paper-mario-elfs/parser'
import { DataType } from 'paper-mario-elfs/dataType'
import serializeElfBinary from 'paper-mario-elfs/serializer'
import path from 'path'

async function decompress(buffer: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
	return new Promise((resolve, reject) => {
		ZstdCodec.run(zstd => {
			const simple = new zstd.Simple();
			const decompressed = simple.decompress(buffer)
			
			resolve(decompressed)
		})
	})
}

async function testMatch(dataType: DataType, filepath: string, timeDeserialization?: boolean) {
    const file = await fs.readFile(__dirname + '/orig/' + filepath)
    const decompressed = await decompress(file)
    
    if (timeDeserialization) {
        console.time('Deserialize')
    }
    
    const binary = parseElfBinary(dataType, decompressed.buffer, false)
    
    if (timeDeserialization) {
        console.timeEnd('Deserialize')
    }
    
    const reserialized = serializeElfBinary(dataType, binary, false)
    
    try {
        expect(decompressed.buffer, "Does not match").toStrictEqual(reserialized)
    } catch (e) {
        await fs.mkdir(__dirname + '/failed', { recursive: true })
        await fs.writeFile(__dirname + '/failed/' + path.basename(filepath, '.elf.zst') + '.orig.elf', new Uint8Array(decompressed))
        await fs.writeFile(__dirname + '/failed/' + path.basename(filepath, '.zst'), new Uint8Array(reserialized))
        throw e
    }
}

// TODO: These don't have tests yet
// Npc
// Item
// Mobj
// Aobj
// Bshape
// GobjRes
// Effect
// MapParam
// Maplink

test('reserialize data_character_npc', async () => {
    await testMatch(DataType.CharacterNpc, 'data/character/data_character_npc.elf.zst')
})

test('reserialize data_character_mobj', async () => {
    await testMatch(DataType.CharacterMobj, 'data/character/data_character_mobj.elf.zst')
})

test('reserialize data_character_party', async () => {
    await testMatch(DataType.CharacterParty, 'data/character/data_character_party.elf.zst')
})

test('reserialize data_character_item', async () => {
    await testMatch(DataType.CharacterItem, 'data/character/data_character_item.elf.zst')
})

test('reserialize data_character_aobj', async () => {
    await testMatch(DataType.CharacterAobj, 'data/character/data_character_aobj.elf.zst')
})

test('reserialize MapId', async () => {
    await testMatch(DataType.MapId, 'data/map/MapId.elf.zst')
})

test('reserialize data_map_itemlottable', async () => {
    await testMatch(DataType.MapItemLotTable, 'data/map/data_map_itemlottable.elf.zst')
})

test('reserialize EventFlg', async () => {
    await testMatch(DataType.EventFlg, 'data/event/EventFlg.elf.zst')
})

test('reserialize data_ItemList', async () => {
    await testMatch(DataType.ItemList, 'data/battle/data_ItemList.elf.zst')
})

test('reserialize data_sndBattle', async () => {
    await testMatch(DataType.SndBattle, 'sound/data/data_sndBattle.elf.zst')
})

test('reserialize data_param_actionballoon', async () => {
    await testMatch(DataType.ParamActionBalloon, 'data/param/data_param_actionballoon.elf.zst')
})

test('reserialize data_param_fade', async () => {
    await testMatch(DataType.ParamFade, 'data/param/data_param_fade.elf.zst')
})

test('reserialize data_param_field', async () => {
    await testMatch(DataType.ParamField, 'data/param/data_param_field.elf.zst')
})

// Currently errors
// test('reserialize data_param_gobj_item', async () => {
//     await testMatch(DataType.ParamGobjItem, 'data/param/data_param_gobj_item.elf.zst')
// })

test('reserialize data_param_gobj', async () => {
    await testMatch(DataType.ParamGobj, 'data/param/data_param_gobj.elf.zst')
})

test('reserialize data_param_housedoor', async () => {
    await testMatch(DataType.ParamHouseDoor, 'data/param/data_param_housedoor.elf.zst')
})

test('reserialize data_param_jump', async () => {
    await testMatch(DataType.ParamJump, 'data/param/data_param_jump.elf.zst')
})

test('reserialize data_param_partyhint', async () => {
    await testMatch(DataType.ParamPartyHint, 'data/param/data_param_partyhint.elf.zst')
})

test('reserialize data_param_player', async () => {
    await testMatch(DataType.ParamPlayer, 'data/param/data_param_player.elf.zst')
})

test('reserialize DataMinigame_Paper_Aiper', async () => {
    await testMatch(DataType.DataMinigamePaperAiper, 'data/minigame/paper/DataMinigame_Paper_Aiper.elf.zst')
})

test('reserialize DataMinigame_Paper_Fan', async () => {
    await testMatch(DataType.DataMinigamePaperFan, 'data/minigame/paper/DataMinigame_Paper_Fan.elf.zst')
})

test('reserialize DataMinigame_Paper_Runner', async () => {
    await testMatch(DataType.DataMinigamePaperRunner, 'data/minigame/paper/DataMinigame_Paper_Runner.elf.zst')
})

test('reserialize DataMinigame_Paper_Runnerai', async () => {
    await testMatch(DataType.DataMinigamePaperRunnerai, 'data/minigame/paper/DataMinigame_Paper_Runnerai.elf.zst')
})

test('reserialize data_Monosiri', async () => {
    await testMatch(DataType.Monosiri, 'data/battle/data_Monosiri.elf.zst')
})

test('reserialize data_FallObj', async () => {
    await testMatch(DataType.FallObj, 'data/battle/data_FallObj.elf.zst')
})

test('reserialize data_Nozzle', async () => {
    await testMatch(DataType.Nozzle, 'data/battle/data_Nozzle.elf.zst')
})

test('reserialize data_HeartParam', async () => {
    await testMatch(DataType.HeartParam, 'data/battle/data_HeartParam.elf.zst')
})

test('reserialize data_Parameter', async () => {
    await testMatch(DataType.Parameter, 'data/battle/data_Parameter.elf.zst')
})

test('reserialize data_battle_weapon_mario', async () => {
    await testMatch(DataType.BattleWeaponMario, 'data/battle/weapon/data_battle_weapon_mario.elf.zst')
})

test('reserialize data_battle_weapon_party', async () => {
    await testMatch(DataType.BattleWeaponParty, 'data/battle/weapon/data_battle_weapon_party.elf.zst')
})

test('reserialize data_battle_weapon_other', async () => {
    await testMatch(DataType.BattleWeaponOther, 'data/battle/weapon/data_battle_weapon_other.elf.zst')
})

test('reserialize data_battle_weapon_enemy', async () => {
    await testMatch(DataType.BattleWeaponEnemy, 'data/battle/weapon/data_battle_weapon_enemy.elf.zst')
})

test('reserialize data_battle_weapon_item', async () => {
    await testMatch(DataType.BattleWeaponItem, 'data/battle/weapon/data_battle_weapon_item.elf.zst')
})

test('reserialize data_battle_weapon_mario_ac', async () => {
    await testMatch(DataType.BattleWeaponAcMarioAc, 'data/battle/weapon/data_battle_weaponac_mario_ac.elf.zst')
})

test('reserialize data_battle_weapon_party_ac', async () => {
    await testMatch(DataType.BattleWeaponAcPartyAc, 'data/battle/weapon/data_battle_weaponac_party_ac.elf.zst')
})

test('reserialize data_battle_audiencekind', async () => {
    await testMatch(DataType.BattleAudienceKind, 'data/battle/audience/data_battle_audiencekind.elf.zst')
})

test('reserialize data_model_battle', async () => {
    await testMatch(DataType.DataBattleModel, 'data/model/data_model_battle.elf.zst', true)
})

test('reserialize data_model_gobj', async () => {
    await testMatch(DataType.DataGobjModel, 'data/model/data_model_gobj.elf.zst')
})

test('reserialize data_model_item', async () => {
    await testMatch(DataType.DataItemModel, 'data/model/data_model_item.elf.zst', true)
})

test('reserialize data_model_mobj', async () => {
    await testMatch(DataType.DataMobjModel, 'data/model/data_model_mobj.elf.zst', true)
})

test('reserialize data_model_npc', async () => {
    await testMatch(DataType.DataNpcModel, 'data/model/data_model_npc.elf.zst', true)
})

test('reserialize data_model_player', async () => {
    await testMatch(DataType.DataPlayerModel, 'data/model/data_model_player.elf.zst')
})

test('reserialize data_ui', async () => {
    await testMatch(DataType.DataUi, 'data/data_ui.elf.zst')
})

// Currently errors
// test('reserialize data_snd', async () => {
//     await testMatch(DataType.DataSnd, 'sound/data/data_snd.elf.zst')
// })
