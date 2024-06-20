import { dataDivisions, Pointer, type DataDivision } from "./elfBinary";
import { DataType } from "./dataType";
import { Vector3 } from "./misc";
import { ValueUuid, VALUE_UUID, type UuidTagged } from "./valueIdentifier";

export type Typedef<T> = {[fieldName: string]: T}

const scriptDisclaimer = "To find the function's location, you can use \
[all_functions.json](https://gist.github.com/Darxoon/16bb8777d7f2f8dbef0f2516b8ddce65)."

export interface PropertyOptions {
	hidden?: boolean
	tabName?: string
	noSpaces?: boolean
}

export type PropertyType = "string" | "symbol" | "Vector3" | "float"
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
	: T extends "pointer" ? any
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
	dynamicDisplayName?: (obj: any) => string
	identifyingField?: string
	dataDivision?: DataDivision
	
	// for future sub-types
	// childTypes
	// childField
	// childFieldLabel
	// countSymbol
	// entryPoints
	// nestedAllValues
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
		field_0x118: "int",
		field_0x11c: "int",
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
		field_0x40: "int",
		field_0x44: "int",
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
		field_0x54: "float",
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
		field_0xbc: "float",
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
		field_0xf8: "int",
		field_0xfc: "int",
		field_0x100: "int",
		field_0x104: "int",
		field_0x108: "int",
		field_0x10c: "int",
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
		field_0x40: "int",
		field_0x44: "int",
		field_0x48: "int",
		field_0x4c: "int",
	},
	[DataType.MapId]: {
		__: {
			displayName: "Map",
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
	getDynamicDisplayName: (obj: any) => string
	identifyingField: string
	dataDivision: DataDivision
	
	// for future sub-types
	childTypes?: Typedef<DataType>
	childFieldLabel?: string
	childField?: string
	countSymbol?: string
	nestedAllValues?: boolean
	entryPoints?: {[objectType: number]: any}
	
	instantiate(): object
}

console.time('generating FILE_TYPES')

// @ts-ignore
export const FILE_TYPES = mapObject(typedefs, ([dataTypeString, typedef]) => [dataTypeString, generateTypedefFor(typedef)])

console.timeEnd('generating FILE_TYPES')

function generateTypedefFor(typedef: TypeDefinition): FileTypeRegistry {
	let metadata: DataTypeMetadata = {...typedef.__}
	
	while (metadata.parent) {
		let parent = typedefs[metadata.parent]
		delete metadata.parent
		typedef = {...parent, ...typedef}
		metadata = {...parent.__, ...metadata}
	}
	
	const { displayName, dynamicDisplayName, dataDivision, identifyingField } = metadata
	
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
		let description = (property.description ?? defaultDescriptions[fieldName])
			?.replaceAll("{type}", displayName)
			?.replaceAll("{type_lowercase}", displayName?.toLowerCase())
		
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
		getDynamicDisplayName: dynamicDisplayName ?? (() => displayName),
		identifyingField: identifyingField ?? "id",
		dataDivision: dataDivision ?? dataDivisions.main,
		
		// for future sub-types
		// childTypes: typedef.__childTypes as {[fieldName: string]: DataType} ?? {},
		// childField: typedef.__childField as string | undefined,
		// childFieldLabel: typedef.__childFieldLabel as string | undefined,
		// countSymbol: typedef.__countSymbol as string | undefined,
		// nestedAllValues: typedef.__nestedAllValues as boolean ?? false,
		// entryPoints: typedef.__entryPoints ?? {},
		
		instantiate(): object {
			let result = {}
			result[VALUE_UUID] = ValueUuid()
			
			for (const [fieldName, type] of Object.entries(fieldTypes)) {
				result[fieldName] = type === "string" || type === "symbol"
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
