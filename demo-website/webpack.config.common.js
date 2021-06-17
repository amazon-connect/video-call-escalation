const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    plugins: [
        new CleanWebpackPlugin({ verbose: false }),
        new HtmlWebpackPlugin({
            template: __dirname + `/src/index.html`,
            filename: __dirname + `/build/demo-website.html`,
            inject: 'head',
            scriptLoading: 'blocking'
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
                type: 'asset/resource',
                generator: {
                    filename: 'demo-[name][ext]'
                }
            },
            {
                test: /\.(svg)$/,
                type: 'asset/source'
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
                            postcssOptions: {
                                plugins: ['precss', 'autoprefixer']
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                quietDeps: true
                            }
                        }
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