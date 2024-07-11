import type { DataType } from "paper-mario-elfs/dataType"
import { writable } from "svelte/store"

export interface RecentFile {
    label: string
    dataType: DataType
    
    filePath?: string
    yamlContent?: string
    saveId?: number
}

export let recentFiles = writable<RecentFile[]>(initRecentFiles())

recentFiles.subscribe(value => {
    if (globalThis.localStorage) {
        localStorage.setItem('recent_files', JSON.stringify(value))
    }
})

function initRecentFiles(): RecentFile[] {
    if (globalThis.localStorage) {
        return JSON.parse(localStorage.getItem('recent_files')) ?? []
    } else {
        return []
    }
}

export function addToRecentFiles(file: RecentFile) {
    recentFiles.update(value => {
        if (file.filePath) {
            value = value.filter(recentFile => recentFile.filePath !== file.filePath)
        }
        
        return [
            file,
            ...value.slice(0, 9),
        ]
    })    
}
