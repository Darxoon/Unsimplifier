import type { ElfBinary } from "./elfBinary"
import { DataType } from "./dataType"
import { FILE_TYPES } from "./fileTypes"
import { demangle, incrementName } from "./nameMangling"
import type { Symbol } from "./types"
import { ValueUuid, VALUE_UUID } from "./valueIdentifier"

export function* enumerate<T>(arr: T[]): Generator<[T, number], void, unknown> {
	for (let i = 0; i < arr.length; i++) {
		yield [arr[i], i]
	}
}

export type Peekable<T> = Generator<T, never> & { peek: () => T | null }

export function peekable<T>(iterable: Iterable<T> | Iterator<T>): Peekable<T> {
	let iterator: Iterator<T> = iterable[globalThis.Symbol.iterator] ? iterable[globalThis.Symbol.iterator]() : iterable
	let state = iterator.next();
	
	// @ts-expect-error
	const i: Peekable<T> = (function* (initial) {
		while (!state.done) {
		const current = state.value;
		state = iterator.next();
		const arg = yield current;
		}
		return state.value;
	})()

	i.peek = () => state.done ? null : state.value;
	return i;
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
		: 'item' in obj
		? {...obj, item: cloneObject(dataType, obj.item)}
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
