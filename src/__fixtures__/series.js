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
