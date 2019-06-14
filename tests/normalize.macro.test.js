const pluginTester = require('babel-plugin-tester');
const plugin = require('babel-plugin-macros');

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: [
    `
      import { flatMap } from 'data-manager';
      import normalize from '../normalize.macro';

      const b = 'b';
      const d = 'd';

      flatMap(normalize({
        a: 'a',
        b,
        y: {
          columns: ['c', d],
          category: 'type'
        }
      }));
    `,
    `
      import { flatMap } from 'data-manager';
      import normalize from '../normalize.macro';

      const b = 'b';

      flatMap(normalize({
        a: 'a',
        b,
        y: {
          columns: ['c', 'd'],
          categories: {
            c: { isC: true, isD: false },
            d: { isC: false, isD: true },
          }
        }
      }));
    `,
    `
      import { flatMap } from 'data-manager';
      import normalize from '../normalize.macro';

      const b = 'b';
      const f = 'f';

      flatMap(normalize(
        {
          a: 'a',
          b,
          y: {
            columns: ['c', 'd'],
            categories: {
              c: { isC: true, isD: false },
              d: { isC: false, isD: true },
            }
          }
        },
        ['e', f]
      ));
    `,
    `
      import { flatMap } from 'data-manager';
      import normalize from '../normalize.macro';

      const b = 'b';
      const f = 'f';

      flatMap(normalize(
        {
          a: 'a',
          b,
          y: {
            columns: ['c', 'd'],
            categories: {
              c: { isC: true, isD: false },
              d: { isC: false, isD: true },
            }
          }
        },
        'e', f
      ));
    `
  ]
});
