module.exports = {
  extends: 'stylelint-config-standard',
  plugins: [
    'stylelint-scss',
    'stylelint-no-unsupported-browser-features',
  ],
  rules: {
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': [true, {
      ignoreAtRules: ['charset', 'import', 'namespace', 'media', 'supports', 'document', 'page', 'font-face', 'keyframes', 'viewport', 'counter-style', 'font-feature-values', 'swash', 'ornaments', 'annotation', 'stylistic', 'styleset', 'character-variant', 'value'],
    }],
    'selector-pseudo-class-no-unknown': [true, {
      ignorePseudoClasses: ['global', 'export', 'import', 'local'],
    }],
    'no-empty-source': null,
    'plugin/no-unsupported-browser-features': [true, {
      browsers: [
        'last 10 versions',
        'not < 0.1%',
        'not dead',
        'not ie > 0',
        'not op_mini all',
        'not edge < 70',
        'not samsung < 9',
      ],
      ignore: ['css3-cursors-newer'],
    }],
    'at-rule-empty-line-before': null,
    'value-keyword-case': null,
    'declaration-property-unit-allowed-list': {
      'font-size': ['em', 'rem', 'lh', 'rlh'],
      'line-height': ['px', 'rem'],
    },
  },
};
