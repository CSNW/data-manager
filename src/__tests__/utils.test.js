import { compare, mapValues, shallowCloneObj, flatMap } from '../utils';
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

  test('should not clone series', () => {
    const original = series.multi();
    const result = mapValues(original, values =>
      values.filter(row => row.a <= 2)
    );

    expect(original[0]).toBe(result[0]);
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

describe('flatMap', () => {
  test('should flatMap array results', () => {
    const duplicate = value => [value, value];
    expect(flatMap([1, 2, 3], duplicate)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  test('should flatMap varied results', () => {
    const duplicateEvens = value => (value % 2 ? value : [value, value]);
    expect(flatMap([1, 2, 3], duplicateEvens)).toEqual([1, 2, 2, 3]);
  });

  test('should use context if given', () => {
    const context = {
      compute(value) {
        return [value, value];
      }
    };
    function compute(value) {
      return this.compute(value);
    }
    expect(flatMap([1, 2, 3], compute, context)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});
