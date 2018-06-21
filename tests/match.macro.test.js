const pluginTester = require('babel-plugin-tester');
const plugin = require('babel-plugin-macros');

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: [
    `
      import { filter } from 'data-manager';
      import match from '../match.macro';

      filter(match({
        a: 1,
        b: 2,
        c: 3
      }))
    `,
    `
      import { filter } from 'data-manager';
      import match from '../match.macro';

      const min = 0;
      const max = 100;
      const values = [1, 2, 3];

      filter(match({
        // conditions
        a: 1,
        b: { $eq: 2 },
        'c': { $ne: true },
        d: { $gt: 0, $lt: 100},
        e: { $gte: min, $lte: max},
        'f': { $in: [1, 2, 3] },
        g: { $nin: values }
      }))
    `,
    `
      import { filter } from 'data-manager';
      import match from '../match.macro';

      const min = 0;
      const max = 100;
      const values = [1, 2, 3];

      filter(match({
        // logic
        $and: { a: 1, b: 2 },
        $or: { a: { $gt: 1 }, b: { $lt: 1 } },
        $not: { a: 1, b: 2 },
        $nor: { a: { $gt: 1 }, b: { $lt: 1 } }
      }))
    `
  ]
});
