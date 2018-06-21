const { Suite } = require('benchmark');
const {
  table,
  filter,
  map,
  flatMap,
  sort,
  sortBy,
  compare,
  clone,
  groupBy
} = require('../');
const { FixtureStore } = require('./__fixtures__/store');

benchmark().catch(err => {
  console.error(err);
  process.exit(1);
});

async function benchmark() {
  // First, preload data
  const store = new FixtureStore();
  const massive = table('data/massive.csv');

  console.time('Preparing');

  await store.load('data/massive.csv', row => {
    return {
      line: Number(row.line),
      a: Number(row.a),
      b: row.b,
      c: row.c === 'true',
      d: Number(row.d),
      e: row.e
    };
  });

  const c = store.cache.get('data/massive.csv').map(row => row.c);
  const d = store.cache.get('data/massive.csv').map(row => row.d);

  console.timeEnd('Preparing');

  // Benchmark operations
  const suite = new Suite();

  suite.add(
    'filter',
    defer(async () => {
      await store.query(massive, filter(row => row.c));
    })
  );

  suite.add(
    'filter#vector.c',
    defer(async () => {
      c.filter(value => value);
    })
  );

  suite.add(
    'map',
    defer(async () => {
      await store.query(
        massive,
        map(row => {
          const { line, a, b, c, d, e } = row;
          return { line, a, b, c, d, e, f: row.a + row.d };
        })
      );
    })
  );

  suite.add(
    'flatMap',
    defer(async () => {
      await store.query(
        massive,
        flatMap(row => {
          const { line, a, b, c, d, e } = row;
          return [{ x: line, y: a, type: 'a' }, { x: line, y: d, type: 'd' }];
        })
      );
    })
  );

  suite.add(
    'sort',
    defer(async () => {
      await store.query(massive, sort((row_a, row_b) => row_a.d - row_b.d));
    })
  );

  suite.add(
    'sort#vector.d',
    defer(async () => {
      d.sort(compare.numbersAscending);
    })
  );

  suite.add(
    'sortBy',
    defer(async () => {
      await store.query(massive, sortBy('d', compare.numbersAscending));
    })
  );

  suite.add(
    'clone',
    defer(async () => {
      await store.query(massive, clone());
    })
  );

  suite.add(
    'groupBy',
    defer(async () => {
      await store.query(massive, groupBy('e'));
    })
  );

  suite
    .on('cycle', event => console.log(String(event.target)))
    .run({ async: true });
}

function defer(callback) {
  return {
    async fn(deferred) {
      await callback();
      deferred.resolve();
    },
    defer: true
  };
}
