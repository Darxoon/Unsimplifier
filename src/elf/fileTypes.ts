import { dataDivisions, Pointer, type DataDivision } from "./elfBinary";
import { DataType } from "./dataType";
import { Vector3 } from "./misc";
import { ValueUuid, VALUE_UUID, type UuidTagged, DATA_TYPE } from "./valueIdentifier";

export type Typedef<T> = {[fieldName: string]: T}

const scriptDisclaimer = "To find the function's location, you can use \
[all_functions.json](https://gist.github.com/Darxoon/16bb8777d7f2f8dbef0f2516b8ddce65)."

export interface PropertyOptions {
	hidden?: boolean
	tabName?: string
	noSpaces?: boolean
}

export type PropertyType = "string" | "symbol" | "symbolAddr" | "Vector3" | "float"
	| "double" | "byte" | "bool8" | "bool32" | "short" | "int" | "long"

const NUMBER_TYPES = ["float", "double", "byte", "short", "int", "long"]

export function isNumber(fieldType: PropertyType): boolean {
	return NUMBER_TYPES.includes(fieldType)
}

export class Property<T extends PropertyType = PropertyType> {
	type: T
	description?: string
	hidden: boolean
	tabName?: string
	noSpaces: boolean
	
	constructor(type: T, description?: string, options?: PropertyOptions) {
		this.type = type
		this.description = description
		this.hidden = options?.hidden ?? false
		this.tabName = options?.tabName
		this.noSpaces = options?.noSpaces ?? false
	}
}


type RawTypedef<T extends number> = (typeof typedefs)[T]

type StrToType<T> = 
	T extends "string" ? string
	: T extends "symbol" ? any
	: T extends "symbolAddr" ? any
	: T extends "Vector3" ? Vector3
	
	: T extends "float" ? number
	: T extends "double" ? number
	: T extends "long" ? number
	: T extends "int" ? number
	: T extends "short" ? number
	: T extends "byte" ? number
	
	: T extends "bool8" ? boolean
	: T extends "bool32" ? boolean
	
	: never

type UnfilteredInstance<T extends number> = {
	-readonly [p in keyof RawTypedef<T>]: StrToType<RawTypedef<T>[p] extends Property<infer U> ? U : RawTypedef<T>[p]>
}

type GetMetadata<T extends number> = '__' extends keyof RawTypedef<T> ? RawTypedef<T>['__'] : {}
type GetParent<T extends number> = 'parent' extends keyof GetMetadata<T>
	? GetMetadata<T>['parent'] extends number ? UnfilteredInstance<GetMetadata<T>['parent']>
	: undefined
	: undefined

type RemoveNever<T> = Pick<T, {[p in keyof T]: T[p] extends never ? never : p}[keyof T]>

export type Instance<T extends number> = (GetParent<T> extends undefined
	? RemoveNever<UnfilteredInstance<T>>
	: RemoveNever<GetParent<T> & UnfilteredInstance<T>>
) & UuidTagged
// this is fine :)

const defaultDescriptions: Typedef<string> = {
	stage: "The stage that the {type} is on. It's the same for every {type} in the same file.",
	id: "The unique ID of the {type}, which can be used to identify it.",
	type: "The type of the {type}, which is a reference to data_{type_lowercase}.elf.",
	rotationDegrees: "The rotation in degrees around the {type}'s Y axis.",
	rotation: "The rotation euler angles in degrees. The X coordinate is the rotation in degrees around the {type}'s X axis, etc.",
	assetGroups: `
A list of all asset groups of this Model. 
An Asset Group is a group of related files all sharing the same name and directory
but having different file extensions.`,
	states: `
A list of all states. What a 'state' is and the difference between states and sub states 
are currently not known with certainty.`,
	
}

type TypeDefinition = {
	[fieldName: string]: PropertyType | Property | DataTypeMetadata
} & { __?: DataTypeMetadata }

interface DataTypeMetadata {
	parent?: DataType
	
	displayName?: string
	identifyingField?: string
	dataDivision?: DataDivision | null
	textVars?: {[key: string]: string}
	romfsPath?: string
	
	defaultPadding?: number
	countSymbol?: string
	
	childTypes?: Typedef<DataType>,
	
	// for future sub-types
	// childField
	// childFieldLabel
}

