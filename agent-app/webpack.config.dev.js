const { merge } = require('webpack-merge')
const commonConfig = require('./webpack.config.common')

module.exports = merge(commonConfig, {
  mode: 'development',
  devtool: 'source-map',
  output: { publicPath: '/' },
  devServer: {
    open: true,
    historyApiFallback: true
  }
})