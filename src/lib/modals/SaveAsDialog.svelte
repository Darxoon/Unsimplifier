<script lang="ts">
    import type { SaveAsDialogResults } from "$lib/menu/fileMenu";
    import Alert from "$lib/modal/Alert.svelte";
    import { hideActiveModal } from "$lib/modal/modal";
    import { onMount } from "svelte";
	
	export let fileName: string
	export let compressFile: boolean
	
	let stripFile: boolean
	let compressionRatio: number
	
	$: if (compressionRatio) {
		localStorage.setItem('zstd-compression-ratio', compressionRatio + "")
	}
	
	onMount(() => {
		let savedCompressionRatio = parseInt(localStorage.getItem('zstd-compression-ratio'))
		
		if (!isNaN(savedCompressionRatio)) {
			console.log("Applying saved compression ratio", savedCompressionRatio)
			compressionRatio = savedCompressionRatio
		} else {
			compressionRatio = 5
		}
	})
	
	function cancel() {
		hideActiveModal(false)
	}
	
	function download() {
		let results: SaveAsDialogResults = {
			fileName,
			compressFile,
			compressionRatio,
			stripFile,
		}
		
		hideActiveModal(results)
	}
</script>

<Alert title="Save File">
	<div class="control-group">
		<label class="text-label" for="fileNameInput">File Name:</label>
		<input id="fileNameInput" class="box textinput" type="text" bind:value={fileName}>
	</div>
	
	<div class="control-group">
		<input id="isCompressedInput" type="checkbox" bind:checked={compressFile}>
		<label for="isCompressedInput">Compress File</label>
	</div>
	
	<div class="control-group" class:disabled={!compressFile}>
		<label for="compressionRatioInput">Compression Ratio: {compressionRatio}</label> <span class="float-right">(recommended: 5)</span>
		<input type="range" min="0" max="9" id="compressionRatioInput" class="slider" list="compressionRatios"
			bind:value={compressionRatio} disabled={!compressFile}>
		<datalist id="compressionRatios">
			<option>0</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
			<option>4</option>
			<option>5</option>
			<option>6</option>
			<option>7</option>
			<option>8</option>
			<option>9</option>
			<!-- TODO: allow choosing between max 9 and max 20 with warning for OOM errors -->
			<!-- <option>10</option>
			<option>11</option>
			<option>12</option>
			<option>13</option>
			<option>14</option>
			<option>15</option>
			<option>16</option>
			<option>17</option>
			<option>18</option>
			<option>19</option>
			<option>20</option> -->
		</datalist>
		<ul class="markings">
			<li>0</li>
			<li>1</li>
			<li>2</li>
			<li>3</li>
			<li>4</li>
			<li>5</li>
			<li>6</li>
			<li>7</li>
			<li>8</li>
			<li>9</li>
			<!-- <li>10</li>
			<li>11</li>
			<li>12</li>
			<li>13</li>
			<li>14</li>
			<li>15</li>
			<li>16</li>
			<li>17</li>
			<li>18</li>
			<li>19</li>
			<li>20</li> -->
		</ul>
	</div>
	
	<div class="buttons">
		<button class="modalbtn" on:click={cancel}>Cancel</button>
		<button class="modalbtn" on:click={download}>Download</button>
	</div>
</Alert>

<style>
	.control-group {
		margin-bottom: 1rem;
	}
	
	.control-group.disabled {
		color: #00000080;
	}
	
	.text-label {
		display: block;
	}
	
	.box {
		margin: 4px 0 1rem 0;
		padding: 6px 12px;
		
		border-radius: 4px;
		
		background: #eaeaea;
	}
	
	.textinput {
		margin-bottom: 0;
		flex: 1;
		min-width: 400px;
		font-family: inherit;
		font-size: inherit;
	}
	
	.slider {
		display: block;
		margin-left: 0;
		width: 100%;
	}
	
	.float-right {
		float: right;
	}
	
	.markings {
		padding: 0 0 0 6px;
		margin: 8px 0 0 0;
		width: 100%;
		
		list-style: none;
		display: flex;
	}
	
	.markings li {
		flex: 1;
		/* font-size: 8pt; */
	}
	
	.markings li:last-child {
		max-width: 1.2rem;
	}
	
	.buttons {
		margin-top: 1rem;
		margin-left: auto;
	}
</style>