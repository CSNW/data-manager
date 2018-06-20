import { Store, table, filter, map, sortBy, compare } from '../src/index';
import cast, { derived } from '../cast.macro';
import { single } from '../src/__fixtures__/series';

// TODO use real fixture data
class MockStore extends Store {
  fetch() {
    return single()[0].values;
  }
}

test('should fetch and filter csv data', async () => {
  const store = new MockStore();

  const results = await store.query(
    table('data.csv'),
    filter(row => row.a > 2)
  );

  expect(results).toMatchSnapshot();
});

test('should fetch, filter, map, and sort csv data', async () => {
  const store = new MockStore();

  const results = await store.query(
    table('data.csv'),
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
  const store = new MockStore();

  const results = await store.query(
    table(
      'data.csv',
      cast({
        a: value => `a = ${value}`,
        b: value => `b = ${value}`,
        c: derived(row => row.a + row.b)
      })
    )
  );

  expect(results).toMatchSnapshot();
});