const typedefs = {
	[DataType.Npc]: {
		__: {
			displayName: "NPC",
		},
		
		stage: "string",
		id: "string",
		type: "string",
		position: "Vector3",
		rotationDegrees: "float",
		field_0x28: new Property("bool8", "Unsure what this field is."),
		isInvisibleOnLoad: new Property("bool8", "Flag that sets an NPC as invisible until activated by scripted event."),
		isEnemy: new Property("bool8", "Flag that sets an NPC as an Enemy"),
		field_0x2b: "byte",
		field_0x2c: "int",
		enemyEncounterId: "string",
		field_0x38: "int",
		field_0x3c: "int",
		associatedHouse: new Property("string", "ID of the house the NPC is in? null if it is not in a house"),
		associatedFlag: new Property("string", "Global Saved Work Flag (GSWF) associated to this NPC, purpose?"),
		field_0x50: "bool32",
		field_0x54: "int",
		formation0Id: "string",
		formation0Weight: "int",
		field_0x64: "bool32",
		formation1Id: "string",
		formation1Weight: "int",
		field_0x74: "bool32",
		formation2Id: "string",
		formation2Weight: "int",
		field_0x84: "bool32",
		formation3Id: "string",
		formation3Weight: "int",
		field_0x94: "bool32",
		field_0x98: "int",
		field_0x9c: "int",
		field_0xa0: "int",
		field_0xa4: "int",
		field_0xa8: "int",
		field_0xac: "float",
		field_0xb0: "float",
		field_0xb4: "float",
		field_0xb8: "float",
		field_0xbc: "float",
		walkOrigin: "Vector3",
		walkRadius: "Vector3",
		field_0xd8: "float",
		field_0xdc: "int",
		chaseOrigin: "Vector3",
		chaseRadius: "Vector3",
		field_0xf8: "int",
		field_0xfc: "int",
		field_0x100: new Property("string", "References stage name again, purpose?"),
		field_0x108: "int",
		field_0x10c: "int",
		field_0x110: "int",
		field_0x114: "int",
		field_0x118: "string",
		field_0x120: "int",
		field_0x124: "int",
		initFunction: new Property("string", "Function that runs when NPC is initialized."),
		field_0x130: "int",
		field_0x134: "int",
		field_0x138: "int",
		field_0x13c: "int",
		talkFunction: new Property("string", "Function that runs when NPC is talked to."),
		field_0x148: "int",
		field_0x14c: "int",
		field_0x150: "int",
		field_0x154: "int",
		field_0x158: "int",
		field_0x15c: "int",
		tattleEntry: new Property("string", "Tattle Entry used when Goombella tattles this NPC."),
		field_0x168: "int",
		field_0x16c: "int",
		field_0x170: "int",
		field_0x174: "int",
		field_0x178: "int",
		field_0x17c: "int",
	},
	[DataType.Item]: {
		__: {
			displayName: "Item",
		},
		
		stage: "string",
		id: "string",
		type: "string",
		position: "Vector3",
		field_0x24: "int",
		field_0x28: "int",
		field_0x2c: "int",
		field_0x30: "int",
		field_0x34: "int",
		field_0x38: "string",
		associatedHouse: "string",
		field_0x48: "int",
		field_0x4c: "int",
		field_0x50: "int",
		field_0x54: "float",
		field_0x58: "int",
		field_0x5c: "int",
		field_0x60: "int",
		field_0x64: "int",
		field_0x68: "int",
		field_0x6c: "int",
		field_0x70: "int",
		field_0x74: "int",
		field_0x78: "int",
		field_0x7c: "int",
		field_0x80: "int",
		field_0x84: "int",
		field_0x88: "int",
		field_0x8c: "int",
		field_0x90: "int",
		field_0x94: "int",
	},
	[DataType.Mobj]: {
		__: {
			displayName: "Mobj",
		},
		
		stage: "string",
		id: "string",
		type: "string",
		position: "Vector3",
		rotation: "Vector3",
		field_0x30: "int",
		field_0x34: "int",
		itemObtainedFlag: "string",
		associatedHouse: "string",
		field_0x48: "int",
		field_0x4c: "int",
		field_0x50: "int",
		shadowCastIntensity: new Property("float", "The intensity of the shadow cast under this object."),
		field_0x58: "int",
		field_0x5c: "int",
		itemDrop: "string",
		field_0x68: "int",
		field_0x6c: "int",
		field_0x70: "int",
		field_0x74: "int",
		field_0x78: "int",
		field_0x7c: "int",
		field_0x80: "int",
		field_0x84: "int",
		field_0x88: "int",
		field_0x8c: "int",
		parentMobj: "string",
		parentBone: "string",
		field_0xa0: "int",
		field_0xa4: "int",
		field_0xa8: "int",
		field_0xac: "int",
		field_0xb0: "int",
		field_0xb4: "int",
		field_0xb8: "int",
		itemDropDistance: new Property("float", "Distance from object the item travels after it appears (like when items drop out of blocks)."),
		field_0xc0: new Property("string", "Something Lct-related"),
		field_0xc8: "int",
		field_0xcc: "int",
		field_0xd0: "string",
		field_0xd8: "int",
		field_0xdc: "int",
		field_0xe0: "int",
		field_0xe4: "int",
		field_0xe8: "int",
		field_0xec: "int",
		field_0xf0: "int",
		field_0xf4: "int",
		field_0xf8: "string",
		field_0x100: "int",
		field_0x104: "int",
		field_0x108: "string",
		field_0x110: "int",
		field_0x114: "int",
		initScript: "string",
		field_0x120: "string",
		interactScript: "string",
		field_0x130: "string",
		damageScript: "string",
		field_0x140: new Property("string", "Script function; seems to be used for flurrie blowing and spring jumps?"),
		field_0x148: "int",
		field_0x14c: "int",
		field_0x150: "int",
		field_0x154: "int",
	},
	[DataType.Aobj]: {
		__: {
			displayName: "Aobj",
			// same as Mobj
			parent: DataType.Mobj,
		}
	},
	[DataType.Bshape]: {
		__: {
			displayName: "Bshape",
		},
		
		stage: "string",
		id: "string",
		position: "Vector3",
		rotation: "Vector3",
		field_0x28: "int",
		cubeSize: "Vector3",
		field_0x38: "int",
		field_0x3c: "int",
		associatedHouse: "string",
		field_0x48: "int",
		field_0x4c: "int",
	},
	[DataType.GobjRes]: {
		__: {
			displayName: "GobjRes",
		},

		stage: "string",
		id: "string",
		field_0x10: "int",
		field_0x14: "int",
	},
	[DataType.Effect]: {
		__: {
			displayName: "Effect",
		},

		stage: "string",
		id: "string",
		type: "string",
		field_0x18: "Vector3",
		field_0x24: "int",
		field_0x28: "int",
		field_0x2c: "int",
		field_0x30: "float",
		field_0x34: "int",
		locationBone: new Property("string", "Bone on a map skeleton this effect is tied to."),
		field_0x40: "int",
		field_0x44: "int",
		field_0x48: "int",
		field_0x4c: "int",
	},
	[DataType.MapParam]: {
		__: {
			displayName: "Map Param",
			
			countSymbol: "wld::fld::data::kNum",
			defaultPadding: 1,
		},

		id: "string",
		link: "string",
	},
	[DataType.MapId]: {
		__: {
			displayName: "Map",
			romfsPath: "data/map/MapId.elf.zst",
			
			countSymbol: "wld::fld::data::kNum",
			defaultPadding: 1,
		},
		
		id: "string",
		field_0x8: "string",
		field_0x10: new Property("string", "Always the exact same as `id`"),
		groupName: "string",
		battleStage: "string",
		assetDirectory: new Property("string", "Directory inside romfs that contains this map's asset group"),
		assetName: new Property("string", `
File name of all asset files for this map.

For example, for the asset name 'gor_01', this field would reference:
 * <assetDir>/gor_01.bfres.zst
 * <assetDir>/gor_01.cam.zst
 * <assetDir>/gor_01.csb.zst
 * etc.`),
		field_0x38: "string",
		field_0x40: "int",
		field_0x44: "int",
		scriptLocation: new Property("string", "Path to script file relative to `romfs/script/wld/fld/map/`"),
		field_0x50: "string",
		field_0x58: "int",
		field_0x5c: "int",
		linkNumber: new Property("int", `
Two maps are linked together if they have the same number and aren't if they do not,
although this check will be skipped and the group name will be compared instead
if this number is 0.

Used for the loading of new maps (?)`),
		field_0x64: "int",
		field_0x68: new Property("string", `Either has the value null or "グループ" (english: group)`),
		field_0x70: "int",
		field_0x74: "int",
		field_0x78: "int",
		field_0x7c: "int",
		field_0x80: new Property("string", "Only used by the first 5 out of 6 `jon` maps and points ot `jon_00` there"),
		field_0x88: new Property("string", "Only used by the first 5 out of 6 `jon` maps and points ot `jon_00` there"),
		field_0x90: new Property("string", "Only used by the first 5 out of 6 `jon` maps and points ot `jon_00` there"),
	},
	[DataType.ItemList]: {
		__: {
			displayName: "Item Table",
			childTypes: {
				items: DataType.ListItem,
			},
		},
		
		id: "string",
		items: new Property("symbolAddr", undefined, { tabName: "ItemTable {id}" }),
	},
	[DataType.ListItem]: {
		__: {
			displayName: "Item",
			identifyingField: "type",
			dataDivision: null,
		},
		
		type: "string",
		holdWeight: "int",
		dropWeight: "int",
	},
	[DataType.CharacterNpc]: {
		__: {
			displayName: "NPC Definition",
			defaultPadding: 1,
			romfsPath: "data/character/data_character_npc.elf.zst",
			textVars: {
				model: 'data_model_npc'
			},
		},
		
		id: "string",
		model: new Property("string", "Referencing models in 'data/model/{model}.elf.zst'"),
		field_0x10: "int",
		field_0x14: "int",
		field_0x18: "int",
		field_0x1c: "int",
		// TODO: add examples of functions in the instance script file
		scriptFileName: "string",
		scriptNamespace: new Property("string", `
The AngelScript namespace for the common instance functions inside the Script File (see Script File Name).`),
		field_0x30: "int",
		field_0x34: "int",
		field_0x38: "int",
		field_0x3c: "int",
		field_0x40: "int",
		field_0x44: "int",
		field_0x48: "int",
		field_0x4c: "int",
		field_0x50: "int",
		field_0x54: "int",
		field_0x58: "int",
		field_0x5c: "int",
		field_0x60: "string",
		field_0x68: "int",
		field_0x6c: "int",
		landingSfx: new Property("string", `
The sfx played when a character lands.`),
		jumpedOnSfx: new Property("string", `
The sfx played when a character is jumped on.`),
		hammerSfx: new Property("string", `
The sfx played when a character is hit with a hammer.`),
		jumpSfx: new Property("string", `
The sfx played when a character jumps.`),
		field_0x90: "string",
		hurtSfx: new Property("string", `
The sfx played when a character is hurt.`),
		talkSfx: new Property("string", `
The sfx played when a character talks.`),
		field_0xa8: "int",
		field_0xac: "int",
		field_0xb0: "int",
		field_0xb4: "int",
		field_0xb8: "int",
		field_0xbc: "int",
		field_0xc0: "int",
		field_0xc4: "int",
		field_0xc8: "int",
		field_0xcc: "int",
		walkingEffect: new Property("string", `
The effect emitter set used when the character walks.`),
		landingEffect: new Property("string", `
The effect emitter set used when the character lands from a jump.`),
		field_0xe0: "string",
		field_0xe8: "int",
		field_0xec: "int",
		field_0xf0: "int",
		field_0xf4: "int",
		field_0xf8: "int",
		field_0xfc: "int",
		field_0x100: "int",
		field_0x104: "int",
	},
	[DataType.CharacterMobj]: {
		__: {
			displayName: "Mobj Definition",
			romfsPath: "data/character/data_character_mobj.elf.zst",
			defaultPadding: 1,
		},
		
		id: "string",
		field_0x8: "string",
		model: new Property("string", "Referencing models in 'data/model/data_model_mobj.elf.zst'"),
		field_0x18: "int",
		field_0x1c: "int",
		field_0x20: "int",
		field_0x24: "int",
		field_0x28: "int",
		field_0x2c: "int",
		field_0x30: "int",
		field_0x34: "int",
		field_0x38: "int",
		field_0x3c: "int",
		field_0x40: "int",
		field_0x44: "int",
		field_0x48: "int",
		field_0x4c: "int",
		scriptFileName: new Property("string", `
The name of the mobj's script file, relative to \`romfs/script/wld/fld/mobj/\``),
		initScript: new Property("string", "The script function for initializing the individual Mobj instance."),
		mainScript: new Property("string", "A script function (?)"),
		actionScript: new Property("string", "The script function for interacting with the Mobj."),
		field_0x70: "int",
		field_0x74: "int",
		field_0x78: "int",
		field_0x7c: "int",
		field_0x80: "int",
		field_0x84: "int",
		field_0x88: "int",
		field_0x8c: "int",
		field_0x90: "string",
		field_0x98: "int",
		field_0x9c: "int",
		field_0xa0: "int",
		field_0xa4: "int",
	},
	[DataType.CharacterParty]: {
		__: {
			displayName: "Party Member",
			defaultPadding: 1,
			romfsPath: "data/character/data_character_party.elf.zst",
		},
		
		id: "string",
		model: new Property("string", "The Model ID this character uses. From data_model_npc.elf."),
		field_0x10: "int",
		field_0x14: "int",
		field_0x18: "int",
		field_0x1c: "int",
		field_0x20: "int",
		field_0x24: "int",
		instanceScriptFilename: new Property("string", "The filename of the instance script located in romfs\script\wld\fld\party."),
		instanceScriptNamespace: new Property("string", `
The namespace for the common instance functions of the NPC.
Appears to only apply to the file name given above.`),
		field_0x38: "bool32",
		field_0x3c: "int",
		landingSFX: new Property("string", "The SFX that plays when the character lands."),
		jumpedOnSFX: new Property("string", "The SFX that plays when the character is jumped on."),
		field_0x50: "string",
		hammerHitSFX: new Property("string", "The SFX that plays when the character is hit by the hammer."),
		field_0x60: "int",
		field_0x64: "int",
		talkSFX: new Property("string", "The SFX that plays when the character is talking."),
		field_0x70: "int",
		field_0x74: "int",
		field_0x78: "int",
		field_0x7c: "int",
		field_0x80: "int",
		field_0x84: "int",
		walkingGFX: new Property("string", "The GFX that plays when the character is walking."),
		landingGFX: new Property("string", "The GFX that plays when the character lands."),
		inGFX: new Property("string", "The GFX that plays when the character gets in something."),
		outGFX: new Property("string", "The GFX that plays when the character gets out of something."),
		loopingGFX: new Property("string", "The GFX that plays when the character is waiting in something."),
		loopEndGFX: new Property("string", "The GFX that plays when the looping GFX ends."),
	},
	[DataType.CharacterItem]: {
		__: {
			displayName: "Item Definition",
			defaultPadding: 1,
			romfsPath: "data/character/data_character_item.elf.zst",
		},
		
		id: "string",
		description: "string",
		itemType: new Property("int", `
Specifies the type of the item. Possible values:

* 1 - Upgrade
* 2 - Literal key (?)
* 3 - Key item
* 4 - Crystal star
* 5 - Hearts, flowers, coins, etc.
* 6, 7 - ?
* 8 - Normal item (battle only)
* 9, 10, 11 - Normal item
* 12 - ?
* 13 to 18 - Badge
* 19 - ?
`),
		field_0x14: "int",
		field_0x18: "string",
		field_0x20: "string",
		field_0x28: "string",
		field_0x30: "string",
		field_0x38: "string",
		field_0x40: "short",
		field_0x42: "short",
		field_0x44: "short",
		field_0x46: "short",
		field_0x48: "short",
		usableInField: "bool8",
		usableInBattle: "bool8",
		field_0x4c: "byte",
		bpCost: "byte",
		hpRestored: "byte",
		fpRestored: "byte",
		field_0x50: "int",
		field_0x54: "int",
		field_0x58: "string",
		field_0x60: "string",
		field_0x68: "string",
		field_0x70: "string",
		field_0x78: "string",
		field_0x80: "string",
		field_0x88: "string",
		field_0x90: "string",
		field_0x98: "int",
		field_0x9c: "int",
	},
	[DataType.CharacterAobj]: {
		__: {
			parent: DataType.CharacterMobj,
			displayName: "Aobj Definition",
			romfsPath: "data/character/data_character_item.elf.zst",
		},
	},
	[DataType.ParamPartyHint]: {
		__: {
			displayName: "Party Hint Parameter",
			romfsPath: "data/param/data_param_partyhint.elf.zst",
		},

		id: "string",
		field_0x08: "string",
		field_0x10: "string",
		field_0x18: "string",
		field_0x20: "string",
		field_0x28: "int",
		field_0x2c: "int",
		field_0x30: "string",
		field_0x38: "int",
		field_0x3c: "int",
		field_0x40: "string",
		field_0x48: "string",
	},
	[DataType.ParamGobj]: {
		__: {
			displayName: "Gobj Parameters",
			romfsPath: "data/param/data_param_gobj.elf.zst",
		},

		id: "string",
		field_0x08: "float",
		field_0x0c: "float",
		field_0x10: "float",
		field_0x14: "float",
		field_0x18: "float",
		field_0x1c: "float",
		field_0x20: "float",
		field_0x24: "float",
		field_0x28: "float",
		field_0x2c: "float",
		field_0x30: "float",
		field_0x34: "int",
	},
	[DataType.ParamGobjItem]: {
		__: {
			displayName: "Gobj Item Parameters",
			romfsPath: "data/param/data_param_gobj_item.elf.zst",
		},

		id: "string",
		field_0x08: "string",
		field_0x10: "string",
		field_0x18: "string",
		field_0x20: "string",
		field_0x28: "int",
		field_0x2c: "int",
		field_0x30: "int",
		field_0x34: "int",
		field_0x38: "int",
		field_0x3c: "int",
		field_0x40: "int",
		field_0x44: "int",
	},
	[DataType.DataMinigamePaperAiper]: {
		__: {
			displayName: "Paper Minigame Aiper Parameters",
			romfsPath: "data/minigame/paper/DataMinigame_Paper_Aiper.elf.zst",
			
			countSymbol: "data::minigame::paper::kNum",
			defaultPadding: 1,
		},

		id: "string",
		field_0x08: "float",
		field_0x0c: "float",
		field_0x10: "float",
		field_0x14: "float",
	},
	[DataType.DataMinigamePaperFan]: {
		__: {
			displayName: "Paper Minigame Fan Parameters",
			romfsPath: "data/minigame/paper/DataMinigame_Paper_Fan.elf.zst",
			
			countSymbol: "data::minigame::paper::kNum",
			defaultPadding: 1,
		},

		id: "string",
		field_0x08: "Vector3",
		field_0x14: "int",
		field_0x18: "float",
		field_0x1c: "int",
	},
	[DataType.DataMinigamePaperRunner]: {
		__: {
			displayName: "Paper Minigame Runner Parameters",
			romfsPath: "data/minigame/paper/DataMinigame_Paper_Runner.elf.zst",
			
			countSymbol: "data::minigame::paper::kNum",
			defaultPadding: 1,
		},

		id: "string",
		field_0x08: "Vector3",
		field_0x14: "float",
		field_0x18: "float",
		field_0x1c: "float",
		field_0x20: "float",
		field_0x24: "int",
	},
	[DataType.DataMinigamePaperRunnerai]: {
		__: {
			displayName: "Paper Minigame Runner Parameters",
			romfsPath: "data/minigame/paper/DataMinigame_Paper_Runnerai.elf.zst",
			
			countSymbol: "data::minigame::paper::kNum",
			defaultPadding: 1,
		},

		id: "string",
		field_0x08: "Vector3",
		field_0x14: "float",
		field_0x18: "float",
		field_0x1c: "float",
		field_0x20: "float",
		field_0x24: "float",
		field_0x28: "float",
		field_0x2c: "float",
		field_0x30: "float",
		field_0x34: "float",
		field_0x38: "float",
		field_0x3c: "float",
		field_0x40: "float",
		field_0x44: "float",
		field_0x48: "float",
		field_0x4c: "float",
		field_0x50: "int",
		field_0x54: "int",
	},
	[DataType.Monosiri]: {
		__: {
			displayName: "Tattle Log",
			romfsPath: "data/battle/data_Monosiri.elf.zst",
			
			countSymbol: "wld::btl::data::s_DataNum",
		},

		entryCount: "int",
		attackPoints: "int",
		defensePoints: "int",
		field_0x0c: "int",
		id: "string",
		battleUnitPartId: "string",
		tattleLogId: "string",
		tattleMenuDesc: "string",
		modelBattleUnitId: "string",
		modelNpcAnimState: "string",
		menuCategory: "string",
		field_0x44: "int",
		field_0x48: "int",
	},
	[DataType.Parameter]: {
		__: {
			displayName: "Battle Parameter",
			romfsPath: "data/battle/data_Parameter.elf.zst",
			
			countSymbol: "wld::btl::data::s_DataNum",
			defaultPadding: 1,
		},

		id: "string",
		value: "float",
		field_0x0c: "int",
		field_0x10: "string",
	},
	[DataType.FallObj]: {
		__: {
			displayName: "Falling Stage Object",
			romfsPath: "data/battle/data_FallObj.elf.zst",
			
			defaultPadding: 1,
		},

		id: "string",
		field_0x08: "int",
		field_0x0c: "int",
		field_0x10: "int",
		field_0x14: "int",
		field_0x18: "int",
		field_0x1c: "int",
		field_0x20: "int",
		field_0x24: "int",
		field_0x28: "int",
		field_0x2c: "int",
		field_0x30: "int",
		field_0x34: "int",
		field_0x38: "int",
		field_0x3c: "int",
		field_0x40: "int",
		field_0x44: "int",
		field_0x48: "int",
		field_0x4c: "int",
		field_0x50: "int",
		field_0x54: "int",
		field_0x58: "int",
		field_0x5c: "int",
		field_0x60: "int",
		field_0x64: "int",
		field_0x68: "int",
		field_0x6c: "int",
		field_0x70: "int",
		field_0x74: "int",
		field_0x78: "int",
		field_0x7c: "int",
		field_0x80: "int",
		field_0x84: "int",
		field_0x88: "int",
		field_0x8c: "int",
		field_0x90: "int",
		field_0x94: "int",
		field_0x98: "string",
		field_0xa0: "string",
		field_0xa8: "string",
		field_0xb0: "string",
		field_0xb8: "string",
		field_0xc0: "string",
		field_0xc8: "string",
		field_0xd0: "string",
		field_0xd8: "string",
		field_0xe0: "string",
		field_0xe8: "string",
		field_0xf0: "string",
		field_0xf8: "string",
		field_0x100: "string",
		field_0x108: "string",
		field_0x110: "string",
		field_0x118: "string",
		field_0x120: "string",
	},
	[DataType.Nozzle]: {
		__: {
			displayName: "Stage Spray Nozzle",
			romfsPath: "data/battle/data_Nozzle.elf.zst",
			
			defaultPadding: 1,
		},

		field_0x00: "int",
		field_0x04: "int",
		field_0x08: "int",
		field_0x0c: "int",
		fogSprayParty: "string",
		fogSprayEnemy: "string",
		fogSprayAll: "string",
		freezeSprayParty: "string",
		freezeSprayEnemy: "string",
		explosionSprayParty: "string",
		explosionSprayEnemy: "string",
		fireSprayParty: "string",
		fireSprayEnemy: "string",
	},
	[DataType.BattleWeaponMario]: {
		__: {
			displayName: "Player Attacks",
			romfsPath: "data/battle/weapon/data_battle_weapon_mario.elf.zst",

		},

		"id": "string",
		"weaponMsg": "string",
		"iconName": "string",
		"itemName": "string",
		"descMsg": "string",
		"baseAccuracy": "int",
		"fpCost": "int",
		"spCost": "int",
		"actionCommandBaseValue": "float",
		"stylishBaseValue": "float",
		"field_0x3c": "float",
		"field_0x40": "float",
		"field_0x44": "int",
		"bingoCardChance": "int",
		"field_0x4c": "int",
		"damageFnName": "string",
		"damageFnParams0": "long",
		"damageFnParams1": "long",
		"damageFnParams2": "long",
		"damageFnParams3": "long",
		"damageFnParams4": "long",
		"damageFnParams5": "long",
		"damageFnParams6": "string",
		"damageFnParams7": "long",
		"fpDamageFnName": "string",
		"fpDamageFnParams0": "long",
		"fpDamageFnParams1": "long",
		"fpDamageFnParams2": "long",
		"fpDamageFnParams3": "long",
		"targetClassFlags": "int",
		"targetPropertyFlags": "int",
		"element": "int",
		"damagePattern": "int",
		"superguardType": "int",
		"specialPropertyFlags": "int",
		"counterResistanceFlags": "int",
		"targetSelectionWtFlags": "int",
		"baseDifficulty": "int",
		"baseRewardLevel": "int",
		"acHelpMsg": "string",
		"field_0xf0": "string",
		"scriptName": "string",
		"field_0x100": "int",
		"field_0x104": "int",
		"field_0x108": "int",
		"field_0x10c": "int",
		"field_0x110": "int",
		"field_0x114": "int",
		"field_0x118": "int",
		"field_0x11c": "int",
		"bgBFallPWt": "int",
		"bgBFallEWt": "int",
		"bgBFallPEWt": "int",
		"bgBFallNoneWt": "int",
		"fogPWt": "int",
		"fogEWt": "int",
		"fogPEWt": "int",
		"fogNoneWt": "int",
		"nozzleTurnPWt": "int",
		"nozzleTurnEWt": "int",
		"nozzleTurnPEWt": "int",
		"nozzleTurnNoneWt": "int",
		"nozzleFirePWt": "int",
		"nozzleFireEWt": "int",
		"nozzleFirePEWt": "int",
		"nozzleFireNoneWt": "int",
		"ceilingBarFallRate": "int",
		"objectFallRate": "int",
		"field_0x168": "int",
		"sleepChance": "int",
		"sleepTime": "int",
		"stopChance": "int",
		"stopTime": "int",
		"dizzyChance": "int",
		"dizzyTime": "int",
		"poisonChance": "int",
		"poisonMinTime": "int",
		"poisonMaxTime": "int",
		"poisonStrength": "int",
		"confuseChance": "int",
		"confuseTime": "int",
		"electricChance": "int",
		"electricTime": "int",
		"dodgyChance": "int",
		"dodgyTime": "int",
		"burnChance": "int",
		"burnTime": "int",
		"freezeChance": "int",
		"freezeTime": "int",
		"sizeChangeChance": "int",
		"sizeChangeTime": "int",
		"sizeChangeStrength": "int",
		"attackChangeChance": "int",
		"attackChangeTime": "int",
		"attackChangeStrength": "int",
		"defenseChangeChance": "int",
		"defenseChangeTime": "int",
		"defenseChangeStrength": "int",
		"allergicChance": "int",
		"allergicTime": "int",
		"ohkoChance": "int",
		"chargeStrength": "int",
		"fastChance": "int",
		"fastTime": "int",
		"slowChance": "int",
		"slowTime": "int",
		"frightChance": "int",
		"galeChance": "int",
		"paybackTime": "int",
		"holdFastTime": "int",
		"invisibleChance": "int",
		"invisibleTime": "int",
		"hpRegenTime": "int",
		"hpRegenStrength": "int",
		"fpRegenTime": "int",
		"fpRegenStrength": "int",
		"field_0x228": "int",
		"field_0x22c": "int",
		"sleepCureRate": "int",
		"stopCureRate": "int",
		"dizzyCureRate": "int",
		"poisonCureRate": "int",
		"confuseCureRate": "int",
		"burnCureRate": "int",
		"freezeCureRate": "int",
		"hugeCureRate": "int",
		"tinyCureRate": "int",
		"attackUpCureRate": "int",
		"attackDownCureRate": "int",
		"defenseUpCureRate": "int",
		"defenseDownCureRate": "int",
		"allergicCureRate": "int",
		"slowCureRate": "int",
		"electricCureRate": "int",
		"earlyWakeupRate": "int",
		"field_0x274": "int",
		"field_0x278": "string",
		"field_0x280": "string",
	},
	[DataType.BattleWeaponParty]: {
		__: {
			parent: DataType.BattleWeaponMario,
			displayName: "Party Attacks",
			romfsPath: "data/battle/weapon/data_battle_weapon_party.elf.zst",
		},
	},
	[DataType.BattleWeaponOther]: {
		__: {
			parent: DataType.BattleWeaponMario,
			displayName: "Other Attacks",
			romfsPath: "data/battle/weapon/data_battle_weapon_other.elf.zst",
		},
	},
	[DataType.BattleWeaponEnemy]: {
		__: {
			parent: DataType.BattleWeaponMario,
			displayName: "Enemy Attacks",
			romfsPath: "data/battle/weapon/data_battle_weapon_enemy.elf.zst",
		},
	},
	[DataType.BattleWeaponItem]: {
		__: {
			parent: DataType.BattleWeaponMario,
			displayName: "Item Attacks",
			romfsPath: "data/battle/weapon/data_battle_weapon_item.elf.zst",
		},
	},
	[DataType.BattleWeaponAcMarioAc]: {
		__: {
			displayName: "Player Action Commands",
			romfsPath: "data/battle/weapon/data_battle_weaponac_mario_ac.elf.zst",
		},

		"id": "string",
		"frameWindow": new Property("int", `Timing window in frames the player has to make an input.`),
		"field_0x0c": "int",
		"field_0x10": "int",
		"field_0x14": "int",
		"field_0x18": "int",
		"field_0x1c": "int",
		"field_0x20": "int",
		"field_0x24": "int",
		"field_0x28": "int",
		"field_0x2c": "int",
		"field_0x30": "int",
		"field_0x34": "int",
		"field_0x38": "int",
		"field_0x3c": "int",
		"field_0x40": "int",
		"field_0x44": "int",
		"field_0x48": "int",
		"field_0x4c": "int",
		"field_0x50": "int",
		"field_0x54": "int",
		"field_0x58": "int",
		"field_0x5c": "int",
		"field_0x60": "int",
		"field_0x64": "int",
		"field_0x68": "int",
		"field_0x6c": "int",
		"field_0x70": "int",
		"field_0x74": "int",
		"field_0x78": "int",
		"field_0x7c": "int",
		"field_0x80": "int",
		"field_0x84": "int",
		"field_0x88": "int",
		"field_0x8c": "int",
		"field_0x90": "int",
		"field_0x94": "int",
		"field_0x98": "int",
		"field_0x9c": "int",
		"field_0xa0": "int",
		"field_0xa4": "int",
		"field_0xa8": "int",
		"field_0xac": "int",
		"field_0xb0": "int",
		"field_0xb4": "int",
		"field_0xb8": "int",
		"field_0xbc": "int",
		"field_0xc0": "int",
		"field_0xc4": "int",
		"field_0xc8": "int",
		"field_0xcc": "int",
		"field_0xd0": "int",
		"field_0xd4": "int",
		"field_0xd8": "int",
		"field_0xdc": "int",
		"field_0xe0": "int",
		"field_0xe4": "int",
		"field_0xe8": "int",
		"field_0xec": "int",
		"field_0xf0": "int",
		"field_0xf4": "int",
		"field_0xf8": "int",
		"field_0xfc": "int",
		"field_0x100": "int",
		"field_0x104": "int",
	},
	[DataType.BattleWeaponAcPartyAc]: {
		__: {
			parent: DataType.BattleWeaponAcMarioAc,
			displayName: "Party Action Commands",
			romfsPath: "data/battle/weapon/data_battle_weaponac_party_ac.elf.zst",
		},
	},
	[DataType.HeartParam]: {
		__: {
			displayName: "Heart-Flower Drop Param",
			romfsPath: "data/battle/data_HeartParam.elf.zst",
			
			childTypes: {
				items: DataType.HeartItem,
			},
		},

		id: "string",
		items: new Property("symbolAddr", undefined, { tabName: "ItemTable {id}" }),
	},
	[DataType.HeartItem]: {
		__: {
			displayName: "Item",
			identifyingField: "type",
			dataDivision: null,
		},

		field_0x00: "int",
		field_0x04: "int",
		field_0x08: "int",
		field_0x0c: "int",
		field_0x10: "int",
		field_0x14: "int",
		field_0x18: "int",
		field_0x1c: "int",
		field_0x20: "int",
		field_0x24: "int",
		field_0x28: "int",
		field_0x2c: "int",
		field_0x30: "int",
		field_0x34: "int",
		field_0x38: "int",
		field_0x3c: "int",
	},
	[DataType.Maplink]: {
		__: {
			displayName: "Maplink",
			dataDivision: "links",
		},
		
		stage: "string",
		id: "string",
		destinationStage: "string",
		destinationId: "string",
		field_0x20: "int",
		field_0x24: "int",
		field_0x28: "string",
		field_0x30: "string",
		field_0x38: "string",
		field_0x40: "float",
		field_0x44: "int",
		field_0x48: "int",
		field_0x4c: "int",
		field_0x50: "int",
		field_0x54: "int",
		field_0x58: "string",
		field_0x60: "int",
		field_0x64: "int",
		field_0x68: "int",
		field_0x6c: "int",
		field_0x70: "int",
		field_0x74: "int",
		field_0x78: "string",
		field_0x80: "int",
		field_0x84: "int",
		field_0x88: "int",
		field_0x8c: "int",
		field_0x90: "int",
		field_0x94: "int",
		field_0x98: "int",
		field_0x9c: "int",
		field_0xa0: "int",
		field_0xa4: "int",
		field_0xa8: "string",
		field_0xb0: "string",
		field_0xb8: "int",
		field_0xbc: "int",
		field_0xc0: "int",
		field_0xc4: "int",
	},
	[DataType.MaplinkHeader]: {
		__: {
			displayName: "Maplink Header",
		},
		
		stage: "string",
		linkAmount: new Property("int", undefined, { hidden: true }),
		field_0xc: "int",
		maplinks: new Property("symbol", undefined, { hidden: true }),
		field_0x18: "int",
		field_0x1c: "int",
		field_0x20: "int",
		field_0x24: "int",
		field_0x28: "int",
		field_0x2c: "int",
	},
} as const satisfies {[dataType: number]: TypeDefinition}


