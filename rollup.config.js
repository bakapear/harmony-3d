import image from '@rollup/plugin-image'
import css from 'rollup-plugin-import-css'
import typescript from '@rollup/plugin-typescript'
import wasm from '@rollup/plugin-wasm'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { string } from 'rollup-plugin-string'

export default {
	input: './src/index.ts',
	output: {
		file: './dist/harmony.js',
		format: 'umd',
		name: 'Harmony3D',
	},
	plugins: [
		css(),
		image(),
		nodeResolve(),
		string({ include: "**/*.wgsl", }),
		typescript(),
		wasm({ maxFileSize: 1000000 })
	],
}
