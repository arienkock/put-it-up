module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
  ],
  plugins: [
    [
      "@babel/plugin-transform-react-jsx",
      {
        runtime: "automatic", // defaults to classic
        importSource: "custom-jsx-library", // defaults to react
      },
    ],
  ],
};
