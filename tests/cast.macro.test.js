const pluginTester = require('babel-plugin-tester');
const plugin = require('babel-plugin-macros');

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: [
    `
      import { table } from 'data-manager';
      import cast, { derived } from '../cast.macro';

      const d = value => value;

      table('data.csv', cast({
        a: Number,
        'b c': value => value,
        d,
        e: derived(row => row.e)
      }));
    `
  ]
});
