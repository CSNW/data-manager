const pluginTester = require('babel-plugin-tester');
const plugin = require('babel-plugin-macros');

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: [
    `
      import { map } from 'data-manager';
      import select from '../select.macro';

      const name = 'Population'

      map(select('Year', name));
    `,
    `
      import { map } from 'data-manager';
      import select from '../select.macro';

      const name = 'Population'

      map(select(['Year', name]));
    `,
    `
      import { map } from 'data-manager';
      import select from '../select.macro';

      const name = 'Population';
      const state = 'state';
      const tract = 'tract';

      map(select({
        year: 'Year',
        'population': name,
        [state]: state,
        tract
      }));
    `
  ]
});
