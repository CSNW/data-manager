import { Store, table, filter, map, sortBy, compare } from '../src/index';
import cast, { derived } from '../cast.macro';

import { join } from 'path';
import { promisify } from 'util';
const readFile = promisify(require('fs').readFile);
import { csvParse } from 'd3-dsv';

class LocalStore extends Store {
  async fetch(path, convert) {
    path = join(__dirname, '__fixtures__', path);

    const data = await readFile(path);
    const values = csvParse(data.toString(), convert);

    return values;
  }
}

const single = table(
  'data/single.csv',
  cast({
    a: Number,
    b: Number
  })
);

test('should fetch and filter csv data', async () => {
  const store = new LocalStore();

  const results = await store.query(single, filter(row => row.a > 2));

  expect(results).toMatchSnapshot();
});

test('should fetch, filter, map, and sort csv data', async () => {
  const store = new LocalStore();

  const results = await store.query(
    single,
    filter(row => row.a <= 4),
    map(row => {
      row.computed = row.a + row.b;
      return row;
    }),
    sortBy('a', compare.numbersDescending)
  );

  expect(results).toMatchSnapshot();
});

test('should cast csv data with macro', async () => {
  const store = new LocalStore();

  const results = await store.query(
    table(
      'data/single.csv',
      cast({
        a: value => `a = ${value}`,
        b: value => `b = ${value}`,
        c: derived(row => Number(row.a) + Number(row.b))
      })
    )
  );

  expect(results).toMatchSnapshot();
});
