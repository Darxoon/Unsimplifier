<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	
	import parseElfBinary from 'paper-mario-elfs/parser';
	import serializeElfBinary from 'paper-mario-elfs/serializer';
	
	import { currentModal, modalVisible, showModal } from '$lib/modal/modal';
	import Modal from '$lib/modal/Modal.svelte';
	import TextAlert from '$lib/modal/TextAlert.svelte';
	import { createTemporarySave, getLatestSave, initializeAutosaves } from '$lib/save/autosave';
	import EditorStrip from '$lib/editor/EditorStrip.svelte';
	import { getZstdMenu } from '$lib/menu/zstdMenu';
	import { getHelpMenu } from '$lib/menu/helpMenu';
	import { getFileMenu, openFileToEditor } from '$lib/menu/fileMenu';
	import { getViewMenu } from '$lib/menu/viewMenu';
	import { globalEditorStrip, loadedAutosave } from '$lib/stores';
	import { map2d, createFileTab, createWelcomeScreen } from '$lib/util';
	
	import TitleCard from '$lib/TitleCard.svelte';
    import type { MenuCategory } from '$lib/types';
	
	let editorStrip: EditorStrip
	
	$: globalEditorStrip.set(editorStrip)
	
	export const menuItems: MenuCategory[] = [
		getFileMenu(),
		{
			title: "Edit",
			items: [
				{
					name: "Edit Type Definition...",
					onClick: () => {
						showModal(TextAlert, {
							title: "Coming Soon",
							content: "The feature to edit the type definition is not completed, and thus is not available yet."
						})
					}
				}
			],
		},
		getZstdMenu(),
		getViewMenu(),
		getHelpMenu(),
	]
	
	onMount(() => {
		initializeAutosaves().then(async () => {
			let save = await getLatestSave()
			
			console.log('loading save', save)
			
			if (!save) {
				$loadedAutosave = true
				editorStrip.appendTab(createWelcomeScreen())
				return
			}
			
			let tabs = map2d(save, ({name, dataType, content, isCompressed}) => 
				createFileTab(name, parseElfBinary(dataType, content), dataType, isCompressed)
			).filter(arr => arr.length > 0)
			
			if (tabs.length == 0) {
				let showWelcomeScreen = !parseInt(localStorage.getItem('hide-welcome-screen'))
				
				if (showWelcomeScreen) {
					editorStrip.appendTab(createWelcomeScreen())
				}
			} else {
				editorStrip.load(tabs)
			}
			
			$loadedAutosave = true
		})

		window.addEventListener('beforeunload', async e => {
			await createTemporarySave(editorStrip.toSaveData())
		})
		
		let betaBannerShown = !!localStorage.beta
		
		if (!betaBannerShown) {
			showModal(TextAlert, {
				title: "Origami Wand Beta",
				fontSize: 14,
				content: `
Welcome to the Origami Wand Beta!

This product is still in beta, so it is not finished yet and might still contain bugs.
If you encounter any, **please report them using the "Report bugs" button** or reach out
to me, the developer (Darxoon). Thanks.`
			})
			
			localStorage.beta = 1
		}
	})
	
	let draggingFile = false
	
	function fileDragHandler(e: DragEvent) {
		if (e.dataTransfer.types.includes("Files")) {
			draggingFile = true
			e.preventDefault()
		}
	}
	
	async function fileDropHandler(e: DragEvent) {
		if (e.dataTransfer.types.includes("Files")) {
			draggingFile = false
			
			e.preventDefault()
			
			if (e.dataTransfer.items) {
				// Use DataTransferItemList interface to access the file(s)
				for (var i = 0; i < e.dataTransfer.items.length; i++) {
					// If dropped items aren't files, reject them
					if (e.dataTransfer.items[i].kind === 'file') {
						var file = e.dataTransfer.items[i].getAsFile();
						console.log('... file[' + i + '].name = ' + file.name);
						
						await openFileToEditor(file)
					}
				}
			} else {
				// Use DataTransfer interface to access the file(s)
				for (var i = 0; i < e.dataTransfer.files.length; i++) {
					console.log('... file[' + i + '].name = ' + e.dataTransfer.files[i].name);
				}
			}
		}
	}
	
	function dragLeaveHandler(e: DragEvent) {
		draggingFile = false
	}
</script>

<svelte:head>
	<title>Origami Wand</title>
	
	<meta property="og:url" content="https://darxoon.neocities.org/OrigamiWand/">
	<meta property="og:type" content="website">
	<meta property="og:title" content="Origami Wand">
	<meta property="og:description" content="Editor for Paper Mario: The Origami King (Beta)">
	<meta property="og:image" content="https://darxoon.neocities.org/res/origamiwand.png">

	<meta name="twitter:card" content="summary_large_image">
	<meta property="twitter:domain" content="darxoon.neocities.org">
	<meta property="twitter:url" content="https://darxoon.neocities.org/OrigamiWand/">
	<meta name="twitter:title" content="Origami Wand">
	<meta name="twitter:description" content="Editor for Paper Mario: The Origami King (Beta)">
	<meta name="twitter:image" content="https://darxoon.neocities.org/res/origamiwand.png">
</svelte:head>

<!-- TODO: consider whether this element should get a role after all -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<section class="main" on:dragover={fileDragHandler} on:dragleave={dragLeaveHandler} on:drop={fileDropHandler}>
	<div class="title_card">
		<TitleCard menu={menuItems} />
	</div>
	
	<EditorStrip bind:this={editorStrip}></EditorStrip>
</section>

{#if $modalVisible}
	<Modal>
		<svelte:component this={$currentModal.constructor} {...$currentModal.properties} />
	</Modal>
{/if}

<div class="dragOverlay" class:shown={draggingFile}>
	<div class="dragWrapper">
		<div class="card dragContent">
			Drop file to open
		</div>
	</div>
</div>

<style lang="scss">
	.main {
		height: 2px;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	
	.title_card {
		padding: 1.5rem;
	}
	
	.dragOverlay {
		pointer-events: none;
		
		position: fixed;
		max-height: 100vh;
		display: flex;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		
		background: none;
		
		transition: background 0.4s;
		
		&.shown {
			background: #00000038;
			
			.dragWrapper {
				visibility: visible;
			}
		}
	}
	
	.dragWrapper {
		--margin: 2rem;
		
		pointer-events: none;
		
		visibility: hidden;
		display: flex;
		position: absolute;
		top: var(--margin);
		left: var(--margin);
		bottom: var(--margin);
		right: var(--margin);
	}
	
	.dragContent {
		pointer-events: none;
		
		margin: 10% auto auto auto;
		min-width: 12rem;
		background: #e4e4e4;
		font-weight: bold;
		font-size: 14pt;
		text-align: center;
	}
</style>
