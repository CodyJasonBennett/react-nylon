import * as path from 'node:path'
import * as vite from 'vite'

const mangleMap: Record<string, string> = {}

export default vite.defineConfig({
  root: process.argv[2] ? undefined : 'demo',
  resolve: {
    alias: {
      'react-nylon': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    sourcemap: true,
    target: 'es2020',
    lib: {
      formats: ['es', 'cjs'],
      entry: 'src/index.ts',
      fileName: '[name]',
    },
    rollupOptions: {
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        sourcemapExcludeSources: true,
        exports: 'named',
      },
    },
  },
  plugins: [
    {
      name: 'vite-tsc',
      generateBundle(_, bundle) {
        if (bundle['index.mjs']) {
          this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: `export * from '../src'` })
        }
      },
    },
    {
      name: 'vite-minify',
      transform(code, url) {
        if (!url.includes('node_modules')) {
          for (const key in mangleMap) code = code.replaceAll(key, mangleMap[key])
          return vite.transformWithEsbuild(code, url, {
            mangleProps: /^_[A-Za-z]\w+/,
            mangleQuoted: true,
          })
        }
      },
      renderChunk: {
        order: 'post',
        handler(code, { fileName }) {
          return vite.transformWithEsbuild(code, fileName, { minify: true })
        },
      },
    },
  ],
})
