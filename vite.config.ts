/// <reference types="vitest" />
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [dts({ outputDir: 'dist/types' })],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			formats: ['es'],
		},
		rollupOptions: {
			external: ['react', 'react-router-dom'],
		},
	},
	test: {
		environment: 'happy-dom',
		globals: true,
		typecheck: {
			include: ['**/*.test-d.ts', '**/*.test.{ts,tsx}'],
		},
	},
});
