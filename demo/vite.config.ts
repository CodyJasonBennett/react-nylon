import * as path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'react-nylon': path.resolve(__dirname, '../src'),
    },
  },
})
