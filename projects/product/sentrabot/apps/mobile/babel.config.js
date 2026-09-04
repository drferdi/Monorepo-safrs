// Expo's default preset plus the Lingui macro, so `t` and `<Trans>` compile to
// catalog lookups the same way they do in apps/web.
module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["@lingui/babel-plugin-lingui-macro"],
  };
};
