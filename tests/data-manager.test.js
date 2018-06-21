import {
  Store,
  table,
  from,
  filter,
  map,
  sortBy,
  compare,
  groupBy,
  flow
} from '../';
import cast, { derived } from '../cast.macro';
import match from '../match.macro';
import select from '../select.macro';
import normalize from '../normalize.macro';
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

test('should select csv data with macro', async () => {
  const store = new FixtureStore();

  const results = await store.query(single, map(select({ A: 'a', B: 'b' })));

  expect(results).toMatchSnapshot();
});

test('should work with multiple csv', async () => {
  const store = new FixtureStore();
  const multiTable = path => {
    return table(
      path,
      cast({
        a: Number,
        b: Number,
        c: Number,
        d: String,
        e: value => value === 'true',
        from: derived(() => path)
      })
    );
  };

  const results = await store.query(
    from(
      multiTable('data/a.csv'),
      multiTable('data/b.csv'),
      multiTable('data/c.csv'),
      multiTable('data/d.csv'),
      multiTable('data/e.csv')
    ),
    groupBy('from')
  );

  expect(results).toMatchSnapshot();
});

test('should combine multiple convert steps with flow', async () => {
  const store = new FixtureStore();

  const convert = flow(
    cast({
      a: value => `a = ${value}`,
      b: value => `b = ${value}`,
      c: derived(row => Number(row.a) + Number(row.b))
    }),
    select('a', 'c')
  );

  const results = await store.query(table('data/single.csv', convert));

  expect(results).toMatchSnapshot();
});

test('should normalize csv with macro', async () => {
  const store = new FixtureStore();

  const convert = flow(
    cast({
      a: Number,
      b: Number,
      c: Number
    }),
    normalize({
      x: 'a',
      y: {
        columns: ['b', 'c'],
        category: 'type'
      }
    })
  );

  const results = await store.query(
    table('data/a.csv', convert),
    groupBy('type'),
    map(select('x', 'y'))
  );

  expect(results).toMatchSnapshot();
});
