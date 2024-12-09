import * as path from 'node:path'

import type { Configuration } from 'webpack'

import { rules } from './webpack.rules'
import { plugins } from './webpack.plugins'

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
})

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    alias: {
      '@renderer': path.resolve(process.cwd(), 'src/renderer'),
      '@shared': path.resolve(process.cwd(), 'src/shared'),
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
}
