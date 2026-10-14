const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-main',
  entry: {
    index: path.resolve(__dirname, 'src/main/index.ts'),
    preload: path.resolve(__dirname, 'src/main/preload.ts'),
  },
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: '[name].js',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  externals: [
    nodeExternals({
      allowlist: [],
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
  },
};
