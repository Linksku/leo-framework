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
    ['@babel/plugin-transform-typescript', {
      allowDeclareFields: true,
    }],
    '@babel/plugin-syntax-dynamic-import',
    ['@babel/plugin-proposal-decorators', {
      legacy: true,
    }],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-optional-chaining',
  ],
  sourceType: 'unambiguous',
  overrides: [
    {
      test: ['./app/web', './framework/web'],
      presets: [
        ['@babel/preset-react', {
          runtime: 'classic', // 'automatic' makes bundle a bit larger for now
          development: process.env.NODE_ENV !== 'production',
          // Slightly reduce file size
          pragma: 'ReactCreateElement',
        }],
      ],
      plugins: [
        ['module-resolver', {
          root: ['./app/web', './app/shared', './framework/web', './framework/shared'],
          extensions: ['.js', '.ts', '.tsx', '.cjs', '.json'],
          alias: {
            config: ['./app/web/config', './app/shared/config'],
          },
        }],
        // this cause bugs
        // '@babel/plugin-transform-react-constant-elements',
      ],
    },
    {
      test: ['./app/server', './framework/server'],
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
          root: ['./app/server', './app/shared', './framework/server', './framework/shared'],
          extensions: ['.js', '.ts', '.cjs', '.json'],
          alias: {
            config: ['./app/server/config', './app/shared/config'],
          },
        }],
      ],
    },
    {
      test: ['./app/shared', './framework/shared'],
      plugins: [
        ['module-resolver', {
          root: ['./app/shared', './framework/shared'],
          extensions: ['.js', '.ts', '.cjs', '.json'],
          alias: {
            config: './app/shared/config',
          },
        }],
      ],
    },
    {
      test: ['./app/tests', './framework/tests'],
      plugins: [
        ['module-resolver', {
          root: ['./app/tests', './app/shared', './framework/tests', './framework/shared'],
          extensions: ['.js', '.ts', '.cjs', '.json'],
        }],
      ],
    },
  ],
};
