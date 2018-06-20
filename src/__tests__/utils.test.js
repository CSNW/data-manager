import { mapValues, shallowCloneObj } from '../utils';
import * as series from '../__fixtures__/series';

test('mapValues should map series values', () => {
  expect(
    mapValues(series.multi(), values => values.filter(row => row.a > 2))
  ).toMatchSnapshot();
});

test('mapValues should clone series', () => {
  const original = series.multi();
  const result = mapValues(original, values =>
    values.filter(row => row.a <= 2)
  );

  expect(original[0]).not.toBe(result[0]);
});

test('shallowCloneObj should clone object fields', () => {
  const original = { a: 1, b: { c: 3 } };
  const cloned = shallowCloneObj(original);

  expect(cloned).not.toBe(original);
  expect(cloned).toEqual(original);
  expect(cloned.b).toBe(original.b);
});
