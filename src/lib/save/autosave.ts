import Dexie from 'dexie'
import type { DataType } from 'paper-mario-elfs/dataType'

type DB = Dexie & {
	overview: Dexie.Table<{id: number, timestamp: number, saveId: number}>,
	saves: Dexie.Table<{id?: number, windows: SaveFile[][]}>,
}

let db: DB

export interface SaveFile {
	name: string
	filePath: string
	dataType: DataType
	content: ArrayBuffer
	isCompressed: boolean
}

export async function initializeAutosaves() {
	if (!window.indexedDB) {
		console.error("Your browser doesn't support a stable version of IndexedDB. Consider updating your browser.")
	}
	
	db = new Dexie("TTYDAutoSave") as DB
	db.version(3).stores({
		overview: "++id,timestamp",
		saves: "++id",
	})
	
	try {
		await db.open()
		console.log("initialized database")
	}
	catch (e) {
		console.error("Couldn't initialize auto save database", e)
	}
}

export async function createTemporarySave(windows: SaveFile[][]) {
	if (!windows.every(files => files.every(file => file != undefined))) {
		debugger
		throw new Error("Trying to save undefined as a tab")
	}
	
	// delete previous temp save
	let previousTempSave = await db.overview.get(0)
	
	if (previousTempSave) {
		db.saves.delete(previousTempSave.saveId)
	}
	
	// create new one
	db.saves.add({ windows })
	let latestSave = await db.saves.orderBy('id').last()
	let saveId = latestSave.id
	console.log(saveId)
	
	db.overview.put({ id: 0, timestamp: Date.now(), saveId })
}

export async function getLatestSave() {
	let latestSaveEntry = await db.overview.orderBy('timestamp').last()
	let saveId = latestSaveEntry?.saveId ?? 0
	
	let save = await db.saves.get(saveId)
	return save?.windows
}
