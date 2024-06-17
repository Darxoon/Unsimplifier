import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';

const isDevVersion = !!parseInt(process.env.PUBLIC_IS_DEV_VERSION ?? "1")

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		paths: {
			base: isDevVersion ? "" : "/Unsimplifier",
		},
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: null,
		}),
		alias: {
			'paper-mario-elfs': 'src/elf',
			'paper-mario-elfs/*': 'src/elf/*',
		},
	}
};

export default config;
