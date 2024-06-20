<script lang="ts">
    import { PUBLIC_IS_DEV_VERSION, PUBLIC_OW_VERSION, PUBLIC_VERSION_TIMESTAMP } from "$env/static/public";
	import MenuStripItem from "./menu/MenuStripItem.svelte";
    import type { MenuCategory } from "./types";
	
	export let menu: MenuCategory[] = []
	
	let buildDate = parseInt(PUBLIC_IS_DEV_VERSION) ? new Date() : new Date(parseInt(PUBLIC_VERSION_TIMESTAMP))
</script>

<div class="title_card_wrapper">
	<img class="icon" src="Unsimplifier_icon.png" alt="Unsimplifier's logo">
	<div class="title_card">
		<div class="title">
			<h1>Unsimplifier</h1>
			{#if !parseInt(PUBLIC_IS_DEV_VERSION)}
				<div class="app_version">{PUBLIC_OW_VERSION}</div>
			{/if}
			<p>Editor for The Thousand Year Door Remake</p>
		</div>
		<div class="menu_strip_wrapper">
			<ul class="menu_strip">
				{#each menu as item}
					<span>
						<MenuStripItem name={item.title} items={item.items} />
					</span>
				{/each}
			</ul>
			<span class="build_timestamp_wrapper">
				<div class="build_timestamp">Last built {buildDate.toLocaleDateString("en-UK", { dateStyle: "long" })}</div>
			</span>
		</div>
	</div>
</div>

<style lang="scss">
	.title_card_wrapper {
		display: flex;
	}
	
	.icon {
		position: relative;
		top: 0.4rem;
		height: 100%;
	}
	
	.title_card {
		padding: 0.2rem 1rem calc(1rem - 10px) calc(1rem + 100px);
		margin-left: -100px;
		border-radius: 1rem;
		max-width: 100%;
		box-sizing: border-box;
		
		display: inline-block;
		
		:last-child {
			margin: 0;
		}
		
		.title {
			display: flex;
			margin-bottom: 1rem;
			
			h1 {
				margin-bottom: 0;
				font-size: 32pt;
			}
			
			p {
				margin: auto 0 auto 1.5rem;
				font-size: 15pt;
				transform: translateY(2px);
				overflow-x: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				min-width: 30px;
			}
		}
		
		.app_version {
			margin: auto 0 4px 4px;
		}
		
		.menu_strip_wrapper {
			display: flex;
		}
		
		.menu_strip {
			margin: 0;
			padding: 0;
			min-width: fit-content;
			
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			
			list-style-type: none;
		}
		
		.build_timestamp_wrapper {
			overflow-x: hidden;
		}
		
		.build_timestamp {
			padding: 0 0.9rem 6px 0.9rem;
			max-height: 42px;
  			overflow-x: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
			min-width: 20px;
		}
	}
	
	
	/* .menu_strip span {
		margin-right: 1.8rem;
	} */
</style>
