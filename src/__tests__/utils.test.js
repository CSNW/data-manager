import { compare, mapValues, shallowCloneObj } from '../utils';
import * as series from '../../tests/__fixtures__/series';

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

describe('mapValues', () => {
  test('should map series values', () => {
    expect(
      mapValues(series.multi(), values => values.filter(row => row.a > 2))
    ).toMatchSnapshot();
  });

  test('should clone series', () => {
    const original = series.multi();
    const result = mapValues(original, values =>
      values.filter(row => row.a <= 2)
    );

    expect(original[0]).not.toBe(result[0]);
  });
});

describe('shallowCloneObj', () => {
  test('should clone object fields', () => {
    const original = { a: 1, b: { c: 3 } };
    const cloned = shallowCloneObj(original);

    expect(cloned).not.toBe(original);
    expect(cloned).toEqual(original);
    expect(cloned.b).toBe(original.b);
  });
});
