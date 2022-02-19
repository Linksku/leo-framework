const yargs = require('yargs');
const mapValues = require('lodash/mapValues');

const webGlobals = require('./framework/web/config/globals.cjs');
const webSrcGlobals = require('./app/web/config/globals.cjs');
const serverGlobals = require('./framework/server/config/globals.cjs');
const serverSrcGlobals = require('./app/server/config/globals.cjs');
const sharedGlobals = require('./framework/shared/config/globals.cjs');
const sharedSrcGlobals = require('./app/shared/config/globals.cjs');

const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      impliedStrict: true,
    },
    // All .js and .cjs files are handled by scripts/tsconfig
    // .ts and .tsx files are handled by [web,server,shared]/tsconfig
    project: 'scripts/tsconfig.json',
    extraFileExtensions: [
      '.cjs',
    ],
  },
  extends: [
    'airbnb',
    'airbnb/hooks',
    'plugin:@typescript-eslint/recommended',
    'plugin:unicorn/recommended',
  ],
  plugins: [
    '@typescript-eslint',
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
        extensions: ['.js', '.ts', '.tsx', '.cjs'],
      },
      alias: {
        extensions: ['.js', '.ts', '.tsx', '.cjs'],
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
    'import/prefer-default-export': 0,
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
    'no-await-in-loop': 2,
    'no-restricted-syntax': [2, 'ForInStatement', 'WithStatement'],
    'react/no-unused-prop-types': 2,
    'react/prefer-stateless-function': 1,
    eqeqeq: [2, 'always', {
      null: 'ignore',
    }],
    'react/jsx-one-expression-per-line': [2, { allow: 'single-child' }],
    'object-property-newline': [2, { allowAllPropertiesOnSameLine: true }],
    'max-len': [2, {
      code: 100,
      comments: 200,
      tabWidth: 2,
      ignoreTemplateLiterals: true,
      ignoreStrings: true,
      ignoreRegExpLiterals: true,
      ignoreUrls: true,
    }],
    'react/jsx-child-element-spacing': 1,
    'react/jsx-no-bind': [2, { ignoreDOMComponents: false, ignoreRefs: false, allowArrowFunctions: true, allowFunctions: false, allowBind: false }],
    indent: [2, 2, {
      ObjectExpression: 'first',
      ArrayExpression: 'first',
      ImportDeclaration: 'first',
      FunctionExpression: { parameters: 'first' },
      SwitchCase: 1,
      ignoredNodes: ['TemplateLiteral > *'],
    }],
    'no-console': [2, {
      allow: ['assert', 'time', 'timeEnd', 'timeStamp'],
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
    'no-shadow': [2, {
      builtinGlobals: false,
      hoist: 'functions',
      allow: ['_'],
    }],
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
    '@typescript-eslint/ban-ts-comment': [2, {
      'ts-expect-error': true,
      'ts-ignore': 'allow-with-description',
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 3,
    }],
    '@typescript-eslint/explicit-module-boundary-types': 0,
    // Too slow.
    '@typescript-eslint/no-floating-promises': [1, {
      ignoreVoid: true,
      ignoreIIFE: true,
    }],
    // Too slow.
    '@typescript-eslint/await-thenable': 1,
    // Too slow.
    '@typescript-eslint/unbound-method': 1,
    '@typescript-eslint/promise-function-async': 0,
    '@typescript-eslint/no-misused-promises': [1, {
      checksVoidReturn: false,
    }],
    '@typescript-eslint/return-await': 2,
    '@typescript-eslint/no-explicit-any': 0,
    // Use TS.defined
    '@typescript-eslint/no-non-null-assertion': 2,
    '@typescript-eslint/no-empty-function': 0,
    'import/extensions': 0,
    // Disabling because adding `file:../` to `app/package.json` breaks yarn
    'import/no-extraneous-dependencies': [0, {
      devDependencies: false,
      packageDir: ['.', './app'],
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
    'unicorn/no-useless-undefined': 0,
    'max-statements-per-line': [2, { max: 1 }],
    'no-void': [2, { allowAsStatement: true }],
    'max-classes-per-file': 0,
    'no-use-before-define': 0,
    '@typescript-eslint/no-use-before-define': 2,
    'unicorn/prefer-array-flat-map': 1,
    'require-await': 0,
    '@typescript-eslint/require-await': 2,
    'no-loop-func': 0,
    'space-before-function-paren': 0,
    '@typescript-eslint/space-before-function-paren': [2, {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],
    'function-paren-newline': 0,
    'no-restricted-exports': 0,
    'react/jsx-no-useless-fragment': [2, { allowExpressions: true }],
    'react/no-unstable-nested-components': 0,
    'react/function-component-definition': [2, {
      namedComponents: 'function-declaration',
      unnamedComponents: 'arrow-function',
    }],
    'import/no-relative-packages': 0,
  },
  overrides: [
    {
      files: [
        'framework/web/**/*.ts',
        'app/web/**/*.ts',
        'framework/web/**/*.tsx',
        'app/web/**/*.tsx',
      ],
      parserOptions: {
        project: 'app/web/tsconfig.json',
      },
      env: {
        browser: true,
        node: false,
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'app/web',
              'app/shared',
              'framework/web',
              'framework/shared',
            ],
          },
          alias: {
            map: [
              ['config', './app/web/config'],
              ['config', './app/shared/config'],
            ],
          },
        },
      },
      rules: {
        'no-restricted-imports': [2, { patterns: [
          'lodash',
          'lodash/*',
          'react-use', // Inefficient library.
        ] }],
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(sharedSrcGlobals, () => false),
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(webSrcGlobals, () => false),
        ...mapValues(webGlobals, () => false),
      },
    },
    {
      files: [
        'framework/web/**/*.ts',
        'framework/web/**/*.tsx',
      ],
      parserOptions: {
        project: process.env.VSCODE_PID
          ? 'app/web/tsconfig.json'
          : 'framework/web/tsconfig.json',
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'framework/web',
              'framework/shared',
            ],
          },
        },
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(webGlobals, () => false),
      },
    },
    {
      files: [
        'framework/server/**/*.ts',
        'app/server/**/*.ts',
      ],
      parserOptions: {
        project: 'app/server/tsconfig.json',
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'app/server',
              'app/shared',
              'framework/server',
              'framework/shared',
            ],
          },
          alias: {
            map: [
              ['config', './app/server/config'],
              ['config', './app/shared/config'],
            ],
          },
        },
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(sharedSrcGlobals, () => false),
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(serverSrcGlobals, () => false),
        ...mapValues(serverGlobals, () => false),
      },
    },
    {
      files: [
        'framework/server/**/*.ts',
      ],
      parserOptions: {
        project: process.env.VSCODE_PID
          ? 'app/server/tsconfig.json'
          : 'framework/server/tsconfig.json',
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'framework/server',
              'framework/shared',
            ],
          },
        },
      },
      globals: {
        self: false,
        process: false,
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(serverGlobals, () => false),
      },
    },
    {
      files: [
        'framework/shared/**/*.ts',
        'app/shared/**/*.ts',
      ],
      parserOptions: {
        project: 'app/shared/tsconfig.json',
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'app/shared',
              'framework/shared',
            ],
          },
          alias: {
            map: [
              ['config', './app/shared/config'],
            ],
          },
        },
      },
    },
    {
      files: [
        'framework/shared/**/*.ts',
      ],
      parserOptions: {
        project: process.env.VSCODE_PID
          ? 'app/shared/tsconfig.json'
          : 'framework/shared/tsconfig.json',
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'framework/shared',
            ],
          },
        },
      },
    },
    {
      files: [
        'framework/server/scripts/**/*.ts',
        'app/server/scripts/**/*.ts',
      ],
      rules: {
        'no-console': 0,
        'no-await-in-loop': 0,
        'unicorn/no-process-exit': 0,
      },
    },
  ],
};

const { argv } = yargs(process.argv);
if ('quiet' in argv && argv.quiet) {
  for (const [k, v] of Object.entries(config.rules)) {
    if (v === 1) {
      config.rules[k] = 0;
    } else if (Array.isArray(v) && v[0] === 1) {
      v[0] = 0;
    }
  }
}

module.exports = config;
