import {
  filter,
  map,
  mapSeries,
  flatMap,
  sort,
  sortBy,
  clone,
  cloneSeries,
  groupBy,
  from
} from '../operations';
import table from '../table';
import * as series from '../../tests/__fixtures__/series';
import { store } from '../../tests/__fixtures__/store';

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

describe('mapSeries', () => {
  const mapper = (series, index) => {
    series.index = index;
    return series;
  };

  test('should map series', () => {
    expect(mapSeries(mapper)(series.multi())).toMatchSnapshot();
  });
  test('should mutate by default', () => {
    const original = series.multi();
    const mapped = mapSeries(mapper)(original);

    expect(original[0]).toBe(mapped[0]);
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
    expect(original[0].values[0]).toBe(cloned[0].values[0]);
  });
});

describe('cloneSeries', () => {
  test('should clone series objects', () => {
    const original = series.single();
    const cloned = cloneSeries()(original);

    expect(original[0].values[0]).toBe(cloned[0].values[0]);
    expect(original[0]).toEqual(cloned[0]);
  });
});

describe('groupBy', () => {
  test('should group by key', () => {
    expect(groupBy('type')(series.types())).toMatchSnapshot();
  });

  test('should perform multiple group by key', () => {
    expect(
      groupBy('y')(
        groupBy('type')(sortBy('y', (a, b) => a - b)(series.types()))
      )
    ).toMatchSnapshot();
  });
});

describe('from', () => {
  test('should merge data from multiple tables', async () => {
    expect(
      await from(
        table('a.csv', row => {
          row.from = 'a';
          return row;
        }),
        table('b.csv', row => {
          row.from = 'b';
          return row;
        }),
        table('c.csv', row => {
          row.from = 'c';
          return row;
        })
      )([], store())
    ).toMatchSnapshot();
  });
});
