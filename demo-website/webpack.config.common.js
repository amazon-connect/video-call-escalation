const path = require('path');

const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');

const app = process.env.npm_config_app || 'demo_website'

module.exports = {
        plugins: [
            new HtmlWebpackPlugin({
                inlineSource: '.(js|css)$',
                template: __dirname + `/src/index.html`,
                filename: __dirname + `/build/demo-website.html`,
                inject: 'head'
            }),
            new HtmlWebpackInlineSourcePlugin(),
            new RemovePlugin({
                after: {
                    include: ['./build/demo-bundle.js']
                }
            })
        ],
        entry: ['babel-polyfill', path.resolve(__dirname, 'src') + '/meeting.js'],
        resolve: {
            extensions: ['.webpack.js', '.web.js', '.js'],
        },
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: 'demo-bundle.js',
            libraryTarget: 'var',
            library: `app_${app}`,
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
                            plugins: ['@babel/plugin-proposal-class-properties']
                        }
                    }
                }
            ]
        }
}