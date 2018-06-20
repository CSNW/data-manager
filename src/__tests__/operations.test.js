import {
  filter,
  map,
  sort,
  sortBy,
  compare,
  groupBy,
  clone
} from '../operations';
import * as series from '../__fixtures__/series';

describe('filter', () => {
  test('should filter single series', () => {
    expect(filter(row => row.a > 2)(series.single())).toMatchSnapshot();
  });
  test('should filter multi series', () => {
    expect(filter(row => row.a <= 2)(series.multi())).toMatchSnapshot();
  });
});

describe('map', () => {
  test('should filter single series', () => {
    expect(
      map(row => {
        row.c = row.a + row.b;
        return row;
      })(series.single())
    ).toMatchSnapshot();
  });
  test('should filter multi series', () => {
    expect(
      map(row => {
        row.c = row.a - row.b;
        return row;
      })(series.multi())
    ).toMatchSnapshot();
  });
  test('should mutate by default', () => {
    const original = series.single();
    const mapped = map(row => {
      row.c = row.a + row.b;
      return row;
    })(original);

    expect(original[0].values[0]).toBe(mapped[0].values[0]);
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

describe('compare', () => {
  test('should sort numbers ascending', () => {
    expect([2, 4, 1, 3, 5].sort(compare.numbersAscending)).toMatchSnapshot();
    expect([2, 4, 1, 3, 5].sort(compare.numbersAsc)).toMatchSnapshot();
  });

  test('should sort numbers descending', () => {
    expect([2, 4, 1, 3, 5].sort(compare.numbersDescending)).toMatchSnapshot();
    expect([2, 4, 1, 3, 5].sort(compare.numbersDesc)).toMatchSnapshot();
  });
});

describe('groupBy', () => {
  test('should work', () => {
    expect(groupBy()).toBeDefined();
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
