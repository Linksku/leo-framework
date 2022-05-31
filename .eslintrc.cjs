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
    'no-underscore-dangle': 0,
    'no-multi-assign': 0,
    'object-curly-newline': [2, { consistent: true }],
    'no-plusplus': 0,
    'default-case': 1,
    'no-param-reassign': 0,
    'no-unused-expressions': 1, /* Temporarily disable until do expressions are supported. */
    'lines-between-class-members': 0,
    'no-restricted-syntax': [2, 'ForInStatement', 'WithStatement'],
    eqeqeq: [2, 'always', {
      null: 'ignore',
    }],
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
    'no-extra-parens': [2, 'functions'],
    'no-extra-semi': 2,
    'no-negated-in-lhs': 2,
    'valid-typeof': 2,
    'accessor-pairs': [2, { setWithoutGet: true }],
    curly: [2, 'all'],
    'no-alert': 2,
    'no-labels': [2, { allowLoop: true, allowSwitch: true }],
    'no-native-reassign': [2, { exceptions: ['Map', 'Set'] }],
    'no-useless-call': 2,
    'no-catch-shadow': 2,
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
    'no-array-constructor': 2,
    'no-unneeded-ternary': 2,
    'one-var': [2, { initialized: 'never' }],
    'operator-assignment': [2, 'always'],
    'operator-linebreak': [2, 'before'],
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
    'prefer-const': [1, { destructuring: 'all' }],
    'class-methods-use-this': 0,
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
    'max-statements-per-line': [2, { max: 1 }],
    'no-void': [2, { allowAsStatement: true }],
    'max-classes-per-file': 0,
    'no-use-before-define': 0,
    'no-loop-func': 0,
    'space-before-function-paren': 0,
    'function-paren-newline': 0,
    'no-restricted-exports': 0,
    'import/prefer-default-export': 0,
    'import/no-relative-packages': 0,
    'import/extensions': 0,
    // Disabling because adding `file:../` to `app/package.json` breaks yarn
    'import/no-extraneous-dependencies': [0, {
      devDependencies: false,
      packageDir: ['.', './app'],
    }],
    'import/no-self-import': 0,
    'import/no-unresolved': 0,
    'import/no-named-as-default-member': 0,
    'import/no-duplicates': 0,
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
      ignoreIIFE: false,
    }],
    // Too slow.
    '@typescript-eslint/await-thenable': 1,
    // Too slow.
    '@typescript-eslint/unbound-method': 1,
    '@typescript-eslint/promise-function-async': 0,
    // Too slow.
    '@typescript-eslint/no-misused-promises': [1, {
      checksVoidReturn: false,
    }],
    // Too slow.
    '@typescript-eslint/return-await': 1,
    // Too slow.
    '@typescript-eslint/require-await': 1,
    '@typescript-eslint/no-explicit-any': 0,
    // Use TS.defined
    '@typescript-eslint/no-non-null-assertion': 2,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/no-use-before-define': 2,
    '@typescript-eslint/space-before-function-paren': [2, {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],
    'react/jsx-filename-extension': [2, { extensions: ['.tsx'] }],
    'react/no-unknown-property': [2, { ignore: ['class', 'for'] }],
    'react/prop-types': 0,
    'react/no-unused-state': 0,
    'react/destructuring-assignment': 0,
    'react/react-in-jsx-scope': 0,
    'react/no-unused-prop-types': 0,
    'react/jsx-one-expression-per-line': [2, { allow: 'single-child' }],
    'react/jsx-child-element-spacing': 1,
    'react/jsx-no-bind': 0,
    'react/jsx-equals-spacing': 2,
    'react/jsx-no-duplicate-props': 2,
    'react/jsx-no-undef': [2, { allowGlobals: true }],
    'react/no-is-mounted': 0,
    'react/sort-comp': 0,
    'react/static-property-placement': 0,
    'react/jsx-props-no-spreading': 0,
    'react/state-in-constructor': 0,
    'react/require-default-props': 0,
    'react/jsx-no-useless-fragment': [2, { allowExpressions: true }],
    'react/no-unstable-nested-components': 0,
    'react/function-component-definition': 0,
    'react/prefer-exact-props': 0,
    'react/jsx-uses-react': 0,
    'react/no-deprecated': 0,
    'react/no-did-update-set-state': 0,
    'react/no-will-update-set-state': 0,
    'react/prefer-es6-class': 0,
    'react/require-render-return': 0,
    'react/no-find-dom-node': 0,
    'react/no-danger-with-children': 0,
    'react/no-redundant-should-component-update': 0,
    'react/no-access-state-in-setstate': 0,
    'react/no-arrow-function-lifecycle': 0,
    'react/no-unused-class-component-methods': 0,
    'react/forbid-component-props': 0,
    'react/no-multi-comp': 0,
    'react/no-string-refs': 0,
    'react/no-typos': 0,
    'react/prefer-stateless-function': 0,
    'react/default-props-match-prop-types': 0,
    'react/no-this-in-sfc': 0,
    'react/void-dom-elements-no-children': 0,
    'jsx-a11y/media-has-caption': 1,
    'jsx-a11y/label-has-associated-control': [1, { assert: 'either' }],
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/no-noninteractive-element-interactions': 0,
    'jsx-a11y/accessible-emoji': 0,
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
    'jsx-a11y/anchor-is-valid': [2, { components: [] }],
    'css-modules/no-unused-class': 2,
    'css-modules/no-undef-class': 2,
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
    'unicorn/consistent-function-scoping': 0,
    'unicorn/no-array-reduce': 0,
    'unicorn/consistent-destructuring': 0,
    'unicorn/prefer-module': 0,
    'unicorn/prefer-switch': 0,
    'unicorn/prefer-node-protocol': 0,
    'unicorn/no-useless-undefined': 0,
    'unicorn/text-encoding-identifier-case': 0,
    'unicorn/prefer-array-flat-map': 1,
    'unicorn/template-indent': 0,
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
