# data-manager

Advanced querying and processing for csv data.

Example:

```js
import { Store, table, filter, groupBy } from 'data-manager';
import cast from 'data-manager/cast.macro';

const store = new Store();
const population = table('data/population.csv', cast({
  year: year => new Date(Number(year), 0, 1),
  state: String,
  tract: String,
  population: Number
}));

async function all() {
  const results = await store.query(population);

  // results = [
  //   { values: [{ year: ..., state: ..., ... }, ...] },
  // ]
}

async function forState(state) {
  const results = await store.query(
    population,
    filter(row => row.state === state),
    groupBy('tract')
  );

  // results = [
  //   { group: { tract: ... }, values: [{ year: ..., ... }, ...] },
  //   ...
  // ]
}
```

## Store

The store is the central source for downloading, processing, and caching csv data.

```js
import { Store } from 'data-manager';

const store = new Store();
```

## Table

Tables are used to define a csv data source include initial processing to get data in the desired format.
The csv data isn't downloaded until queried and is cached by path.
It is fairly inexpensive to define tables, so they can be safely created at query time.

```js
import { table } from 'data-manager';

const population = table('data/population.csv', row => {
  row.date = new Date(row.date);
  row.population = Number(row.population);
  
  return row;
});

// Alternatively, wrap for similar tables

const stateTable = path => table(path, row => {
  row.date = new Date(row.date);
  row.population = Number(row.population);

  return row;
});

const by_state = {
  va: stateTable('data/va.csv'),
  wa: stateTable('data/wa.csv')
};
```

## Query

Queries are a functional interface for selecting, filtering, sorting, grouping, and working with csv data.

```js
import { Store, table } from 'data-manager';
import { toCensusTract } from './utils';

const store = new Store();

const population = table('data/population.csv', row => {
  row.year = Number(row.year);
  row.population = Number(row.year);
  row.state = row.state.toUpperCase();
  row.census_tract = toCensusTract(row.census_tract);

  return row;
});

// Select all rows from csv
async function all() {
  const results = await store.query(
    population
  );

  // results = [{ year: ..., population: ..., ... }, ...]
}
```

### filter

`filter` is used to select certain rows from the query.

```js
import { /* ... */ filter } from 'data-manager';

async function range(start, end) {
  const results = await store.query(
    population,
    filter(row => row.year >= start && row.year <= end)
  )
}
```

### map

`map` can be used to add derived data, select a subset of fields, and otherwise process the query's rows.

```js
import { /* ... */ map } from 'data-manager';

async function calculated(scale) {
  const results = await store.query(
    population,

    // Warning: Be careful about mutating rows in queries
    // as they are references to the underlying source rows
    // and any changes will mutate the source data
    //
    // If desired, you can clone as part of a query (see below)

    map(row => {
      const { year, population } = row;
      return { year, scaled: population * scale };
    })
  )
}
```

### flatMap

`flatMap` is similar to `map` but can return multiple rows.

```js
import { /* ... */ flatMap } from 'data-manager';

async function normalized() {
  const results = await store.query(
    population,

    flatMap(row => {
      return [
        { value: row.a, type: 'a' },
        { value: row.b, type: 'b' }
      ];
    })
  );
}
```

### sort and sortBy

`sort` is used to sort the query's rows based on each row and `sortBy` is a convenience method to sort by field.

```js
import { /* ... */ sort, sortBy, compare } from 'data-manager';

async function sorted() {
  const results = await store.query(
    population,

    // Sort by year, ascending
    sort((a, b) => a.year - b.year),

    // is equivalent to:
    sortBy('year', compare.numbersAscending)
  )
}
```

### groupBy

`groupBy` allows grouping rows by field(s) and results in array of series with the series' rows stored in a `values` field.

```js
import { /* ... */ groupBy } from 'data-manager';

async function grouped() {
  const results = await store.query(
    population,
    groupBy('state')
  );

  // results = [
  //   { group: { state: 'AK' }, values: [{ year: ..., population: ..., ... }, ...]},
  //   { group: { state: 'AZ' }, values: [{ year: ..., population: ..., ... }, ...]},
  //   ...
  // ]

  // Series information can be set with the following:
  const with_key = await store.query(
    population,
    groupBy('state', (state, series) => {
      // `values` is set directly on the returned series
      series.key = state;
      return series;
    })
  );

  // with_key = [
  //   { key: 'AK', values: [...] },
  //   { key: 'AZ', values: [...] }
  // ]
}
```

### clone

`clone` quickly performs a shallow clone on each row to help avoid mutations to the source data in subsequent steps.

```js
import { /* ... */ clone, map } from 'data-manager';

async function cloned() {
  const results = await store.query(
    population,
    clone(),
    map(row => {
      // Feel free to mutate row-level fields
      row.mutated = true;
      return row;
    })
  )
}
```

## Macros

In addition to the table and query operations, there are some convenience macros that are part of data-manager that are compiled at build time (using babel-plugin-macros) into performant functions that rival hand-written code. These methods are optional and are not part of the standard import for data-manager.

Usage:

1. Add `babel-plugin-macros` as a dev-dependency
2. Add `"plugins": ["macros"]` to .babelrc (see [macros docs](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/user.md) for alternatives)

