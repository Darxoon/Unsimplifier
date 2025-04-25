export class Vector3 {
	private readonly _x: number
	private readonly _y: number
	private readonly _z: number
	
	constructor(x: number, y: number, z: number) {
		this._x = x
		this._y = y
		this._z = z
	}
	
	toString(): string {
		return `Vector3(${this._x}, ${this._y}, ${this._z})`
	}
	
	equals(other: any) {
		return other instanceof Vector3 && this._x === other._x && this._y === other._y && this._z === other._z
	}
	
	get x() {
		return this._x
	}
	
	get y() {
		return this._y
	}
	
	get z() {
		return this._z
	}
	
	static ZERO = new Vector3(0, 0, 0)
}

export class BinaryReader {
	arrayBuffer: ArrayBuffer
	dataView: DataView
	position: number
	littleEndian: boolean
	
	constructor(buffer: ArrayBuffer | DataView | Uint8Array, initialPosition = 0, littleEndian: boolean = true) {
		if (buffer instanceof ArrayBuffer) {
			this.arrayBuffer = buffer
			this.dataView = new DataView(buffer)
		} else if (buffer instanceof DataView) {
			if (!(buffer.buffer instanceof ArrayBuffer))
				throw new Error("DataView has to be backed by an ArrayBuffer")
			
			this.arrayBuffer = buffer.buffer
			this.dataView = buffer
		} else if (buffer instanceof Uint8Array) {
			if (!(buffer.buffer instanceof ArrayBuffer))
				throw new Error("Uint8Array has to be backed by an ArrayBuffer")
			
			this.arrayBuffer = buffer.buffer
			this.dataView = new DataView(buffer.buffer)
		}
		
		this.littleEndian = littleEndian
		this.position = initialPosition
	}
	
	seek(position: number) {
		this.position = position
	}
	
	alignTo(alignment: number) {
		this.position += ((alignment - this.position) % alignment + alignment) % alignment
	}
	
	readFloat32(): number {
		let value = this.dataView.getFloat32(this.position, this.littleEndian)
		this.position += 4
		return value
	}
	
    readFloat64(): number {
		let value = this.dataView.getFloat64(this.position, this.littleEndian)
		this.position += 8
		return value
	}
	
    readInt8(): number {
		let value = this.dataView.getInt8(this.position)
		this.position += 1
		return value
	}
	
    readInt16(): number {
		let value = this.dataView.getInt16(this.position, this.littleEndian)
		this.position += 2
		return value
	}
	
    readInt32(): number {
		let value = this.dataView.getInt32(this.position, this.littleEndian)
		this.position += 4
		return value
	}
	
    readUint8(): number {
		let value = this.dataView.getUint8(this.position)
		this.position += 1
		return value
	}
	
    readUint16(): number {
		let value = this.dataView.getUint16(this.position, this.littleEndian)
		this.position += 2
		return value
	}
	
    readUint32(): number {
		let value = this.dataView.getUint32(this.position, this.littleEndian)
		this.position += 4
		return value
	}
	
    readBigInt64(): bigint {
		let value = this.dataView.getBigInt64(this.position, this.littleEndian)
		this.position += 8
		return value
	}
	
    readBigUint64(): bigint {
		let value = this.dataView.getBigUint64(this.position, this.littleEndian)
		this.position += 8
		return value
	}
	
    // writeFloat32(value: number): void;
    // writeFloat64(value: number): void;
    // writeInt8(value: number): void;
    // writeInt16(value: number): void;
    // writeInt32(value: number): void;
    // writeUint8(value: number): void;
    // writeUint16(value: number): void;
    // writeUint32(value: number): void;
}

const MIN_CAPACITY = 2048

export class BinaryWriter {
	private arrayBuffer: ArrayBuffer
	private dataView: DataView
	
	size: number
	
	littleEndian: boolean
	
