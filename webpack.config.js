const path = require('path');
const DashboardPlugin = require('webpack-dashboard/plugin');

module.exports = {
  entry: './src/inequality.ts',
  devtool: 'eval-source-map',
  optimization: {
    usedExports: true,
  },
  plugins: [
    new DashboardPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
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
    extensions: [ '.tsx', '.ts', '.js' ],
    alias: {
      'p5': 'node_modules/p5/lib/p5.min.js'
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'inequality',
    libraryTarget: 'umd'
  }
};