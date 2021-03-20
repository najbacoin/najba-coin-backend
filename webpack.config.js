const { resolve } = require("path");
const glob = require("glob");

const alias = {
  "@middlewares": resolve(__dirname, "./src/middlewares/"),
  "@controllers": resolve(__dirname, "./src/controllers/"),
  "@services": resolve(__dirname, "./src/services/"),
  "@utils": resolve(__dirname, "./src/utils/"),
  src: resolve(__dirname, "./src/"),
};

const filterFunc = process.env.FUNC_NAME;

const entries = glob.sync("./src/functions/*").reduce(function (entries, entry) {
  if (filterFunc) {
    if (!entry.match(filterFunc)) {
      return entries;
    }
  }

  entries[entry.toString()] = entry;
  return entries;
}, {});

console.log("Building functions");
console.log(Object.keys(entries).join("\n"));

const config = {
  mode: "production",
  entry: entries,
  target: "node",
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
    descriptionFiles: ["package.json", "bower.json"],
    modules: ["node_modules"],
    alias,
  },
  output: {
    filename: "[name]/index.js",
    libraryTarget: "commonjs",
    path: resolve(__dirname, "dist"),
  },
  performance: {
    hints: false,
  },
  optimization: {
    minimize: false,
  },
  plugins: [],
};

module.exports = config;