	constructor(littleEndian: boolean = true, buffer?: ArrayBuffer | DataView | Uint8Array) {
		this.size = buffer ? buffer.byteLength : 0
		this.littleEndian = littleEndian
		
		buffer = buffer ?? new ArrayBuffer(MIN_CAPACITY)
		
		if (buffer instanceof ArrayBuffer) {
			this.arrayBuffer = buffer
			this.dataView = new DataView(buffer)
		} else if (buffer instanceof DataView) {
			if (!(buffer.buffer instanceof ArrayBuffer))
				throw new Error("DataView has to be backed by an ArrayBuffer")
			
			this.arrayBuffer = buffer.buffer
			this.dataView = buffer
		} else if (buffer instanceof Uint8Array) {
			if (!(buffer.buffer instanceof ArrayBuffer))
				throw new Error("Uint8Array has to be backed by an ArrayBuffer")
			
			this.arrayBuffer = buffer.buffer
			this.dataView = new DataView(buffer.buffer)
		}
	}
	
	get capacity(): number {
		return this.dataView.byteLength
	}
	
	alignTo(alignment: number) {
		this.size += ((alignment - this.size) % alignment + alignment) % alignment
		
		if (this.size >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
	}
	
	toArrayBuffer(): ArrayBuffer {
		return this.arrayBuffer.slice(0, this.size)
	}
	
	toDataView(): DataView {
		return new DataView(this.toArrayBuffer())
	}
	
	reserve(capacity: number) {
		if (this.dataView.byteLength < capacity) {
			let buffer = new ArrayBuffer(capacity)
			let arr = new Uint8Array(buffer)
			
			// copy old content
			arr.set(new Uint8Array(this.arrayBuffer))
			
			this.arrayBuffer = buffer
			this.dataView = new DataView(buffer)
		}
	}
	
	writeFloat32(value: number): void {
		if (this.size + 4 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setFloat32(this.size, value, this.littleEndian)
		this.size += 4
	}
	
	writeFloat64(value: number): void {
		if (this.size + 8 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setFloat64(this.size, value, this.littleEndian)
		this.size += 8
	}
	
	writeInt8(value: number): void {
		if (this.size + 1 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setInt8(this.size, value)
		this.size += 1
	}
	
	writeInt16(value: number): void {
		if (this.size + 2 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setInt16(this.size, value, this.littleEndian)
		this.size += 2
	}
	
	writeInt32(value: number): void {
		if (this.size + 4 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setInt32(this.size, value, this.littleEndian)
		this.size += 4
	}
	
	writeUint8(value: number): void {
		if (this.size + 1 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setUint8(this.size, value)
		this.size += 1
	}
	
	writeUint16(value: number): void {
		if (this.size + 2 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setUint16(this.size, value, this.littleEndian)
		this.size += 2
	}
	
	writeUint32(value: number): void {
		if (this.size + 4 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setUint32(this.size, value, this.littleEndian)
		this.size += 4
	}
	
	writeBigInt64(value: bigint): void {
		if (this.size + 8 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setBigInt64(this.size, value, this.littleEndian)
		this.size += 8
	}
	
	writeBigUint64(value: bigint): void {
		if (this.size + 8 >= this.capacity) {
			this.reserve(this.capacity * 2)
		}
		
		this.dataView.setBigUint64(this.size, value, this.littleEndian)
		this.size += 8
	}
	
	writeString(str: string, nullTerminated: boolean = true) {
		if (nullTerminated)
			str += '\0'
		
		let bytes = new TextEncoder().encode(str)
		
		// str.length can't be used because unicode messes with the byte length
		if (this.size + bytes.length >= this.capacity) {
			this.reserve(Math.max(this.capacity * 2, bytes.length))
		}
		
		const arr = new Uint8Array(this.arrayBuffer)
		
		arr.set(bytes, this.size)
		this.size += bytes.length
	}
	
	writeArrayBuffer(arrayBuffer: ArrayBuffer | Uint8Array) {
		if (this.size + arrayBuffer.byteLength >= this.capacity) {
			this.reserve(Math.max(this.capacity * 2, this.size + arrayBuffer.byteLength))
		}
		
		const sourceArr = new Uint8Array(this.arrayBuffer)
		const newArr = new Uint8Array(arrayBuffer)
		
		sourceArr.set(newArr, this.size)
		this.size += newArr.byteLength
	}
	
	writeUint8Array(array: Uint8Array | number[]) {
		if (array instanceof Array)
			array = new Uint8Array(array)
		if (!(array.buffer instanceof ArrayBuffer))
			throw new Error("Uint8Array has to be backed by an ArrayBuffer")
		
		this.writeArrayBuffer(array.buffer)
	}
}
