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
          extensions: ['.js', '.ts', '.tsx', '.cjs'],
          alias: {
            config: ['./src/web/config', './src/shared/config'],
          },
        }],
        // this cause bugs
        // '@babel/plugin-transform-react-constant-elements',
      ],
    },
    {
      test: ['./server', './src/server'],
      presets: [
        ['@babel/preset-env', {
          useBuiltIns: 'usage',
          corejs: '3',
          modules: false,
          targets: {
            node: 'current',
          },
        }],
      ],
      plugins: [
        ['module-resolver', {
          root: ['./server', './shared', './src/server', './src/shared'],
          extensions: ['.js', '.ts', '.cjs'],
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
          extensions: ['.js', '.ts', '.cjs'],
          alias: {
            config: './src/shared/config',
          },
        }],
      ],
    },
  ],
};
