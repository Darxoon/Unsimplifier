import BoyerMoore from "./boyermoore"
import { Pointer } from "./elfBinary"
import { BinaryReader, BinaryWriter } from "./misc"
import { demangle, followsManglingRules, mangleIdentifier } from "./nameMangling"

/**
 * Sections are a fundamental part of ELF binaries.
 * They each have a name and a content, which is an arbitrary data block.
 * Every section has a unique purpose, but most of these depend on the purpose of the binary.
 * 
 * Examples include: `.text` (contains assembly instructions), `.data` (data specific to the indidual file),
 *                   `.symtab` (symbol table), among others
 */
export class Section {
	namePointer: Pointer
	name: string
	type: number
	flags: number
	addr: number
	offset: number
	size: number
	link: number
	info: number
	addrAlign: number
	entSize: number
	
	content: ArrayBuffer
	reader: BinaryReader
	
	constructor(reader: BinaryReader) {
		this.namePointer = new Pointer(reader.readInt32())
        this.name = null
		this.type = reader.readInt32()
		this.flags = Number(reader.readBigInt64())
		this.addr = Number(reader.readBigInt64())
		this.offset = Number(reader.readBigInt64())
		this.size = Number(reader.readBigInt64())
		this.link = reader.readInt32()
		this.info = reader.readInt32()
		this.addrAlign = Number(reader.readBigInt64())
		this.entSize = Number(reader.readBigInt64())

		this.content = null
		this.reader = null
	}
	
	getStringAt(offset: Pointer): string {
		if (offset == Pointer.NULL)
			return null
		
		const view = new DataView(this.content)
			
		// find zero terminator
		let endPosition = offset.value
		while (view.getUint8(endPosition) != 0)
			endPosition += 1
			
		return new TextDecoder('utf-8').decode(this.content.slice(offset.value, endPosition))
	}
	
	writeHeaderToBinaryWriter(writer: BinaryWriter) {
		writer.writeInt32(this.namePointer.value)
		writer.writeUint32(this.type)
		writer.writeBigInt64(BigInt(this.flags))
		writer.writeBigInt64(BigInt(this.addr))
		writer.writeBigInt64(BigInt(this.offset))
		writer.writeBigInt64(BigInt(this.size))
		writer.writeInt32(this.link)
		writer.writeInt32(this.info)
		writer.writeBigInt64(BigInt(this.addrAlign))
		writer.writeBigInt64(BigInt(this.entSize))
		
		let writer2 = new BinaryWriter()
		writer2.writeUint32(this.type)
		return new Uint8Array(writer2.toArrayBuffer())
	}
	
	appendString(str: string): void {
		let writer = new BinaryWriter(true, this.content)
		writer.writeString(str, true)
		this.content = writer.toArrayBuffer()
		this.size = this.content.byteLength
	}
}

export class Relocation {
	locationOffset: Pointer
	infoLow: number
	infoHigh: number
	targetOffset: Pointer
	
	constructor(locationOffset: Pointer, infoLow: number, infoHigh: number, targetOffset: Pointer) {
		this.locationOffset = locationOffset
		this.infoLow = infoLow
		this.infoHigh = infoHigh
		this.targetOffset = targetOffset
	}
	
	static fromBinaryReader(reader: BinaryReader) {
		return new Relocation(
			new Pointer(Number(reader.readBigInt64())), 
			reader.readInt32(), 
			reader.readInt32(), 
			new Pointer(Number(reader.readBigInt64()))
		)
	}
	
	toBinaryWriter(writer: BinaryWriter) {
		writer.writeBigInt64(this.locationOffset.toBigInt())
		writer.writeInt32(this.infoLow)
		writer.writeInt32(this.infoHigh)
		writer.writeBigInt64(this.targetOffset.toBigInt())
	}
}

export class Symbol {
	name: string
	isNameMangled: boolean
	info: number
	visibility: number
	sectionHeaderIndex: number
	location: Pointer
	size: number
	
	static fromBinaryWriter(reader: BinaryReader, stringSection: Section): Symbol {
		let symbol = new Symbol()
		
		let namePointer = new Pointer(reader.readInt32())
		let rawName = stringSection.getStringAt(namePointer)
		symbol.name = demangle(rawName)
		symbol.isNameMangled = followsManglingRules(rawName)
		symbol.info = reader.readUint8()
		symbol.visibility = reader.readUint8()
		symbol.sectionHeaderIndex = reader.readInt16()
		symbol.location = new Pointer(Number(reader.readBigInt64()))
		symbol.size = Number(reader.readBigInt64())
		
		return symbol
	}
	
	toBinaryWriter(writer: BinaryWriter, stringTable: Section) {
		let name = this.isNameMangled && this.name != "" ? mangleIdentifier(this.name) : this.name
		let nameOffset: number = 0
		
		// 3 is section, whose names are referenced through
		// the section header table, so the nameOffset stays 0
		if (this.info != 3) {
			if (name != "") {
				let search = new BoyerMoore(new TextEncoder().encode(name))
				nameOffset = search.findIndex(stringTable.content)
			}
			
			if (nameOffset == -1) {
				nameOffset = stringTable.content.byteLength
				stringTable.appendString(name)
			}
		}
		
		writer.writeInt32(nameOffset)
		writer.writeUint8(this.info)
		writer.writeUint8(this.visibility)
		writer.writeInt16(this.sectionHeaderIndex)
		writer.writeBigInt64(this.location.toBigInt())
		writer.writeBigInt64(BigInt(this.size))
	}
	
	equals(other: Symbol): boolean {
		if (other == this)
			return true
		
		if (other == undefined)
			return false
		
		return this.name == other.name
			&& this.isNameMangled == other.isNameMangled
			&& this.info == other.info
			&& this.visibility == other.visibility
			&& this.sectionHeaderIndex == other.sectionHeaderIndex
			&& this.location.equals(other.location)
			&& this.size == other.size
	}
	
	clone(): Symbol {
		let clone = {...this}
		Object.setPrototypeOf(clone, Object.getPrototypeOf(this))
		return clone
	}
}
