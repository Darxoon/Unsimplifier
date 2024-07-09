<script lang="ts">
    import { onDestroy, onMount } from "svelte";
	import { hideActiveModal } from "./modal";
    import { nonnativeButton } from "$lib/nonnativeButton";
    import { HTML_FOCUSABLE_ELEMENTS } from "$lib/util";
    import { XIcon } from "svelte-feather-icons";
	
	export let title: string
	
	let alertDiv: HTMLDivElement
	let slotWrapper: HTMLDivElement
	
	function close() {
		hideActiveModal(false)
	}
	
	// TODO: Split into FocusTrapZone
	function getAllFocusable(includeCloseButton: boolean): HTMLElement[] {
		let parentElement = includeCloseButton ? alertDiv : slotWrapper
		let focusable: HTMLElement[] = Array.from(parentElement.querySelectorAll(HTML_FOCUSABLE_ELEMENTS.join(', ')))
		
		if (focusable.length > 0 && includeCloseButton)
			focusable.push(focusable.shift())
		
		return focusable
	}
	
	function onKeydown(e: KeyboardEvent) {
		if (e.key == "Escape") {
			e.stopPropagation()
			e.preventDefault()
			close()
			
			return
		}
		
		if (e.key == "Tab") {
			trapFocusKeyboard(e)
			
			return
		}
	}
	
	function trapFocusKeyboard(e: KeyboardEvent) {
		let focusable = getAllFocusable(true)
		
		// checkVisibility is not supported in safari but focus trapping works without this code,
		// it just allows the possibility that .alert-pre or .alert-post is selected
		if (Element.prototype.checkVisibility) {
			focusable = focusable.filter(element => element.checkVisibility({ checkVisibilityCSS: true }))
		}
		
		if (!(document.activeElement instanceof HTMLElement) || focusable.length == 0)
			return
		
		let index = focusable.indexOf(document.activeElement)
		
		if (!e.shiftKey) {
			switch (index) {
				case -1:
					focusable[0].focus()
					break
				case 0:
					if (focusable.length == 1)
						focusable[0].focus()
					else
						return
					break
				// last element is x button, which is the first element on page
				// that's why navigating there has to be implemented but not navigating from there
				case focusable.length - 2:
					focusable[focusable.length - 1].focus()
					break
				// Return so that the event will not be marked as handled
				default:
					return
			}
		} else {
			switch (index) {
				case -1: {
					let lastPossible = focusable[focusable.length - 2] ?? focusable[focusable.length - 1]
					lastPossible.focus()
				} break
				case focusable.length - 1:
					if (focusable.length == 1)
						focusable[0].focus()
					else
						focusable[focusable.length - 2].focus()
					break
				default:
					return
			}
		}
		
		// if it has not returned, then that means that the event has been handled
		e.preventDefault()
		e.stopPropagation()
	}
	
	onMount(() => {
		document.addEventListener('keydown', onKeydown)
		
		// try focusing the first focusable element in the alert
		let focusable = getAllFocusable(false)
		
		if (focusable.length > 0) {
			focusable[0].focus()
			return
		}
		
		// if that does not work out, try selecting the root element of the slot
		let focusableRoot = Array.from(slotWrapper.children).find(child => child instanceof HTMLElement)
		
		if (focusableRoot instanceof HTMLElement) {
			focusableRoot.focus()
		}
	})
	
	onDestroy(() => {
		document.removeEventListener('keydown', onKeydown)
	})
</script>

<!-- pre and post elements are for focus trapping, any focus on them will immediately be revoked again -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="alert-pre" tabindex="0"></div>

<div class="alert" bind:this={alertDiv}>
	<div class="closeButton" use:nonnativeButton={close}>
		<XIcon />
	</div>
	
	<h2>{title}</h2>
	<div bind:this={slotWrapper}>
		<slot />
	</div>
</div>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="alert-post" tabindex="0"></div>

<style>
	:root {
		--alert-font-size: 12pt;
	}
	
	.alert {
		position: relative;
		font-size: var(--alert-font-size);
	}
	
	.closeButton {
		position: absolute;
		right: 0;
	}
	
	h2 {
		margin-top: 0;
		margin-right: 2rem;
	}	
</style>
