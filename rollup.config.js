import buble from "rollup-plugin-buble";
import resolve from "rollup-plugin-node-resolve";
import uglify from "rollup-plugin-uglify-es";
import json from "rollup-plugin-json";

export default {
  input: "src/index.js",
  output: {
    format: "iife",
    file: "public/bundle.js"
  },
  plugins: [
    json(),
    buble({
      jsx: "h"
    }),
    resolve({
      jsnext: true
    })
    //uglify()
  ]
};
