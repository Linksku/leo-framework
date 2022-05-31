const AutoPrefixer = require('autoprefixer');
const CSSNano = require('cssnano');

const plugins = [
  AutoPrefixer,
  ...(process.env.NODE_ENV === 'production'
    ? [CSSNano({
      preset: [
        'default',
        { discardComments: { removeAll: true } },
      ],
    })]
    : []),
];

module.exports = {
  plugins,
};
