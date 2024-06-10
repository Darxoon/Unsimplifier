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

export class Property<T extends PropertyType> {
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

export type Instance<T extends number> = Pick<
	UnfilteredInstance<T>, 
	{[p in keyof UnfilteredInstance<T>]: UnfilteredInstance<T>[p] extends never ? never : p}[keyof UnfilteredInstance<T>]
> & UuidTagged

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

const typedefs = {
	[DataType.Npc]: {
		__displayName: "NPC",
		
		stage: "string",
		id: "string",
		type: "string",
		position: "Vector3",
		rotationDegrees: "float",
		field_0x28: new Property("bool8", "'isInvisibleOnLoad' in TOK, possibly here too?"),
		field_0x29: new Property("bool8", "'isEnemy' in TOK, possibly here too?"),
		field_0x2a: "byte",
		field_0x2b: "byte",
		field_0x2c: "int",
		enemyEncounterId: "string",
		field_0x38: "int",
		field_0x3c: "int",
		field_0x40: new Property("string", "ID of the house the NPC is in? null if it is not in a house"),
		associatedGswf: new Property("string", "Global Saved Work Flag (GSWF)"),
		field_0x50: "bool32",
		field_0x54: "int",
		battleGroup0: "string",
		battleGroupWeight0: "int",
		field_0x64: "bool32",
		battleGroup1: "string",
		battleGroupWeight1: "int",
		field_0x74: "bool32",
		battleGroup2: "string",
		battleGroupWeight2: "int",
		field_0x84: "bool32",
		battleGroup3: "string",
		battleGroupWeight3: "int",
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
		field_0xdc: "float",
		chaseOrigin: "Vector3",
		chaseRadius: "Vector3",
		field_0xf8: "int",
		field_0xfc: "int",
		field_0x100: "int",
		field_0x104: "int",
		field_0x108: "int",
		field_0x10c: "int",
		field_0x110: "int",
		field_0x114: "int",
		field_0x118: "int",
		field_0x11c: "int",
		field_0x120: "int",
		field_0x124: "int",
		field_0x128: "string",
		field_0x130: "int",
		field_0x134: "int",
		field_0x138: "int",
		field_0x13c: "int",
		field_0x140: "string",
		field_0x148: "int",
		field_0x14c: "int",
		field_0x150: "int",
		field_0x154: "int",
		field_0x158: "int",
		field_0x15c: "int",
		field_0x160: "string",
		field_0x168: "int",
		field_0x16c: "int",
		field_0x170: "int",
		field_0x174: "int",
		field_0x178: "int",
		field_0x17c: "int",
	},
	[DataType.Item]: {
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
	}
} as const


function mapObject<A, B>(obj: {[key: string]: A}, fn: (value: [string, A], index: number) => [string, B]): {[key: string]: B} {
	return Object.fromEntries(Object.entries(obj).map(fn))
}
function filterObject<A>(obj: {[key: string]: A}, fn: (value: [string, A], index: number) => boolean): {[key: string]: A} {
	return Object.fromEntries(Object.entries(obj).filter(fn))
}

interface FileTypeRegistry {
	typedef: Typedef<PropertyType>
	metadata: Typedef<Property<PropertyType>>
	fieldOffsets: Typedef<string | number>
	size: number
	displayName: string
	getDynamicDisplayName: (obj: any) => string
	childTypes: {[fieldName: string]: DataType}
	childFieldLabel: string
	childField: string
	identifyingField: string
	countSymbol: string
	nestedAllValues: boolean
	objectType: DataDivision
	entryPoints: {[objectType: number]: any}
	
	instantiate(): object
}

// @ts-ignore
export const FILE_TYPES = mapObject(typedefs, ([dataTypeString, typedef]) => [dataTypeString, generateTypedefFor(parseInt(dataTypeString), typedef, typedef)])


function generateTypedefFor<T extends PropertyType>(dataType: DataType, typedef: Typedef<T | Property<T>>, 
	extendedTypedef: Typedef<any>): FileTypeRegistry {
	
	if (typedef.__parent) {
		return generateTypedefFor(dataType, extendedTypedef.__parent as Typedef<T|Property<T>>, extendedTypedef)
	}
	
	
	let filteredTypedef = filterObject(typedef, ([fieldName]) => !fieldName.startsWith("__"))
	
	const displayName = extendedTypedef.__displayName as string ?? DataType[dataType]
	
	let typedefWithoutMetadata = mapObject(filteredTypedef, ([fieldName, definition]) => [
		fieldName,
		definition instanceof Property ? definition.type : definition,
	])
	
	let unfilteredMetadata = mapObject(filteredTypedef, ([fieldName, definition]) => {
		let description: string | undefined = defaultDescriptions[fieldName]
			?.replaceAll("{type}", displayName)
			?.replaceAll("{type_lowercase}", displayName.toLowerCase())
		
		if (definition instanceof Property && definition.description) {
			definition.description = definition.description?.replaceAll("{standard}", description)
			return [fieldName, definition]
		}
		
		if (!description)
			return [fieldName, definition]
	
		if (typeof definition === 'string')
			return [fieldName, new Property(definition, description)]
		else {
			definition.description = description
			return [fieldName, definition]
		}
	})
	
	
	const { fieldOffsets, size } = generateOffsets(filteredTypedef)
	
	return {
		typedef: typedefWithoutMetadata,
				
		metadata: filterObject(unfilteredMetadata, ([, definition]) => definition instanceof Property) as Typedef<Property<T>>,
				
		fieldOffsets,
		size,
		
		displayName,
		getDynamicDisplayName: extendedTypedef.__dynamicDisplayName ?? (() => displayName),
		
		// @ts-ignore
		childTypes: extendedTypedef.__childTypes as {[fieldName: string]: DataType} ?? {},
		
		childField: extendedTypedef.__childField as string | undefined,
		
		childFieldLabel: extendedTypedef.__childFieldLabel as string | undefined,
		
		identifyingField: extendedTypedef.__importantField as string ?? "id",
		
		countSymbol: extendedTypedef.__countSymbol as string | undefined,
		
		nestedAllValues: extendedTypedef.__nestedAllValues as boolean ?? false,
		objectType: extendedTypedef.__objectType ?? dataDivisions.main,
		
		entryPoints: extendedTypedef.__entryPoints ?? {},
		
		instantiate(): object {
			let result = {}
			result[VALUE_UUID] = ValueUuid()
			for (const [fieldName, type] of Object.entries(filteredTypedef)) {
				let typeString = type instanceof Property ? type.type : type as string
				result[fieldName] = typeString === "string" || typeString === "symbol"
					? null
					: typeString === "Vector3"
						? Vector3.ZERO
						: typeString === "pointer"
							? Pointer.NULL
							: typeString.startsWith("bool")
								? false
								: 0
			}
			return result
		},
	}
}

		
function generateOffsets(typedef: object) {
	let result = {}
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
			// @ts-ignore
		}[typeof fieldType === 'object' ? fieldType.type : fieldType]
		
		if (isNaN(offset)) {
			throw new Error(`Field Offset is NaN, field name: ${fieldName}, field type: ${fieldType}`)
		}
	}

	return { fieldOffsets: result as Typedef<string | number>, size: offset }
}
