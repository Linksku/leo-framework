import TerserPlugin from 'terser-webpack-plugin';

export default function getTerserPlugin() {
  return new TerserPlugin({
    terserOptions: {
      ecma: 2017,
      module: true,
      compress: {
        passes: 2,
        // According to Vercel, these can cause bugs.
        comparisons: false,
        inline: 2,
      },
      output: {
        comments: false,
      },
      keep_classnames: true,
    },
    extractComments: false,
  });
}
