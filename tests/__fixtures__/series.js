export function single() {
  return [
    {
      values: [
        { a: 0, b: 10 },
        { a: 1, b: 8 },
        { a: 2, b: 6 },
        { a: 3, b: 4 },
        { a: 4, b: 2 },
        { a: 5, b: 0 }
      ]
    }
  ];
}

export function multi() {
  return [single()[0], single()[0], single()[0]];
}

export function types() {
  return [
    {
      values: [
        { type: 'a', y: 0 },
        { type: 'b', y: 10 },
        { type: 'a', y: 1 },
        { type: 'b', y: 8 },
        { type: 'a', y: 2 },
        { type: 'b', y: 6 },
        { type: 'a', y: 3 },
        { type: 'b', y: 4 },
        { type: 'a', y: 4 },
        { type: 'b', y: 2 },
        { type: 'a', y: 5 },
        { type: 'b', y: 0 }
      ]
    }
  ];
}
