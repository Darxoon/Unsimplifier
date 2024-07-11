import type { ElfBinary } from "paper-mario-elfs/elfBinary"
import type { DataType } from "paper-mario-elfs/dataType"
import type { Tab } from "./editor/globalDragging"

export function noop() {}

export function wait(ms: number): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})
}

export function waitAnimationFrame(): Promise<number> {
	return new Promise((resolve, reject) => {
		requestAnimationFrame(time => {
			resolve(time)
		})
	})
}

// credit: https://github.com/ghosh/Micromodal/blob/master/lib/src/index.js#L4
// https://github.com/ghosh/Micromodal/blob/master/LICENSE.md
export const HTML_FOCUSABLE_ELEMENTS = [
	'a[href]',
	'area[href]',
	'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
	'select:not([disabled]):not([aria-hidden])',
	'textarea:not([disabled]):not([aria-hidden])',
	'button:not([disabled]):not([aria-hidden])',
	'iframe',
	'object',
	'embed',
	'[contenteditable]',
	'.tabbable',
	'[tabindex]:not([tabindex^="-"])'
] as const

export function openBlob(): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const fileSelector = document.createElement('input')
		fileSelector.setAttribute('type', 'file')
		fileSelector.click()
		
		fileSelector.addEventListener('change', (e: any) => {
			const file: File = e.target.files[0]
			
			const fileReader = new FileReader()
			
			fileReader.onload = function(e) {
				resolve(fileReader.result as ArrayBuffer)
			}
			
			fileReader.onerror = function(e) {
				reject(e)
			}
			
			fileReader.readAsArrayBuffer(file)
		})
	})
}

export function downloadBlob(data: Uint8Array | BlobPart, fileName: string, mimeType: string = 'application/octet-stream') {
	let blob = new Blob([data], {
		type: mimeType
	});
	let url = window.URL.createObjectURL(blob);
	downloadURL(url, fileName);
	setTimeout(function () {
		return window.URL.revokeObjectURL(url);
	}, 1000);
};

export function downloadText(data: string, fileName: string, mimeType: string = 'text/plain') {
	let blob = new TextEncoder().encode(data)
	downloadBlob(blob, fileName, mimeType)
};

export function openFolderSelector() {
	console.log("opening file")

	const fileSelector = document.createElement('input')
	fileSelector.setAttribute('type', 'file')
	fileSelector.setAttribute('webkitdirectory', "webkitdirectory")
	fileSelector.setAttribute('directory', "directory")
	fileSelector.setAttribute('multiple', "multiple")
	fileSelector.click()
	
    return new Promise<File[]>((resolve, reject) => {
        fileSelector.addEventListener('change', async (e: any) => {
            const files: File[] = [...e.target.files]
            resolve(files)
        })
    })
}

function downloadURL(url: string, fileName: string) {
	console.log('downloading', url)
	
	let a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.style.display = 'none';
	a.click();
	a.remove();
};

export async function decompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
	const { ZstdCodec } = await import('zstd-codec')
	console.log('loading zstd-codec')
	
	return new Promise((resolve, reject) => {
		ZstdCodec.run(zstd => {
			const simple = new zstd.Simple();
			const decompressed = simple.decompress(new Uint8Array(buffer))
			
			console.log('decompressed file')
			resolve(decompressed.buffer)
		})
	})
}

export async function compress(buffer: ArrayBuffer, compressionRatio = 5): Promise<ArrayBuffer> {
	const { ZstdCodec } = await import('zstd-codec')
	console.log('loading zstd-codec')
	
	return new Promise((resolve, reject) => {
		ZstdCodec.run(zstd => {
			try {
				let simple = new zstd.Simple()
				let compressed = simple.compress(new Uint8Array(buffer), compressionRatio)
				
				console.log('compressed file with size of', buffer.byteLength, 'and ratio', compressionRatio)
				resolve(compressed.buffer)
			} catch (e) {
				reject(e)
			}
		})
	})
}

export function createFileTab(name: string, filePath: string, binary: ElfBinary, dataType: DataType, isCompressed: boolean): Tab {
	return {
		id: Symbol(`TabID ${name}`),
		name: name,
		children: [],
		isCompressed,
		content: {
			type: "cardList",
			filePath,
			binary,
			dataType,
		}
	}
}

export function insertIntoArrayPure<T>(arr: T[], index: number, ...items: T[]) {
	let newArr = [...arr]
	newArr.splice(index, 0, ...items)
	return newArr
}

export function excludeFromArrayPure<T>(arr: T[], toExclude: T): T[] {
	let newArr = [...arr]
	let index = arr.indexOf(toExclude)
	
	if (index != -1) {
		newArr.splice(index, 1)
	}
	
	return newArr
}

export function replaceInArrayPure<T>(arr: T[], source: T, replaceWith: T): T[] {
	let newArr = [...arr]
	let index = arr.indexOf(source)
	
	if (index == -1) {
		console.error("Item", source, "was not found in array", arr)
		return newArr
	}
	
	newArr[index] = replaceWith
	return newArr
}

export function resizeArray<T>(arr: T[], newSize: number, defaultValue: T) {
    while(newSize > arr.length)
        arr.push(defaultValue);
    arr.length = newSize;
	
	return arr
}

export function map2d<T,U>(arr: T[][], fn: (value: T, index: number, array: T[]) => U): U[][] {
	return arr.map(arr2 => arr2.map(fn))
}

export function clamp(n: number, minimum: number, maximum: number): number {
	if (n < minimum)
		return minimum
	else if (maximum < n)
		return maximum
	else
		return n
}

const twoLetterAcronyms = [
	'ID',
	'BP',
	'HP',
	'FP',
]

export function toReadableString(camelCaseStr: string) {
	if (camelCaseStr.startsWith('field_'))
		return camelCaseStr.replace('_', ' ')
	
	let output = ""
	
	for (let i = 0; i < camelCaseStr.length; i++) {
		const previousChar = camelCaseStr[i - 1]
		const currentChar = camelCaseStr[i]
		const lookAhead = camelCaseStr[i + 1]
		
		const isNumber = /^\d$/.test(currentChar)
		const newWordBeginning: boolean = currentChar.toUpperCase() === currentChar || output === ''
		
		function testSpecialWord(word: string): boolean {
			return output.endsWith(word[0]) && currentChar == word[1].toLowerCase()
		}
		
		// special case for BShapes
		if (newWordBeginning && output.endsWith(' B')) {
			output += currentChar.toUpperCase()
		}
		// special case for two letter acronyms like "ID"
		else if (
			output.at(-2) == ' '
			&& twoLetterAcronyms.find(testSpecialWord)
			&& !(/^[a-z]$/.test(lookAhead))
		) {
			output += currentChar.toUpperCase()
		}
		else if (isNumber && /^\d$/.test(previousChar)) {
			output += currentChar
		}
		else if (newWordBeginning) {
			output += ' ' + currentChar.toUpperCase()
		} 
		else {
			output += currentChar
		}
	}
	
	return output.trim()
}

export function trimStr(str: string, ch: string) {
    var start = 0, 
        end = str.length;

    while(start < end && str[start] === ch)
        ++start;

    while(end > start && str[end - 1] === ch)
        --end;

    return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}

export function arrayLastElement<T>(arr: T[]): T {
	return arr[arr.length - 1]
}
