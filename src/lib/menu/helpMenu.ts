import type EditorStrip from "$lib/editor/EditorStrip.svelte"
import { globalEditorStrip } from "$lib/stores"
import type { MenuCategory } from "$lib/types"
import { showModal } from "../modal/modal"
import TextAlert from "../modal/TextAlert.svelte"

let editorStrip: EditorStrip
globalEditorStrip.subscribe(value => editorStrip = value)

export function getHelpMenu(): MenuCategory {
	return {
		title: "Help",
		items: [
			{
				name: "Open website",
				onClick: () => {
					let link = document.createElement('a')
					link.target = "_blank"
					link.rel = "noopener noreferrer"
					link.href = "https://github.com/Darxoon/Unsimplifier"
					link.click()
				}
			},
			{
				name: "About",
				onClick: () => {
					showModal(TextAlert, {
						title: "About Origami Wand",
						content: `
Made by Darxoon

Additional help by [HunterXuman](https://twitter.com/HunterXuman/)

GitHub: [](https://github.com/darxoon/origamiwand)`
					})
				},
			},
		],
	}
}