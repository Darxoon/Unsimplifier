import { demangle } from "./nameMangling"
import type { Section, Symbol } from "./types"

/**
 * An ELF file
 */
export class ElfBinary {
	sections: Section[]
	data: {[division in DataDivision]?: any[]}
	symbolTable: Symbol[]
	
	constructor(
		sections: Section[], 
		data: {[division in DataDivision]?: any[]}, 
		symbolTable: Symbol[], 
	) {
		this.sections = sections
		this.data = data
		this.symbolTable = symbolTable
	}
	
	public findSection(name: string): Section {
		return this.sections.find(section => section.name == name)
	}
	
	public findSectionIndex(name: string): number {
		return this.sections.findIndex(section => section.name == name)
	}
	
	public findSymbol(name: string): Symbol {
		return this.symbolTable.find(symbol => symbol.name === name)
	}
	
	public findSymbolIndex(name: string): number {
		return this.symbolTable.findIndex(symbol => symbol.name === name)
	}
}

export const dataDivisions = {
	main: "main",
} as const

export type DataDivision = keyof typeof dataDivisions

export class Pointer {
	private readonly _offset: number
	
	constructor(offset: number) {
		this._offset = offset
	}
	
	toBigInt(): bigint {
		return BigInt(this._offset)
	}
	
	equals(other: any) {
		return other instanceof Pointer && other._offset == this._offset
	}
	
	toString() {
		return this.equals(Pointer.NULL) ? "$null" : `$0x${this._offset.toString(16)}`
	}
	
	get value(): number {
		return this._offset
	}
	
	static fromString(str: string): Pointer | undefined {
		const matches = str.match(/^pointer->((0x)?[\da-fA-F]+)$/)
		
		if (matches === null)
			console.warn(`Matches are null, str ${JSON.stringify(str)}`)
		
		return matches && matches[1] ? new Pointer(parseInt(matches[1])) : undefined
	}
 	
	static NULL: Pointer = new Pointer(Number.MAX_VALUE)
	static ZERO: Pointer = new Pointer(0)
}

