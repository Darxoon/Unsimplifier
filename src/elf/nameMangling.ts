
/**
 * Mangles a valid C++ Identifier according to Clang's name mangling rules.
 * Internal linakge symbols (indicated by an `L` in the mangled name)
 * are represented with a `^` symbol in the demangled name, like this:
 * `wld::fld::data::^ModelID_Bone_state` (mangled name: _ZN3wld3fld4data**L**18ModelID_Bone_stateE, L is for internal linkage)
 * @param id The identifier to mangle. Segments are seperated by ::
 * @example "wld::fld::data::s_npcData" will be transformed into "_ZN3wld3fld4data9s_npcDataE"
 */
export function mangleIdentifier(id: string): string {
	if (id.includes(' '))
		throw new Error(`Input Identifier \`${id}\` is not allowed to contain any spaces.`)
	
	const encoder = new TextEncoder()
	
	let segments = id.split('::')
	let output = "_ZN"
	
	for (const segment of segments) {
		let isInternallyLinked = segment.startsWith('^')
		
		if (isInternallyLinked)
			output += 'L'
		
		let segmentId = isInternallyLinked ? segment.slice(1) : segment
		let binSegmentId = encoder.encode(segmentId)
		
		output += binSegmentId.byteLength.toString() + segmentId
	}
	
	return output + 'E'
}

export function followsManglingRules(id: string): boolean {
	return id != undefined && id.startsWith('_ZN') && id.endsWith('E') && !id.includes(' ')
}

/**
 * Demangles an Identifier following Clang's itanium name mangling rules back to a valid C++ identifier,
 * with the exception of internal linkage symbols, which contain a `^` symbol, like this:
 * `wld::fld::data::^ModelID_Bone_state` (mangled name: _ZN3wld3fld4data**L**18ModelID_Bone_stateE, L is for internal linkage)
 * @param mangledId The mangled identifier following Clang's name mangling rules
 * @returns The demangled identifier. Segments are seperated by ::
 * @example "_ZN3wld3fld4data9s_npcDataE" will be transformed into "wld::fld::data::s_npcData"
 */
export function demangle(mangledId: string): string {
	if (!followsManglingRules(mangledId))
		return mangledId
	
	let id = mangledId.slice('_ZN'.length, -1)
	let segments = []
	
	let segmentIndex = 0
	
	
	while (segmentIndex < id.length) {
		let prefix = id[segmentIndex] === 'L' ? "^" : ""
		
		if (id[segmentIndex] === 'L') {
			segmentIndex += 1
		}
		
		// TODO: make sure that this uses bytelengths and not utf-16 string lengths as well
		// console.log(mangledId, id, segmentIndex, id[segmentIndex])
		let [ lengthStr ] = id.slice(segmentIndex).match(/^\d+/)
		let segmentStart = segmentIndex + lengthStr.length
		let segment = prefix + id.slice(segmentStart, segmentStart + parseInt(lengthStr))
		segments.push(segment)
		segmentIndex += lengthStr.length + segment.length
	}
	
	return segments.join('::')
}

function isDigit(char: string) {
	return /^\d$/.test(char)
}

export function incrementName(name: string, isRoot: boolean = true): string {
	if (name == null)
		return null
	
	if (!isDigit(name[name.length - 1])) {
		return isRoot ? name + "2" : name + "1"
	}

	let lastDigit = parseInt(name[name.length - 1])
	
	if (lastDigit == 9) {
		return incrementName(name.slice(0, -1), false) + "0"
	} else {
		return name.slice(0, -1) + (lastDigit + 1)
	}
}
