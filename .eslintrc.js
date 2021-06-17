const mapValues = require('lodash/mapValues');

const webGlobals = require('./web/config/globals');
const webSrcGlobals = require('./src/web/config/globals');
const serverGlobals = require('./server/config/globals');
const serverSrcGlobals = require('./src/server/config/globals');

// todo: low/mid speed up linting
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: 'tsconfig.json',
  },
  extends: [
    'airbnb',
    'plugin:@typescript-eslint/recommended',
    'plugin:unicorn/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'class-property',
    'css-modules',
    'unicorn',
  ],
  env: {
    node: true,
    browser: false,
    commonjs: true,
    es6: true,
  },
  ignorePatterns: ['*.scss.d.ts'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.tsx'],
      },
      alias: {
        extensions: ['.js', '.ts', '.tsx'],
      },
    },
  },
  globals: {
    self: false,
    process: false,
  },
  rules: {
    'react/jsx-filename-extension': 0,
    'react/no-unknown-property': [2, { ignore: ['class', 'for'] }],
    'no-underscore-dangle': 0,
    'no-multi-assign': 0,
    'object-curly-newline': [2, { consistent: true }],
    'react/prop-types': 0,
    'import/prefer-default-export': 1,
    'no-plusplus': 0,
    'default-case': 1,
    'react/no-unused-state': 2,
    'react/destructuring-assignment': 0,
    'no-param-reassign': 0,
    'jsx-a11y/media-has-caption': 1,
    'no-unused-expressions': 1, /* Temporarily disable until do expressions are supported. */
    'jsx-a11y/label-has-associated-control': [1, { assert: 'either' }],
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/no-noninteractive-element-interactions': 0,
    'lines-between-class-members': 0,
    'react/react-in-jsx-scope': 2,
    'no-await-in-loop': 1,
    'no-restricted-syntax': [2, 'ForInStatement', 'LabeledStatement', 'WithStatement'],
    'react/no-unused-prop-types': 2,
    'react/prefer-stateless-function': 1,
    eqeqeq: [2, 'always', {
      null: 'ignore',
    }],
    'react/jsx-one-expression-per-line': [2, { allow: 'single-child' }],
    'object-property-newline': [2, { allowAllPropertiesOnSameLine: true }],
    'max-len': [2, { code: 100, tabWidth: 2, ignoreTemplateLiterals: true, ignoreStrings: true, ignoreRegExpLiterals: true }],
    'react/jsx-child-element-spacing': 1,
    'react/jsx-no-bind': [2, { ignoreDOMComponents: false, ignoreRefs: false, allowArrowFunctions: true, allowFunctions: false, allowBind: false }],
    indent: [2, 2, {
      ObjectExpression: 'first',
      ArrayExpression: 'first',
      ImportDeclaration: 'first',
      FunctionExpression: { parameters: 'first' },
      SwitchCase: 1,
    }],
    'no-console': [2, {
      allow: ['info', 'warn', 'error', 'assert', 'time', 'timeEnd', 'timeStamp'],
    }],
    'no-debugger': 2,
    'no-dupe-args': 2,
    'no-dupe-keys': 2,
    'no-extra-parens': [2, 'functions'],
    'no-extra-semi': 2,
    'no-func-assign': 2,
    'no-duplicate-case': 2,
    'no-empty-character-class': 2,
    'no-ex-assign': 2,
    'no-extra-boolean-cast': 2,
    'no-invalid-regexp': 2,
    'no-irregular-whitespace': 2,
    'no-negated-in-lhs': 2,
    'no-obj-calls': 2,
    'no-regex-spaces': 2,
    'no-sparse-arrays': 2,
    'no-unreachable': 2,
    'use-isnan': 2,
    'valid-typeof': 2,
    'accessor-pairs': [2, { setWithoutGet: true }],
    'consistent-return': 2,
    curly: [2, 'all'],
    'no-alert': 0,
    'no-caller': 2,
    'no-empty-pattern': 2,
    'no-eval': 2,
    'no-extend-native': 2,
    'no-extra-bind': 2,
    'no-fallthrough': 2,
    'no-floating-decimal': 2,
    'no-implied-eval': 2,
    'no-labels': [2, { allowLoop: true, allowSwitch: true }],
    'no-lone-blocks': 2,
    'no-multi-str': 2,
    'no-native-reassign': [2, { exceptions: ['Map', 'Set'] }],
    'no-new-func': 2,
    'no-new': 2,
    'no-new-wrappers': 2,
    'no-octal-escape': 2,
    'no-octal': 2,
    'no-proto': 2,
    'no-script-url': 2,
    'no-self-compare': 2,
    'no-sequences': 2,
    'no-throw-literal': 2,
    'no-useless-call': 2,
    'no-useless-concat': 2,
    radix: 2,
    'no-catch-shadow': 2,
    'no-delete-var': 2,
    'no-label-var': 2,
    'no-shadow-restricted-names': 2,
    'no-undef': 0, // Typescript doesn't work well with this yet.
    'array-bracket-spacing': 2,
    'brace-style': [2, '1tbs', { allowSingleLine: true }],
    'comma-spacing': [2, { before: false, after: true }],
    'comma-style': [2, 'last'],
    'computed-property-spacing': [2, 'never'],
    'jsx-quotes': [2, 'prefer-double'],
    'keyword-spacing': 2,
    'new-parens': 2,
    'no-array-constructor': 2,
    'no-bitwise': 2,
    'no-mixed-spaces-and-tabs': 2,
    'no-new-object': 2,
    'no-spaced-func': 2,
    'no-unneeded-ternary': 2,
    'one-var': [2, { initialized: 'never' }],
    'operator-assignment': [2, 'always'],
    quotes: [
      2,
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'semi-spacing': [2, { before: false, after: true }],
    semi: [2, 'always'],
    'space-before-blocks': [2, 'always'],
    'space-infix-ops': [2, { int32Hint: true }],
    'space-unary-ops': [2, { words: true, nonwords: false }],
    'arrow-spacing': [2, { before: true, after: true }],
    'constructor-super': 2,
    'no-class-assign': 2,
    'no-const-assign': 2,
    'no-dupe-class-members': 2,
    'no-this-before-super': 2,
    'no-useless-computed-key': 2,
    'react/jsx-equals-spacing': 2,
    'react/jsx-no-duplicate-props': 2,
    'react/jsx-no-undef': [2, { allowGlobals: true }],
    'react/jsx-uses-vars': 2,
    'react/no-is-mounted': 2,
    'jsx-a11y/aria-props': 2,
    'jsx-a11y/aria-role': 2,
    'jsx-a11y/interactive-supports-focus': [
      2,
      {
        tabbable: [
          'button',
          'checkbox',
          'link',
          'searchbox',
          'spinbutton',
          'switch',
          'textbox',
        ],
      },
    ],
    'jsx-a11y/no-interactive-element-to-noninteractive-role': [
      2,
      {
        tr: ['none', 'presentation'],
      },
    ],
    'jsx-a11y/no-noninteractive-element-to-interactive-role': [
      2,
      {
        ul: ['listbox', 'menu', 'menubar',
             'radiogroup', 'tablist', 'tree', 'treegrid'],
        ol: ['listbox', 'menu', 'menubar',
             'radiogroup', 'tablist', 'tree', 'treegrid'],
        li: ['menuitem', 'option', 'row', 'tab', 'treeitem'],
        table: ['grid'],
        td: ['gridcell'],
      },
    ],
    'jsx-a11y/no-noninteractive-tabindex': 2,
    'jsx-a11y/no-static-element-interactions': [
      2,
      {
        handlers: ['onClick'],
      },
    ],
    'jsx-a11y/role-has-required-aria-props': 2,
    'jsx-a11y/role-supports-aria-props': 2,
    'jsx-a11y/tabindex-no-positive': 2,
    'class-property/class-property-semicolon': 2,
    'react/sort-comp': [2, {
      order: [
        'static-methods',
        'instance-variables',
        'lifecycle',
        '/^_([^r]|r[^e]|re[^n]|ren[^d]|rend[^e]|rende[^r]).+$/',
        '/^_render.+$/',
        'render',
        '/^[a-z].+$/',
      ], /* Doesn't support instance variables properly yet. */
    }],
    'css-modules/no-unused-class': 2,
    'css-modules/no-undef-class': 2,
    'prefer-const': [1, { destructuring: 'all' }],
    'class-methods-use-this': 0,
    'react/static-property-placement': [2, 'static public field'],
    'react/jsx-props-no-spreading': 0,
    'react/state-in-constructor': 0,
    'no-mixed-operators': [2, {
      groups: [
        ['+', '-', '*', '/', '%', '**'],
        ['&', '|', '^', '~', '<<', '>>', '>>>'],
        ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
        ['&&', '||'],
        ['in', 'instanceof'],
      ],
      allowSamePrecedence: true,
    }],
    'arrow-parens': [2, 'as-needed'],
    'no-continue': 0,
    'prefer-arrow-callback': [2, { allowNamedFunctions: true }],
    'prefer-destructuring': [2, { array: false, object: true }],
    'react-hooks/rules-of-hooks': 2,
    'react-hooks/exhaustive-deps': 2,
    'no-empty': [2, {
      allowEmptyCatch: true,
    }],
    'no-unused-vars': 0,
    '@typescript-eslint/no-unused-vars': [2, {
      args: 'after-used',
      varsIgnorePattern: '^(_|styles$)',
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/ban-ts-comment': [1, {
      'ts-expect-error': true,
      'ts-ignore': true,
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 3,
    }],
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/no-floating-promises': [1, {
      ignoreVoid: true,
      ignoreIIFE: true,
    }],
    '@typescript-eslint/promise-function-async': 1,
    '@typescript-eslint/no-misused-promises': [1, {
      checksVoidReturn: false,
    }],
    '@typescript-eslint/return-await': 2,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/no-empty-function': 0,
    'import/extensions': [2, 'ignorePackages', {
      js: 'never',
      jsx: 'never',
      ts: 'never',
      tsx: 'never',
    }],
    'import/no-extraneous-dependencies': [2, {
      devDependencies: true,
      packageDir: ['.', './src'],
    }],
    'react/require-default-props': [2, { ignoreFunctionalComponents: true }],
    'jsx-a11y/accessible-emoji': 0,
    'unicorn/prevent-abbreviations': 0,
    'unicorn/catch-error-name': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-null': 0,
    'unicorn/prefer-query-selector': 0,
    'unicorn/explicit-length-check': 0,
    'unicorn/better-regex': 1,
    'unicorn/no-fn-reference-in-iterator': 1,
    'unicorn/no-process-exit': 1,
    'unicorn/no-reduce': 1,
    'unicorn/consistent-function-scoping': 1,
    'unicorn/no-array-reduce': 0,
    'unicorn/consistent-destructuring': 0,
    'unicorn/prefer-module': 0,
    'unicorn/prefer-switch': 0,
    'unicorn/prefer-node-protocol': 0,
    'max-statements-per-line': [2, { max: 1 }],
    'no-void': [2, { allowAsStatement: true }],
    'max-classes-per-file': 0,
    'no-use-before-define': 1,
    'unicorn/prefer-array-flat-map': 1,
  },
  overrides: [
    {
      files: [
        'web/**/*.js',
        'src/web/**/*.js',
        'web/**/*.ts',
        'src/web/**/*.ts',
        'web/**/*.tsx',
        'src/web/**/*.tsx',
      ],
      env: {
        browser: true,
        node: false,
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'src/web',
              'src/shared',
              'web',
              'shared',
            ],
          },
          alias: {
            map: [
              ['config', './src/web/config'],
              ['config', './src/shared/config'],
            ],
          },
        },
      },
      rules: {
        'no-restricted-imports': [2, { patterns: [
          'lodash',
          'lodash/*',
          // 'react-use',
          'react-use/lib/useAsync', // lib/hooks/useAsync
          'react-use/lib/useEvent', // too many add/remove event listeners
        ] }],
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(webSrcGlobals, () => false),
        ...mapValues(webGlobals, () => false),
      },
    },
    {
      files: [
        'web/**/*.js',
        'web/**/*.ts',
        'web/**/*.tsx',
      ],
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'web',
              'shared',
            ],
          },
        },
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(webGlobals, () => false),
      },
    },
    {
      files: [
        'server/**/*.js',
        'src/server/**/*.js',
        'server/**/*.ts',
        'src/server/**/*.ts',
      ],
      rules: {
        'no-console': 0,
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'src/server',
              'src/shared',
              'server',
              'shared',
            ],
          },
          alias: {
            map: [
              ['config', './src/server/config'],
              ['config', './src/shared/config'],
            ],
          },
        },
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(serverSrcGlobals, () => false),
        ...mapValues(serverGlobals, () => false),
      },
    },
    {
      files: [
        'server/**/*.js',
        'server/**/*.ts',
      ],
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'server',
              'shared',
            ],
          },
        },
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(serverGlobals, () => false),
      },
    },
    {
      files: [
        'shared/**/*.js',
        'src/shared/**/*.js',
        'shared/**/*.ts',
        'src/shared/**/*.ts',
      ],
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'src/shared',
              'shared',
            ],
          },
          alias: {
            map: [
              ['config', './src/shared/config'],
            ],
          },
        },
      },
    },
    {
      files: [
        'shared/**/*.js',
        'shared/**/*.ts',
      ],
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'shared',
            ],
          },
        },
      },
    },
  ],
};
