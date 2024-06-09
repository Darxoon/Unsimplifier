import { createFileSystem } from "./vfs";
import romfsdata from "./romfsdata.json";
import { getFileContent } from "$lib/util";
import { sha256 } from "js-sha256";

export async function loadFilesToRomfsStore(files: File[]) {
    const romfs = await createFileSystem("romfs_data")
    
    // Create map for easier file access
    const fileMap: Map<string, File> = new Map()
        
    for (let i = 0; i < files.length; i++) {
        if (files[i].name.endsWith(".elf.zst")) {
            let pathSegments = files[i].webkitRelativePath.split('/')
            let path = pathSegments.slice(1).join('/')
            fileMap.set(path, files[i])
        }
    }
    
    // Create all necessary directories
    const allFilePaths = [...fileMap.keys()]
    const directories = new Set(allFilePaths.map(path => path.slice(0, path.lastIndexOf('/'))))
    
    for (const dir of directories) {
        romfs.createDirectory("/" + dir)
    }
    
    // Load files based on romfsdata.json
    await Promise.all(romfsdata.map(async ({ name, hash: baseHash }) => {
        const file = fileMap.get(name)
        const content: ArrayBuffer = await getFileContent(file, false)
        const hash = sha256(content)
        
        if (baseHash !== hash) {
            throw new Error(`File ${name} has wrong hash, expected ${baseHash} but got ${hash}.`)
        }
        
        await romfs.writeFileContent("/" + name, content)
    }))
}
