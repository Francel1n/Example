module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@engine': './src/engine',
            '@native': './src/native',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
