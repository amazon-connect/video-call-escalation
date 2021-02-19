const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const app = process.env.npm_config_app || 'demo_website'

module.exports = {
        plugins: [
            new CleanWebpackPlugin({verbose: true}),
            new HtmlWebpackPlugin({
                template: __dirname + `/src/index.html`,
                filename: __dirname + `/build/demo-website.html`,
                inlineSource: '.(css)$',
                inject: 'head'
            })
        ],
        entry: [path.resolve(__dirname, 'src') + '/meeting.js'],
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: 'demo-bundle.js'
        },
        module: {
            rules: [
                {
                    test: /\.(png|jpg|gif)$/i,
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                limit: 81920,
                                name: 'demo-[name].[ext]'
                            },
                        },
                    ]
                },
                {
                    test: /\.(svg)$/,
                    loader: 'raw-loader',
                },
                {
                    test: /\.(scss)$/,
                    use: [
                        {
                            loader: 'style-loader',
                            options: { insert: 'head' }
                        },
                        {
                            loader: 'css-loader'
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                plugins: function () {
                                    return [require('precss'), require('autoprefixer')]
                                }
                            }
                        },
                        {
                            loader: 'sass-loader'
                        }
                    ]
                },
                {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                            plugins: ['@babel/plugin-proposal-class-properties', "@babel/transform-runtime"]
                        }
                    }
                }
            ]
        }
}