import { writable } from "svelte/store";
import type { PageContent } from "./fileEditor/page";

export type DockDirection = 'left' | 'origin' | 'right'

export type TabID = Symbol

export interface Tab {
    id: TabID,
    parentId?: TabID,
    
    name: string
    isCompressed: boolean,
    children: TabID[]
    
    content: PageContent
}

export type WindowID = Symbol

export interface Window {
    id: WindowID
    tabs: Tab[]
}

export const globalDraggedTab = writable<{ tab: Tab, baseMouseX: number }>(undefined)
export const tabWasAccepted = writable<Tab>(undefined)

