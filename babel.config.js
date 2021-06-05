module.exports = {
  presets: [
    ['@babel/preset-env', {
      useBuiltIns: 'usage',
      corejs: '3',
      modules: false,
    }],
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-optional-chaining',
  ],
  sourceType: 'unambiguous',
  overrides: [
    {
      test: ['./web', './src/web'],
      presets: [
        ['@babel/preset-env', {
          useBuiltIns: 'usage',
          corejs: '3',
          /*
          exclude: [
            'babel-plugin-transform-async-to-generator',
            'babel-plugin-transform-regenerator',
          ],
          */
        }],
        ['@babel/preset-react', {
          pragma: 'ReactCreateElement',
          pragmaFrag: 'ReactFragment',
          runtime: 'classic', // 'automatic' makes bundle a bit larger for now
          development: process.env.NODE_ENV !== 'production',
        }],
      ],
      plugins: [
        ['module-resolver', {
          root: ['./web', './shared', './src/web', './src/shared'],
          extensions: ['.js', '.ts', '.tsx'],
          alias: {
            config: ['./src/web/config', './src/shared/config'],
          },
        }],
        // this cause bugs
        // '@babel/plugin-transform-react-constant-elements',
        /*
        ['module:fast-async', {
          'compiler': { 'promises': true, 'generators': false, 'useRuntimeModule': true },
        }],
        ['@babel/plugin-transform-modules-commonjs', {
          'strictMode': false,
        }],
        */
      ],
    },
    {
      test: ['./server', './src/server'],
      plugins: [
        ['module-resolver', {
          root: ['./server', './shared', './src/server', './src/shared'],
          extensions: ['.js', '.ts'],
          alias: {
            config: ['./src/server/config', './src/shared/config'],
          },
        }],
      ],
    },
    {
      test: ['./shared', './src/shared'],
      plugins: [
        ['module-resolver', {
          root: ['./shared', './src/shared'],
          extensions: ['.js', '.ts'],
          alias: {
            config: './src/shared/config',
          },
        }],
      ],
    },
  ],
};
