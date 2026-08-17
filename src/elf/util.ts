import type { ElfBinary } from "./elfBinary"
import { DataType } from "./dataType"
import { FILE_TYPES } from "./fileTypes"
import { demangle, incrementName } from "./nameMangling"
import type { Relocation, Symbol } from "./types"
import { ValueUuid, VALUE_UUID } from "./valueIdentifier"

export function* enumerate<T>(arr: T[]): Generator<[T, number], void, unknown> {
	for (let i = 0; i < arr.length; i++) {
		yield [arr[i], i]
	}
}

export class RelocationStream {
	current: [number, Relocation] | null
	
	private relocations: [number, Relocation][]
	private relocationIndex: number
	
	constructor(relocations: [number, Relocation][]) {
		this.relocations = relocations
		this.current = this.relocations[0]
		this.relocationIndex = 1
	}
	
	clone(): RelocationStream {
		let other = new RelocationStream(this.relocations)
		other.current = this.current
		other.relocationIndex = this.relocationIndex
		return other
	}
	
	next(): [number, Relocation] | null {
		if (this.relocationIndex >= this.relocations.length) {
			let prev = this.current
			this.current = null;
			return prev
		}
		
		let prev = this.current
		this.current = this.relocations[this.relocationIndex++]
		return prev
	}
}

export function relocationStream(relocations: Map<number, Relocation>): RelocationStream {
	let relocationArr = [...relocations.entries()]
	relocationArr.sort(([offsetA], [offsetB]) => offsetA - offsetB)
	
	return new RelocationStream(relocationArr)
}

const customPrototype = Object.create(Map.prototype)

customPrototype.set = function(key, value) {
	if (key == undefined) {
		debugger
		throw new Error("Undefined not allowed in this map")
	}
	
	Map.prototype.set.call(this, ...arguments)
	return this
}

export function noUndefinedMap<T, U>(map: Map<T, U>): Map<T, U> {
	Object.setPrototypeOf(map, customPrototype)
	
	return map
}

export function duplicateObjectInBinary<T extends object>(binary: ElfBinary, dataType: DataType, containingArray: T[], obj: T, incrementId: boolean = true): T {
	function cloneObject<T>(dataType: DataType, obj: T): T {
		// deep clone self
		let clone = {...obj}
		Object.setPrototypeOf(clone, Object.getPrototypeOf(obj))
		
		clone[VALUE_UUID] = ValueUuid(`cloned ${DataType[dataType]} ${clone[FILE_TYPES[dataType].identifyingField]}`)
		
		if (incrementId && FILE_TYPES[dataType].identifyingField == "id") {
			// @ts-ignore
			clone.id = incrementName(obj.id)
		}
		
		// deep clone children
		for (const [fieldName, fieldValue] of Object.entries(obj) as [string, unknown][]) {
			const fieldType = FILE_TYPES[dataType].typedef[fieldName]
			
			if (fieldType === "symbol" || fieldType === "symbolAddr" && fieldValue != null) {
				const childDataType = FILE_TYPES[dataType].childTypes[fieldName]
				
				if (typeof fieldValue != "object" || !("symbolName" in fieldValue) || typeof fieldValue.symbolName != "string") {
					throw new Error("Cannot clone object " + fieldValue + " because it's of an invalid type")
				}
				
				let clonedChild = duplicateObjectInBinary(binary,  childDataType, null, fieldValue, false)
				
				// also duplicate symbol
				let clonedSymbol = duplicateSymbolInBinary(binary, binary.findSymbol(fieldValue.symbolName))
				
				clone[fieldName] = clonedChild
				clonedChild.symbolName = demangle(clonedSymbol.name)
			}
		}
		
		return clone
	}
	
	function cloneArray<T>(dataType: DataType, arr: T[]): T[] {
		let result = arr.map(obj => cloneObject(dataType, obj))
		console.log(result)
		return result
	}
	
	console.log('cloning', DataType[dataType], obj)
	let clone = obj instanceof Array
		? cloneArray(dataType, obj) as unknown as T
		: 'children' in obj
		? {...obj, children: cloneArray(dataType, obj.children as any[])}
		: cloneObject(dataType, obj)
			
	
	// insert clone into array
	if (containingArray) {
		let objectIndex = containingArray.indexOf(obj)
		containingArray.splice(objectIndex + 1, 0, clone)
	}
	
	return clone
}

export function duplicateSymbolInBinary(binary: ElfBinary, originalSymbol: Symbol): Symbol {
	let clonedSymbol = originalSymbol.clone()
	
	// the new symbol is given a (probably) unique name to prevent symbol name collisions, which are the root of all evil
	let clonedSymbolName = incrementName(originalSymbol.name) + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
	clonedSymbol.name = clonedSymbolName
	binary.symbolTable.push(clonedSymbol)
	
	console.log("Duplicating symbol", originalSymbol.name, "new name:", clonedSymbolName)
	
	return clonedSymbol
}

export function isAlphaNumeric(str: string): boolean {
	for (let i = 0, len = str.length; i < len; i++) {
		let code = str.charCodeAt(i);
		if (!(code > 47 && code < 58) && // numeric (0-9)
			!(code > 64 && code < 91) && // upper alpha (A-Z)
			!(code > 96 && code < 123)) { // lower alpha (a-z)
			return false;
		}
	}
	return true;
}
