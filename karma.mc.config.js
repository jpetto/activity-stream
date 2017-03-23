const path = require("path");

const PATHS = {
  // Where is the entry point for the unit tests?
  testEntryFile: path.resolve(__dirname, "system-addon/test/unit/unit-entry.js"),

  // A glob-style pattern matching all unit tests
  testFilesPattern: "system-addon/test/unit/**/*.js",

  // The base directory of all source files (used for path resolution in webpack importing)
  systemAddonDirectory: path.resolve(__dirname, "system-addon"),

  // a RegEx matching all Cu.import statements of local files
  resourcePathRegEx: /^resource:\/\/activity-stream\//,

  coverageReportingPath: "logs/coverage/system-addon"
};

const preprocessors = {};
preprocessors[PATHS.testFilesPattern] = ["webpack"];

module.exports = function(config) {
  const isTDD = config.tdd;
  config.set({
    singleRun: !isTDD,
    browsers: ["Firefox"],
    frameworks: ["mocha", "sinon", "chai"],
    reporters: ["mocha", "coverage"],
    coverageReporter: {
      dir: PATHS.coverageReportingPath,
      // This will make karma fail if coverage reporting is less than the minimums here
      check: !isTDD && {
        global: {
          statements: 100,
          lines: 100,
          functions: 100,
          branches: 90
        }
      },
      reporters: [
        {type: "html", subdir: "report-html"},
        {type: "text", subdir: ".", file: "text.txt"},
        {type: "text-summary", subdir: ".", file: "text-summary.txt"}
      ]
    },
    files: [PATHS.testEntryFile],
    preprocessors,
    webpack: {
      devtool: "eval",
      // This loader allows us to override required files in tests
      resolveLoader: {alias: {inject: path.join(__dirname, "loaders/inject-loader")}},
      // This resolve config allows us to import with paths relative to the system-addon/ directory, e.g. "lib/ActivityStream.jsm"
      resolve: {
        modules: [
          PATHS.systemAddonDirectory,
          "node_modules"
        ]
      },
      module: {
        rules: [
          // This rule rewrites importing/exporting in .jsm files to be compatible with esmodules
          {
            test: /\.jsm$/,
            exclude: [/node_modules/],
            use: [{
              loader: "babel-loader",
              options: {
                plugins: [
                  // Converts .jsm files into common-js modules
                  ["jsm-to-commonjs", {basePath: PATHS.resourcePathRegEx, replace: true}]
                ]
              }
            }]
          },
          {
            enforce: "post",
            test: /\.jsm$/,
            loader: "istanbul-instrumenter-loader",
            include: [path.resolve("system-addon")],
            exclude: [
              /\.test\.js$/,
              path.resolve("system-addon/vendor")
            ]
          }
        ]
      }
    },
    // Silences some overly-verbose logging of individual module builds
    webpackMiddleware: {noInfo: true}
  });
};
