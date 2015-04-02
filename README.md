# DataManager

Advanced querying and processing for csv data.

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

# Development

1. Install dependencies: `npm install` and `bower install`
2. Run specs: `grunt test`