### cast

Cast a row using the given field mapping.

```js
import { table } from 'data-manager';
import cast, { derived } from 'data-manager/cast.macro';
import { toCensusTract } from './utils';

const population = table('data/population.csv', cast({
  year: Number,
  population: Number,
  state: value => value.toUpperCase(),
  census_tract: toCensusTract,
  rename: derived(row => row.original)
}));

// compiles roughly into:
//
// (function() {
//   const mapping = { /* ... */ };
//
//   return function cast(row, index, rows) {
//     return {
//       year: mapping.year(row.year),
//       population: mapping.population(row.population),
//       state: mapping.state(row.state),
//       census_tract: mapping.census_tract(row.census_tract),
//       rename: mapping.rename(row, index, rows)
//     };
//   };
// })();
```

### match

Use MongoDB-like query syntax to find matching rows.
Available logic / operations: `$and`, `$or`, `$not`, `$nor`, `eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$ne` (not equal), `$nin` (not in).

```js
import { /* ... */ filter } from 'data-manager';
import match from 'data-manager/match.macro';

async function range(start, end) {
  const results = await store.query(
    population,
    filter(match({
      year: { $gte: start, $lte: end },
      state: 'VA'

      // equivalent to:

      $and: {
        year: { $and: { $gte: start, $lte: end } },
        state: { $eq: 'VA' }
      }
    }))
  )
}

// compiles roughly into:
//
// function match(row) {
//   return row.year >= 1 && row.year <= 2 && row.state === 'VA'
// }
```

### select

Select the specified keys from the query rows.

```js
import select from 'data-manager/select.macro';

async function subset() {
  const results = await store.query(
    population,
    select('year', 'census_tract', 'population')
  )

  // compiles roughly into:
  //
  // function select(row) {
  //   return {
  //     'year': row['year'],
  //     'census_tract': row['census_tract'],
  //     'population': row['population']
  //   };
  // }

  const mapped = await store.query(
    population,
    select({
      x: 'year',
      y: 'population'
    })
  )

  // compiles roughly into:
  //
  // function select(row) {
  //   return {
  //     x: row['year'],
  //     y: row['population']
  //   };
  // }
}
```

### normalize

`normalize` is a more advanced version of `select` that allows normalizing csv data, rearranging fields into a shared set of columns.
This can be useful for grouping by field within a single query.

```js
import { table, flow } from 'data-manager';
import cast from 'data-manager/cast.macro';
import normalize from 'data-manager/normalize.macro';

// Given:
// year, a, b, c
// 1990, 1, 2, 3
// 1991, 2, 4, 6
// ...

const data = table('data.csv', flow(
  cast({ year: Number, a: Number, b: Number, c: Number }),
  normalize({
    x: 'year',
    y: {
      columns: ['a', 'b', 'c'],
      category: 'type'
    }
  })
));

// Normalizes into:
// x,    y, type
// 1990, 1, 'a'
// 1990, 2, 'b'
// 1990, 3, 'c'
// 1991, 2, 'a'
// ...
```

## Upgrading from v0.8.0

Before:

```js
var store = new DataManager.Store();

// Register default cast and map for store
store.cast({
  a: 'Number',
  b: 'Boolean',
  c: 'Date',
  d1: 'Number',
  d2: 'Number'
});
store.map({
  x: 'a',
  y: {
    columns: ['d1', 'd2'],
    category: 'type'
  }
});

// {a, b, c, d1, d2} -> [
//   {x: a, y: d1, type: 'd1', b, c},
//   {x: a, y: d2, type: 'd2', b, c}
// ]

// Create query
var query = store.query({
  from: ['file.csv'],
  filter: {
    x: {$gt: 0, $lte: 100}
  },
  groupBy: 'type',
  series: [
    {meta: {type: 'd1'}, key: 'd1-series', name: 'D1 Series'},
    {meta: {type: 'd2'}, key: 'd2-series', name: 'D2 Series'}
  ]
}).then(function(results) {
  // Whenever data is loaded in store, run query and get values
  // -> results: [
  //      {key: 'd1-series', ..., values: [{x: a, y: d1, type: 'd1', ...}, ...]}
  //      {key: 'd2-series', ..., values: [{x: a, y: d2, type: 'd2', ...}, ...]}
  //    ]
});
```

After:

```js
import { Store, table, filter, groupBy, flow } from 'data-manager';
import cast from 'data-manager/cast.macro';
import normalize from 'data-manager/normalize.macro';
import match from 'data-manager/match.macro';

const store = new Store();
const file = table('file.csv', flow(
  cast({
    a: Number,
    b: b => b === 'true',
    c: c => new Date(c),
    d1: Number,
    d2: Number
  }),
  normalize({
    x: 'a',
    y: {
      columns: ['d1', 'd2'],
      category: 'type'
    }
  })
));

const results = await store.query(
  file,
  filter(match({
    x: { $gt: 0, $lte: 100 }
  })),
  groupBy('type', type => {
    return { meta: { type }, key: `${type}-series`, name: `${type.toUpperCase()} Series` };
  })
)
```

## Development

1. Install dependencies: `npm install` / `yarn`
2. Run tests: `npm test` / `yarn test`
