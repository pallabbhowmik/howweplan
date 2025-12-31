import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'index.ts',
    'entities/index': 'entities/index.ts',
    'states/index': 'states/index.ts',
    'events/index': 'events/index.ts',
    'dtos/index': 'dtos/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
