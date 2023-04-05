const lowerCamelCase = '^[a-z][a-zA-Z0-9]+$';

module.exports = {
  extends: 'stylelint-config-standard-scss',
  plugins: [
    'stylelint-scss',
    'stylelint-no-unsupported-browser-features',
  ],
  rules: {
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': [true, {
      ignoreAtRules: [
        'charset',
        'import',
        'namespace',
        'media',
        'supports',
        'document',
        'page',
        'font-face',
        'keyframes',
        'viewport',
        'counter-style',
        'font-feature-values',
        'swash',
        'ornaments',
        'annotation',
        'stylistic',
        'styleset',
        'character-variant',
        'value',
      ],
    }],
    'selector-pseudo-class-no-unknown': [true, {
      ignorePseudoClasses: ['global', 'export', 'import', 'local'],
    }],
    'no-empty-source': null,
    'plugin/no-unsupported-browser-features': [true, {
      browsers: [
        'last 3 years',
        'last 1 version and last 10 years',
        'not < 0.1%',
        'not ie > 0',
        'not op_mini all',
        'not and_qq > 0',
        'not and_uc > 0',
      ],
      ignore: [
        'css3-cursors-newer',
        'css-touch-action',
        'pointer',
      ],
    }],
    'at-rule-empty-line-before': null,
    'value-keyword-case': null,
    'declaration-property-unit-allowed-list': {
      'font-size': ['em', 'rem', 'lh', 'rlh'],
      'line-height': ['px', 'rem'],
    },
    'selector-class-pattern': lowerCamelCase,
    'scss/dollar-variable-pattern': lowerCamelCase,
    'scss/at-mixin-pattern': lowerCamelCase,
    'scss/percent-placeholder-pattern': lowerCamelCase,
    'keyframes-name-pattern': lowerCamelCase,
    'string-quotes': 'single',
    'scss/dollar-variable-empty-line-before': null,
    'scss/double-slash-comment-empty-line-before': null,
    'shorthand-property-no-redundant-values': null,
    'selector-attribute-quotes': null,
    'declaration-colon-newline-after': null,
    'declaration-block-no-redundant-longhand-properties': [true, {
      // Temporary because of low support
      ignoreShorthands: ['inset'],
    }],
  },
};
