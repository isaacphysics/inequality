const path = require('path');
const DashboardPlugin = require('webpack-dashboard/plugin');

module.exports = (_env, argv) => { return {
  entry: './src/Inequality.ts',
  devtool: argv.mode === 'development' ? 'source-map' : false,
  optimization: {
    usedExports: true,
  },
  plugins: [
    // new DashboardPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } }, 'ts-loader'],
        exclude: /node_modules/
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'fonts',
            },
          }
        ]
      }
    ]
  },
  resolve: {
    modules: [path.resolve(__dirname), 'node_modules'],
    extensions: [ '.ts', '.js' ],
    // alias: {
    //   'p5': 'p5/lib/p5.min.js'
    // }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'lib'),
    library: {
      name: 'inequality',
      type: 'umd',
    }
  },
  externals: [
    /^lodash\/?.*$/,
    /^p5\/?.*$/
  ]
}};