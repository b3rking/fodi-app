module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource lets us use `className` on RN components.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
