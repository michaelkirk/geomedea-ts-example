const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    index: './src/index.ts',
    maplibreBasic: './src/maplibre/basic.ts',
    maplibreFiltered: './src/maplibre/filtered.ts',
    maplibreLarge: './src/maplibre/large.ts'
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '' },
      ],
    }),
  ],
};