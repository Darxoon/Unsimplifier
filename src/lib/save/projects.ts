import { createFileSystem } from "./vfs";
import romfsdata from "./romfsdata.json";
import { sha256 } from "js-sha256";

export async function getRomfsVfs() {
    return await createFileSystem("romfs_data")
}

export async function loadFilesToRomfsStore(files: File[], progressCallback: (state: string) => void) {
    const romfs = await getRomfsVfs()
    
    // Create map for easier file access
    const fileMap: Map<string, File> = new Map()
        
    for (let i = 0; i < files.length; i++) {
        if (files[i].name.endsWith(".elf.zst")) {
            let pathSegments = files[i].webkitRelativePath.split('/')
            let path = pathSegments.slice(1).join('/')
            fileMap.set(path, files[i])
        }
    }
    
    console.log('transferred files into a map')
    
    // Create all necessary directories
    progressCallback("creating directories")
    
    const allFilePaths = [...fileMap.keys()]
    const directories = new Set(allFilePaths.map(path => path.slice(0, path.lastIndexOf('/'))))
    
    for (const dir of directories) {
        await romfs.createDirectory("/" + dir)
    }
    
    console.log('created necessary directories')
    
    // Load files based on romfsdata.json
    let currentFile = 1
    
    for (const { name, hash: baseHash } of romfsdata) {
        const file = fileMap.get(name)
        
        if (file == undefined)
            throw new Error(`File 'romfs/${name}' does not exist! Did you select the correct folder?`)
        
        const content: ArrayBuffer = await file.arrayBuffer()
        const hash = sha256(content)
        
        if (baseHash !== hash) {
            throw new Error(`File ${name} has wrong hash, expected ${baseHash} but got ${hash}.`)
        }
        
        await romfs.writeFileContent("/" + name, content)
        
        let percentage = currentFile++ / fileMap.size
        progressCallback(`loading files, ${Math.floor(percentage * 100)}% complete`)
    }
    
    console.log('created all necessary files')
}
