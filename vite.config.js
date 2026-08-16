import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	
	build: {
		target: [ 'es2020' ],
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('zstd-codec')) {
						return 'zstd-codec'
					}
				}
			}
		}
	},
	resolve: {
		alias: {
			'paper-mario-elfs': path.resolve('src/elf')
		},
		conditions: process.env.VITEST ? ['browser'] : undefined,
	},
};

export default config;
