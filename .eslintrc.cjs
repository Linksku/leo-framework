const yargs = require('yargs').default;
const mapValues = require('lodash/mapValues');
const confusingBrowserGlobals = require('confusing-browser-globals');

const webGlobals = require('./framework/web/config/globals.cjs');
const webAppGlobals = require('./app/web/config/globals.cjs');
const serverGlobals = require('./framework/server/config/globals.cjs');
const serverAppGlobals = require('./app/server/config/globals.cjs');
const sharedGlobals = require('./framework/shared/config/globals.cjs');
const sharedAppGlobals = require('./app/shared/config/globals.cjs');

// const isVsCode = !!process.env.VSCODE_PID || !!process.env.VSCODE_CWD;
const extensions = [
  '.js',
  '.ts',
  '.tsx',
  '.cjs',
  '.mjs',
  '.json',
];

const restrictedWebImports = [
  'moment',
  'lodash',
  'lodash/*',
  'react-use', // Inefficient library.
];

const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // All .js, .cjs, and .mjs files are handled by scripts/tsconfig
    // .ts and .tsx files are handled by [web,server,shared]/tsconfig
    project: 'scripts/tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
    },
  },
  plugins: [
    'eslint-plugin-local-rules',
  ],
  extends: [
    'airbnb',
    'plugin:unicorn/recommended',
  ],
  env: {
    node: true,
    browser: true,
    commonjs: true,
    es6: true,
  },
  ignorePatterns: [
    '/node_modules',
    '/app-template',
    '/build',
    '/tmp',
    '/temp',
    '/capacitor',
    '**/__generated__/*.ts',
    '*.scss.d.ts',
  ],
  settings: {
    'import/extensions': extensions,
    'import/resolver': {
      node: {
        extensions,
      },
      alias: {
        extensions,
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
    'no-plusplus': 0,
    'default-case': 0,
    'no-param-reassign': 0,
    'no-unused-expressions': 1, /* Temporarily disable until do expressions are supported. */
    'lines-between-class-members': 0,
    'no-restricted-syntax': [2, 'ForInStatement', 'WithStatement'],
    'no-restricted-globals': [
      2,
      'error',
      'isFinite',
      'isNaN',
      {
        name: 'requestIdleCallback',
        message: 'Use utils/requestIdleCallback',
      },
      {
        name: 'cancelIdleCallback',
        message: 'Use utils/requestIdleCallback',
      },
      ...confusingBrowserGlobals,
    ],
    eqeqeq: [2, 'always', {
      null: 'ignore',
    }],
    'object-curly-newline': [2, {
      minProperties: 4,
      consistent: true,
    }],
    'object-property-newline': [2, { allowAllPropertiesOnSameLine: true }],
    'max-len': [2, {
      code: 100,
      comments: 200,
      tabWidth: 2,
      ignoreTemplateLiterals: true,
      // Note: this allows any lines with short strings
      ignoreStrings: false,
      ignorePattern: '^import |\'(?:\\\\\'|[^\']){50,}|"(?:\\\\"|[^"]){50,}|`(?:\\\\`|[^`]){50,}|>[^<]{50,}</\\w',
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
        ['&&', '||', '??'],
        ['in', 'instanceof'],
      ],
      allowSamePrecedence: true,
    }],
    'arrow-parens': [2, 'as-needed'],
    'no-continue': 0,
    'prefer-arrow-callback': [2, { allowNamedFunctions: true }],
    'prefer-destructuring': [2, {
      VariableDeclarator: { array: false, object: true },
      AssignmentExpression: { array: false, object: false },
    }],
    'no-empty': [2, {
      allowEmptyCatch: true,
    }],
    'max-statements-per-line': [2, { max: 1 }],
    'max-classes-per-file': 0,
    'no-use-before-define': 0,
    'no-loop-func': 0,
    'space-before-function-paren': 0,
    'function-paren-newline': 0,
    'no-template-curly-in-string': 0,
    'no-restricted-exports': 0,
    // Same as @typescript-eslint/no-require-imports
    'global-require': 0,
    'no-constant-condition': 0,
    'prefer-template': 0,
    'import/prefer-default-export': 0,
    'import/no-relative-packages': 0,
    'import/extensions': 0,
    // Disabling because adding `file:../` to `app/package.json` breaks yarn
    'import/no-extraneous-dependencies': [0, {
      devDependencies: false,
      packageDir: ['./', './app/'],
    }],
    'import/no-self-import': 0,
    'import/no-unresolved': 0,
    'import/no-named-as-default': 0,
    'import/no-named-as-default-member': 0,
    'import/no-duplicates': 0,
    // Too slow.
    'import/no-cycle': 0,
    'import/order': [2, {
      groups: [
        'builtin',
        [
          'external',
          'internal',
          'unknown',
        ],
        [
          'parent',
          'sibling',
          'index',
        ],
      ],
      pathGroups: [
        {
          pattern: '**',
          group: 'internal',
        },
        {
          pattern: '*.scss',
          patternOptions: {
            dot: true,
            nocomment: true,
            matchBase: true,
          },
          group: 'sibling',
          position: 'after',
        },
      ],
      pathGroupsExcludedImportTypes: ['builtin', 'object'],
    }],
    'unicorn/prevent-abbreviations': 0,
    'unicorn/catch-error-name': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-null': 0,
    'unicorn/prefer-query-selector': 0,
    'unicorn/explicit-length-check': 0,
    'unicorn/better-regex': [2, {
      sortCharacterClasses: false,
    }],
    'unicorn/no-fn-reference-in-iterator': 1,
    'unicorn/no-process-exit': 1,
    'unicorn/consistent-function-scoping': 0,
    'unicorn/no-array-reduce': 0,
    'unicorn/consistent-destructuring': 1,
    // Same as @typescript-eslint/no-require-imports
    'unicorn/prefer-module': 0,
    'unicorn/prefer-switch': 0,
    'unicorn/prefer-node-protocol': 0,
    'unicorn/no-useless-undefined': 0,
    'unicorn/text-encoding-identifier-case': 0,
    'unicorn/prefer-array-flat-map': 2,
    'unicorn/template-indent': 0,
    // EventEmitter is ~10x faster
    'unicorn/prefer-event-target': 0,
    'unicorn/prefer-spread': 0,
    'unicorn/prefer-ternary': [1, 'only-single-line'],
    'unicorn/no-negated-condition': 0,
    'unicorn/switch-case-braces': [2, 'avoid'],
    'unicorn/no-array-push-push': 0,
    'unicorn/no-for-loop': 0,
    // Array.includes is faster unless length > 10k
    'unicorn/prefer-set-has': 0,
    // Causes error
    'unicorn/expiring-todo-comments': 0,
    // False positive
    'unicorn/no-empty-file': 0,
    // Low browser support
    'unicorn/prefer-modern-math-apis': 0,
    'unicorn/no-thenable': 0,
    'unicorn/prefer-top-level-await': 0,
    'unicorn/no-await-expression-member': 0,
    // Low browser support
    'unicorn/prefer-string-replace-all': 0,
    'unicorn/no-unnecessary-polyfills': 0,
    'unicorn/prefer-string-raw': 0,
    'unicorn/consistent-existence-index-check': 0,
    'unicorn/prefer-global-this': 0,
  },
  overrides: [
    {
      files: [
        '*.ts',
        '*.tsx',
      ],
      plugins: [
        '@typescript-eslint',
        '@stylistic/eslint-plugin',
      ],
      extends: [
        // 'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-type-checked',
      ],
      rules: {
        'no-unused-vars': 0,
        '@typescript-eslint/no-unused-vars': [2, {
          args: 'after-used',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        }],
        '@typescript-eslint/indent': 0,
        camelcase: 0,
        '@typescript-eslint/naming-convention': [
          1,
          {
            selector: 'variable',
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'function',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
            leadingUnderscore: 'allow',
          },
        ],
        'no-shadow': 0,
        '@typescript-eslint/no-shadow': [2, {
          builtinGlobals: false,
          hoist: 'functions',
          allow: ['_'],
        }],
        'comma-dangle': 0,
        '@stylistic/comma-dangle': [2, 'always-multiline'],
        semi: 0,
        '@stylistic/semi': [2, 'always'],
        quotes: 0,
        '@stylistic/quotes': [
          2,
          'single',
          {
            avoidEscape: true,
          },
        ],
        '@stylistic/space-before-function-paren': [2, {
          anonymous: 'never',
          named: 'never',
          asyncArrow: 'always',
        }],
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/ban-ts-comment': [2, {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 3,
        }],
        // todo: low/med enable explicit-module-boundary-types
        '@typescript-eslint/explicit-module-boundary-types': 0,
        // Too slow.
        '@typescript-eslint/no-floating-promises': [2, {
          ignoreVoid: false,
          ignoreIIFE: false,
        }],
        // Too slow.
        '@typescript-eslint/await-thenable': 1,
        // Too slow.
        '@typescript-eslint/unbound-method': 0,
        '@typescript-eslint/promise-function-async': 0,
        // Too slow.
        '@typescript-eslint/no-misused-promises': [2, {
          checksVoidReturn: false,
        }],
        // Too slow.
        '@typescript-eslint/return-await': 1,
        // Too slow.
        '@typescript-eslint/require-await': 1,
        '@typescript-eslint/no-explicit-any': 0,
        // Use TS.defined
        '@typescript-eslint/no-non-null-assertion': 2,
        '@typescript-eslint/no-empty-function': 2,
        '@typescript-eslint/no-use-before-define': 2,
        '@typescript-eslint/no-unsafe-member-access': 1,
        '@typescript-eslint/no-unsafe-assignment': 0,
        '@typescript-eslint/no-unsafe-return': 0,
        '@typescript-eslint/no-unsafe-argument': 0,
        '@typescript-eslint/no-unsafe-call': 1,
        '@typescript-eslint/no-unsafe-enum-comparison': 0,
        '@typescript-eslint/no-unnecessary-type-assertion': 1,
        '@typescript-eslint/no-base-to-string': 1,
        '@typescript-eslint/restrict-template-expressions': 0,
        '@typescript-eslint/restrict-plus-operands': 1,
        '@typescript-eslint/no-empty-object-type': 2,
        '@typescript-eslint/no-unsafe-function-type': 1,
      },
    },
    // Web
    {
      files: [
        'app/web/**/*.ts',
        'app/web/**/*.tsx',
        'framework/web/**/*.ts',
        'framework/web/**/*.tsx',
      ],
      plugins: [
        'css-modules',
      ],
      extends: [
        'airbnb/hooks',
        'plugin:css-modules/recommended', // Doesn't work anymore
      ],
      rules: {
        'local-rules/no-nullish-coalescing-assignment': 2,
        'local-rules/react-max-hooks-per-component': 2,
        'no-restricted-imports': [2, { patterns: restrictedWebImports }],
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
        'react/no-find-dom-node': 2,
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
        'react/jsx-no-target-blank': 0,
        'react/jsx-no-constructed-context-values': 0,
        'jsx-a11y/label-has-associated-control': [1, { assert: 'either' }],
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
        'jsx-a11y/no-noninteractive-element-to-interactive-role': 0,
        'jsx-a11y/no-noninteractive-tabindex': 2,
        'jsx-a11y/no-static-element-interactions': [
          2,
          {
            handlers: ['onClick'],
          },
        ],
        'jsx-a11y/anchor-is-valid': [2, { components: [] }],
        // Temp
        'jsx-a11y/media-has-caption': 0,
        // Temp
        'jsx-a11y/click-events-have-key-events': 0,
      },
    },
    // App web
    {
      files: [
        'app/web/**/*.ts',
        'app/web/**/*.tsx',
      ],
      parserOptions: {
        project: 'app/web/tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
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
      globals: {
        ...mapValues(sharedAppGlobals, () => false),
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(webAppGlobals, () => false),
        ...mapValues(webGlobals, () => false),
      },
    },
    // Framework web
    {
      files: [
        'framework/web/**/*.ts',
        'framework/web/**/*.tsx',
      ],
      parserOptions: {
        project: 'framework/web/tsconfig-build.json',
        ecmaFeatures: {
          jsx: true,
        },
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
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(webGlobals, () => false),
      },
    },
    // App server
    {
      files: [
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
        ...mapValues(sharedAppGlobals, () => false),
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(serverAppGlobals, () => false),
        ...mapValues(serverGlobals, () => false),
      },
    },
    // Framework server
    {
      files: [
        'framework/server/**/*.ts',
      ],
      parserOptions: {
        project: 'framework/server/tsconfig-build.json',
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
        ...mapValues(sharedGlobals, () => false),
        ...mapValues(serverGlobals, () => false),
      },
    },
    // App shared
    {
      files: [
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
    // Framework shared
    {
      files: [
        'framework/shared/**/*.ts',
      ],
      parserOptions: {
        project: 'framework/shared/tsconfig-build.json',
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
    // App Cypress tests
    {
      files: [
        'app/tests/**/*.ts',
      ],
      parserOptions: {
        project: 'app/tests/tsconfig.json',
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'app/tests',
              'app/shared',
              'framework/tests',
              'framework/shared',
            ],
          },
        },
      },
      rules: {
        'no-unused-expressions': 0,
        '@typescript-eslint/no-unused-expressions': 0,
      },
      globals: {
        ...mapValues(sharedAppGlobals, () => false),
        ...mapValues(sharedGlobals, () => false),
        Cypress: false,
        describe: false,
        it: false,
        cy: false,
      },
    },
    // Framework Cypress tests
    {
      files: [
        'framework/tests/**/*.ts',
      ],
      parserOptions: {
        project: 'framework/tests/tsconfig.json',
      },
      settings: {
        'import/resolver': {
          node: {
            paths: [
              'framework/tests',
              'framework/shared',
            ],
          },
        },
      },
      rules: {
        'no-unused-expressions': 0,
        '@typescript-eslint/no-unused-expressions': 0,
      },
      globals: {
        ...mapValues(sharedGlobals, () => false),
        Cypress: false,
        describe: false,
        it: false,
        cy: false,
      },
    },
    // Scripts
    {
      files: [
        '**/*.cjs',
        '**/*.mjs',
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

const argv = yargs(process.argv).parse();
if ('quiet' in argv) {
  for (const [k, v] of Object.entries(config.rules)) {
    if (v === 1) {
      config.rules[k] = 0;
    } else if (Array.isArray(v) && v[0] === 1) {
      v[0] = 0;
    }
  }

  for (const override of config.overrides) {
    if (override.rules) {
      for (const [k, v] of Object.entries(override.rules)) {
        if (v === 1) {
          override.rules[k] = 0;
        } else if (Array.isArray(v) && v[0] === 1) {
          v[0] = 0;
        }
      }
    }
  }
}

module.exports = config;
