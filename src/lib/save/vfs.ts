import Dexie from "dexie";
import path from "path-browserify";

type DB = Dexie & {
	directory: Dexie.Table<{path: string, isRoot: boolean, directories: string[], files: {[name: string]: number}}>,
	files: Dexie.Table<{id?: number, name: string, dateModified: number, data: ArrayBuffer}>,
}

export class FileSystem {
	private db: DB
	
	private constructor(db: DB) {
		this.db = db
	}
	
	// inspect fs
	public async getDirectoryMetadata(dir: string): Promise<Directory> {
		const { isRoot, directories, files } = await this.db.directory.get(dir)
		const name = path.basename(dir)
		
		
		return {
			name,
			path: dir,
			isRoot,
			
			directories,
			files: await Promise.all(Object.entries(files).map(f => this.getFileMetadataFromId(f[1], dir)))
		}
	}
	
	private async getFileMetadataFromId(id: number, parentPath: string): Promise<FileMetadata> {
		let { name, dateModified } = await this.db.files.get(id)
		
		return {
			name,
			dateModified: new Date(dateModified),
			path: path.join(parentPath, name),
		}
	}
	
	public async getFileMetadata(filePath: string): Promise<FileMetadata | undefined> {
		let { files } = await this.getDirectoryMetadata(path.dirname(filePath))
		let file = files.find(file => file.path == filePath)
		
		return file
	}
	
	// get state
	public async getFileContent(filePath: string, isText: true): Promise<string>
	public async getFileContent(filePath: string, isText: false): Promise<ArrayBuffer>
	
	public async getFileContent(filePath: string, isText: boolean): Promise<string | ArrayBuffer> {
		let files = await this.getFilesInDirectory(path.dirname(filePath))
		let fileId = files[path.basename(filePath)]
		
		let { data } = await this.db.files.get(fileId)
		
		if (isText) {
			let decoder = new TextDecoder()
			return decoder.decode(data)
		} 
		else {
			return data
		}
	}
	
	private async getFilesInDirectory(dir: string): Promise<{[name: string]: number}> {
		const { files } = await this.db.directory.get(dir)
		
		return files
	}
	
	// change state
	public async createDirectory(dirPath: string) {
		dirPath = path.normalize(dirPath)
		if (dirPath.endsWith('/')) {
			dirPath = dirPath.slice(0, -1)
		}
		
		let segments = dirPath.split('/')
		let pathSoFar = ''
		
		// iterating through each path segment
		// and creating a directory for every segment
		// if it does not exist already
		for (const segment of segments) {
			if (pathSoFar.endsWith('/'))
				pathSoFar += segment
			else
				pathSoFar += '/' + segment
			
			let dir = await this.db.directory.get(pathSoFar)
			
			if (dir == null) {
				await this.db.directory.add({
					path: pathSoFar,
					isRoot: pathSoFar === '/',
					directories: [],
					files: {},
				})
				
				if (pathSoFar != '/') {
					// is not root
					
					// add to parent
					let parent = await this.db.directory.get(path.dirname(pathSoFar))
					parent.directories.push(pathSoFar)
					await this.db.directory.put(parent)
				}
			}
		}
	}
	
	public async writeFileContent(filePath: string, content: ArrayBuffer | string) {
		// to emulate a classical file system, this function handles both creation
		// and modification of a file
		
		// these two things are, however, different problems that require different
		// solutions, so this is split into two different solutions
		let dirName = path.dirname(filePath)
		let fileName = path.basename(filePath)
		
		let files = await this.getFilesInDirectory(dirName)
		let fileId = files[fileName]
		
		if (typeof content == 'string') {
			let encoder = new TextEncoder()
			content = encoder.encode(content).buffer
		}
		
		if (fileId) {
			await this.db.files.put({
				id: fileId,
				name: fileName,
				dateModified: Date.now(),
				data: content,
			})
		} else {
			await this.db.files.add({
				name: fileName,
				dateModified: Date.now(),
				data: content,
			})
			
			let latestFile = await this.db.files.orderBy('id').last()
			let fileId = latestFile.id
			
			let parent = await this.db.directory.get(dirName)
			parent.files[fileName] = fileId
			await this.db.directory.put(parent)
		}
	}
}

export interface Directory {
	name: string,
	path: string,
	isRoot: boolean,
	
	directories: string[],
	files: FileMetadata[],
}

export interface FileMetadata {
	name: string,
	path: string,
	dateModified: Date,
}

export async function createFileSystem(id: string): Promise<FileSystem> {
	let db = new Dexie("VFS:" + id) as DB
	
	db.version(1).stores({
		directory: "path,isRoot",
		files: "++id,name,dateModified"
	})
	
	// @ts-ignore
	let fs: FileSystem = new FileSystem(await db.open())
	await fs.createDirectory('/')
	
	return fs
}
