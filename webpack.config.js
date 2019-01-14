const path = require('path');

module.exports = [ {

  entry: './FRONTEND/FOR_MAIN_PAGE',

  output: {
    filename: 'MainPageBundle.js',
    path: path.resolve(__dirname, 'BACKEND/public/js/bundles/')
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015', 'stage-0', 'react', 'env']
        }
      }
    ]
  },
  devtool: 'cheap-inline-module-sourse-map'
} ];
