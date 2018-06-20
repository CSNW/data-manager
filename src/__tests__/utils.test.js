import { mapValues } from '../utils';
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
