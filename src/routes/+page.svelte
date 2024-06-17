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
	import { globalEditorStrip, loadedAutosave, romfsInitialized } from '$lib/stores';
	import { map2d, createFileTab } from '$lib/util';
	
	import TitleCard from '$lib/TitleCard.svelte';
    import type { MenuCategory } from '$lib/types';
	
	let editorStrip: EditorStrip
	
	$: globalEditorStrip.set(editorStrip)
	
	$: if (globalThis.localStorage && $romfsInitialized != null) {
		localStorage.setItem('romfs_initialized', $romfsInitialized ? 1 : 0)
	}
	
	export const menuItems: MenuCategory[] = [
		getFileMenu(),
		{
			title: "Edit",
			items: [
				{
					name: "Nothing here yet",
					onClick: () => {}
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
				return
			}
			
			let tabs = map2d(save, ({ name, filePath, dataType, content, isCompressed }) => 
				createFileTab(name, filePath, parseElfBinary(dataType, content), dataType, isCompressed)
			).filter(arr => arr.length > 0)
			
			if (tabs.length != 0) {
				editorStrip.load(tabs)
			}
			
			$loadedAutosave = true
		})
		
		window.addEventListener('beforeunload', async e => {
			if (editorStrip) {
				await createTemporarySave(editorStrip.toSaveData())
			}
		})
		
		let betaBannerShown = !!localStorage.ttydbeta
		
		if (!betaBannerShown) {
			showModal(TextAlert, {
				title: "Welcome to Unsimplifier!",
				fontSize: 14,
				content: `
This tool is still in development so expect to come across issues. If you
have any questions, feel free to message me (@Darxoon on discord) or join the
discord linked under "Need help?" and ask me there.

Anyway, have fun using this tool!`
			})
			
			localStorage.ttydbeta = 1
		}
	})
	
	let draggingFile = false
	
	function fileDragHandler(e: DragEvent) {
		if ($romfsInitialized && e.dataTransfer.types.includes("Files")) {
			draggingFile = true
			e.preventDefault()
		}
	}
	
	async function fileDropHandler(e: DragEvent) {
		if ($romfsInitialized && e.dataTransfer.types.includes("Files")) {
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
	<title>Unsimplifier Tool</title>
	
	<meta property="og:url" content="https://darxoon.neocities.org/Unsimplifier/">
	<meta property="og:type" content="website">
	<meta property="og:title" content="Unsimplifier">
	<meta property="og:description" content="Editor for Paper Mario: The Thousand Year Door Remake">
	<meta property="og:image" content="https://darxoon.neocities.org/res/unsimplifier.png">

	<meta name="twitter:card" content="summary_large_image">
	<meta property="twitter:domain" content="darxoon.neocities.org">
	<meta property="twitter:url" content="https://darxoon.neocities.org/Unsimplifier/">
	<meta name="twitter:title" content="Unsimplifier">
	<meta name="twitter:description" content="Editor for Paper Mario: The Thousand Year Door Remake">
	<meta name="twitter:image" content="https://darxoon.neocities.org/res/unsimplifier.png">
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
