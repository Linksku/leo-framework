const AutoPrefixer = require('autoprefixer');
const CSSNano = require('cssnano');

const plugins = [
  AutoPrefixer,
];

if (process.env.NODE_ENV === 'production') {
  plugins.push(
    CSSNano({
      preset: [
        'default',
        { discardComments: { removeAll: true } },
      ],
    }),
  );
}

module.exports = {
  plugins,
};
