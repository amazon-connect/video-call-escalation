const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'index_bundle.js'
    },
    module: {
        rules: [
            { 
                test: /\.(js)$/, 
                use: 'babel-loader',
                exclude: /node_modules/
            },
            { 
                test: /\.css$/, 
                use: ['style-loader', 'css-loader'] 
            },
        ]
    },
    plugins: [
        new CleanWebpackPlugin({verbose: true}),
        new HtmlWebpackPlugin({
            template: 'src/index.html'
        }),
    ]
}