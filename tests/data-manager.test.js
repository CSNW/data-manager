import { Store, table, filter, map, sortBy, compare } from '../';
import cast, { derived } from '../cast.macro';
import match from '../match.macro';
import { FixtureStore } from './__fixtures__/store';

const single = table(
  'data/single.csv',
  cast({
    a: Number,
    b: Number
  })
);

test('should fetch and filter csv data', async () => {
  const store = new FixtureStore();

  const results = await store.query(single, filter(row => row.a > 2));

  expect(results).toMatchSnapshot();
});

test('should fetch, filter, map, and sort csv data', async () => {
  const store = new FixtureStore();

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
  const store = new FixtureStore();

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

test('should match csv data with macro', async () => {
  const store = new FixtureStore();

  const results = await store.query(single, filter(match({ a: { $lte: 2 } })));

  expect(results).toMatchSnapshot();
});