function mapObject<A, B>(obj: {[key: string]: A}, fn: (value: [string, A], index: number) => [string, B]): {[key: string]: B} {
	return Object.fromEntries(Object.entries(obj).map(fn))
}
function filterObject<A>(obj: {[key: string]: A}, fn: (value: [string, A], index: number) => boolean): {[key: string]: A} {
	return Object.fromEntries(Object.entries(obj).filter(fn))
}

interface FileTypeRegistry {
	typedef: Typedef<PropertyType>
	metadata: Typedef<Property>
	fieldOffsets: Typedef<number> & {[offset: number]: string}
	size: number
	displayName: string
	identifyingField: string
	dataDivision: DataDivision
	romfsPath: string
	defaultPadding: number
	textVars: {[key: string]: string}
	countSymbol?: string
	
	// for future sub-types
	childTypes?: Typedef<DataType>
	childFieldLabel?: string
	childField?: string
	nestedAllValues?: boolean
	entryPoints?: {[objectType: number]: any}
	
	instantiate(): object
}

console.time('generating FILE_TYPES')

// @ts-ignore
export const FILE_TYPES = mapObject(typedefs, ([dataTypeString, typedef]) => [dataTypeString, generateTypedefFor(parseInt(dataTypeString), typedef)])

console.timeEnd('generating FILE_TYPES')

