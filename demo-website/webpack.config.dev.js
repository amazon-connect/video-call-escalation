const { merge } = require('webpack-merge')
const commonConfig = require('./webpack.config.common')

module.exports = merge(commonConfig, {
  mode: 'development',
  devtool: 'source-map',
  output: { publicPath: '/' },
  devServer: {
    static: './',
    open: ['demo-website.html'],
  }
})