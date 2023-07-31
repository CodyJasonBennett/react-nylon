import * as path from 'node:path'
import * as vite from 'vite'
import { minify } from 'shaderkit'

const uniforms: Record<string, string> = {
  time: 't',
  resolution: 'r',
  mouse: 'm',
}

export default vite.defineConfig({
  root: 'demo',
  resolve: {
    alias: {
      react:
        process.env.NODE_ENV === 'production'
          ? path.resolve(__dirname, 'node_modules/react/cjs/react.production.min.js')
          : 'react',
      'react-nylon': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    modulePreload: false,
    target: 'esnext',
  },
  plugins: [
    {
      name: 'glsl-minify',
      generateBundle(_, bundle) {
        for (const key in bundle) {
          const entry = bundle[key]
          if ('code' in entry) {
            for (const key in uniforms) {
              entry.code = entry.code.replaceAll(new RegExp(`\\b${key}\\b`, 'g'), uniforms[key])
            }

            entry.code = entry.code.replace(
              /`(#version[^`]+?)`/g,
              (_, shader) => `"${minify(shader).replaceAll('\n', '\\n')}"`,
            )
          }
        }
      },
    },
  ],
})
