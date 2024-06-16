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
			// {
			// 	name: "Open documentation",
			// 	onClick: () => {
			// 		editorStrip.appendTab({
			// 			id: Symbol(),
			// 			name: "Home - Documentation",
			// 			children: [],
			// 			isCompressed: false,
			// 			content: {
			// 				type: "docs",
			// 			}
			// 		})
			// 	}
			// },
			{
				name: "About",
				onClick: () => {
					showModal(TextAlert, {
						title: "About Unsimplifier",
						content: `
Made by Darxoon

for the Paper Mario community

Additional help by [HunterXuman](https://twitter.com/HunterXuman/)

GitHub: [](https://github.com/Darxoon/Unsimplifier)`
					})
				},
			},
		],
	}
}