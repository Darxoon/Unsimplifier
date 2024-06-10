<script lang="ts">
    import { PUBLIC_IS_DEV_VERSION, PUBLIC_OW_VERSION, PUBLIC_VERSION_TIMESTAMP } from "$env/static/public";
	import MenuStripItem from "./menu/MenuStripItem.svelte";
    import type { MenuCategory } from "./types";
	
	export let menu: MenuCategory[] = []
	
	let buildDate = parseInt(PUBLIC_IS_DEV_VERSION) ? new Date() : new Date(parseInt(PUBLIC_VERSION_TIMESTAMP))
</script>

<div>
	<img class="icon" src="Unsimplifier_icon.png" alt="Unsimplifier's logo">
	<div class="title_card">
		<div class="title">
			<h1>Unsimplifier</h1>
			{#if !parseInt(PUBLIC_IS_DEV_VERSION)}
				<div class="app_version">{PUBLIC_OW_VERSION}</div>
			{/if}
			<p>Editor for The Thousand Year Door Remake</p>
		</div>
		<ul class="menu_strip">
			{#each menu as item}
				<span>
					<MenuStripItem name={item.title} items={item.items} />
				</span>
			{/each}
			<span>
				<li class="build_timestamp">Last built {buildDate.toLocaleDateString("en-UK", { dateStyle: "long" })}</li>
			</span>
		</ul>
	</div>
</div>

<style lang="scss">
	.icon {
		position: relative;
		top: 0.4rem;
		float: left;
	}
	
	.title_card {
		padding: 0.2rem 1rem calc(1rem - 10px) 1rem;
		border-radius: 1rem;
		
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
				margin: auto 0 auto 2rem;
				font-size: 15pt;
				transform: translateY(2px);
			}
		}
		
		.app_version {
			margin: auto 0 4px 4px;
		}
		
		.menu_strip {
			padding: 0;
			display: flex;
			flex-direction: row;
			list-style-type: none;
		}
		
		.build_timestamp {
			padding: 0 0.9rem 6px 0.9rem;
			max-height: 42px;
  			overflow: hidden;
		}
	}
	
	
	/* .menu_strip span {
		margin-right: 1.8rem;
	} */
</style>