function generateTypedefFor(dataType: DataType, typedef: TypeDefinition): FileTypeRegistry {
	let metadata: DataTypeMetadata = {...typedef.__}
	
	while (metadata.parent) {
		let parent = typedefs[metadata.parent]
		delete metadata.parent
		typedef = {...parent, ...typedef}
		metadata = {...parent.__, ...metadata}
	}
	
	const {
		displayName,
		dataDivision,
		identifyingField,
		romfsPath,
		childTypes,
		defaultPadding,
		countSymbol,
		textVars,
	} = metadata
	
	let fields = new Map(Object.entries(typedef).flatMap(([fieldName, fieldType]) => {
		if (fieldType instanceof Property) {
			return [[fieldName, fieldType]]
		} else if (typeof fieldType == 'string') {
			return [[fieldName, new Property(fieldType)]]
		} else {
			return []
		}
	}))
	
	let fieldTypes = Object.fromEntries(
		[...fields.entries()].map(([fieldName, property]) => [fieldName, property.type])
	)
	
	let fieldMetadata: Typedef<Property> = {}
	
	for (const [fieldName, property] of fields) {
		let description = property.description ?? defaultDescriptions[fieldName]
		
		if (description) {
			if (textVars) {
				let vars = {
					'type': displayName,
					'type_lowercase': displayName?.toLowerCase(),
					...textVars,
				}
				
				for (const [key, value] of Object.entries(vars)) {
					description = description.replaceAll('{' + key + '}', value)
				}
			} else {
				description = description
					.replaceAll("{type}", displayName)
					.replaceAll("{type_lowercase}", displayName?.toLowerCase())
			}
		}
		
		const { type, tabName, noSpaces, hidden } = property
		fieldMetadata[fieldName] = new Property(type, description, { hidden, noSpaces, tabName })
	}
	
	const { fieldOffsets, size } = generateOffsets(fieldTypes)
	
	return {
		typedef: fieldTypes,
		metadata: fieldMetadata,
				
		fieldOffsets,
		size,
		
		displayName,
		identifyingField: identifyingField ?? "id",
		dataDivision: dataDivision === null ? null : dataDivision ?? dataDivisions.main,
		textVars: textVars ?? {},
		romfsPath,
		
		defaultPadding: defaultPadding ?? 0,
		countSymbol,
		
		childTypes: childTypes ?? {},
		
		// for future sub-types
		// childField: typedef.__childField as string | undefined,
		// childFieldLabel: typedef.__childFieldLabel as string | undefined,
		// countSymbol: typedef.__countSymbol as string | undefined,
		
		instantiate(): object {
			let result = {}
			result[VALUE_UUID] = ValueUuid('instantiate()')
			result[DATA_TYPE] = dataType
			
			for (const [fieldName, type] of Object.entries(fieldTypes)) {
				result[fieldName] = type === "string" || type === "symbol" || type === "symbolAddr"
					? null
					: type === "Vector3"
						? Vector3.ZERO
						: type.startsWith("bool")
							? false
							: 0
			}
			
			return result
		},
	}
}

		
function generateOffsets(typedef: Typedef<PropertyType>) {
	let result: Typedef<number> & {[offset: number]: string} = {}
	let offset = 0
	for (const [fieldName, fieldType] of Object.entries(typedef)) {
		result[fieldName] = offset
		result[offset] = fieldName
		offset += {
			string: 8,
			symbol: 8,
			symbolAddr: 8,
			pointer: 8,
			Vector3: 12,
			float: 4,
			double: 8,
			byte: 1,
			bool8: 1,
			short: 2,
			int: 4,
			long: 8,
			bool32: 4,
		}[fieldType]
		
		if (isNaN(offset)) {
			throw new Error(`Field Offset is NaN, field name: ${fieldName}, field type: ${fieldType}`)
		}
	}

	return { fieldOffsets: result, size: offset }
}
