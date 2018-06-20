import {
  filter,
  map,
  flatMap,
  sort,
  sortBy,
  groupBy,
  clone
} from '../operations';
import * as series from '../../tests/__fixtures__/series';

describe('filter', () => {
  test('should filter single series', () => {
    expect(filter(row => row.a > 2)(series.single())).toMatchSnapshot();
  });
  test('should filter multi series', () => {
    expect(filter(row => row.a <= 2)(series.multi())).toMatchSnapshot();
  });
});

describe('map', () => {
  const mapper = row => {
    row.c = row.a + row.b;
    return row;
  };

  test('should map single series', () => {
    expect(map(mapper)(series.single())).toMatchSnapshot();
  });
  test('should map multi series', () => {
    expect(map(mapper)(series.multi())).toMatchSnapshot();
  });
  test('should mutate by default', () => {
    const original = series.single();
    const mapped = map(mapper)(original);

    expect(original[0].values[0]).toBe(mapped[0].values[0]);
  });
});

describe('flatMap', () => {
  const mapper = row => {
    return [
      { a: row.a, b: row.b, c: row.a + row.b },
      { a: row.a, b: row.b, c: row.a - row.b }
    ];
  };

  test('should flatMap single series', () => {
    expect(flatMap(mapper)(series.single())).toMatchSnapshot();
  });
  test('should flatMap multi series', () => {
    expect(flatMap(mapper)(series.multi())).toMatchSnapshot();
  });
});

describe('sort', () => {
  test('should sort single series', () => {
    expect(sort((a, b) => a.b - b.b)(series.single())).toMatchSnapshot();
  });
  test('should sort multi series', () => {
    expect(sort((a, b) => b.a - a.a)(series.multi())).toMatchSnapshot();
  });
});

describe('sortBy', () => {
  test('should sortBy single series', () => {
    expect(sortBy('b', (a, b) => a - b)(series.single())).toMatchSnapshot();
  });
  test('should sortBy multi series', () => {
    expect(sortBy('a', (a, b) => b - a)(series.multi())).toMatchSnapshot();
  });
});

describe('clone', () => {
  test('should clone row objects', () => {
    const original = series.single();
    const cloned = clone()(original);

    expect(original[0].values[0].a).toEqual(cloned[0].values[0].a);
    expect(original[0].values[0]).not.toBe(cloned[0].values[0]);
  });
});

describe('groupBy', () => {
  test('should work', () => {
    expect(groupBy()).toBeDefined();
  });
});
