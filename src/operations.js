import { compare, mapValues, shallowCloneObj } from './utils';

/**
 * Filter series values to only selected rows
 *
 * @param {function} iterator (row, index, rows) => boolean
 * @returns {function} operation
 */
export function filter(iterator) {
  return data => mapValues(data, values => values.filter(iterator));
}

/**
 * Map series values
 *
 * @param {function} iterator (row, index, rows) => row
 * @returns {function} operation
 */
export function map(iterator) {
  return data => mapValues(data, values => values.map(iterator));
}

export function sort(comparator) {
  return data => mapValues(data, values => values.sort(comparator));
}

/**
 * Sort series values by key
 *
 * @param {string} key
 * @param {function} comparator (a, b) => number
 * @returns {function} operation
 */
export function sortBy(key, comparator) {
  return sort((row_a, row_b) => comparator(row_a[key], row_b[key]));
}

/**
 * Clone series values
 *
 * @returns {function} operation
 */
export function clone() {
  return data => mapValues(data, values => values.map(shallowCloneObj));
}

/**
 * Group series values by key
 *
 * @example
 * ```js
 * import { Store, table, groupBy } from 'data-manager';
 * import cast from 'data-manager/cast.macro';
 *
 * // data.csv
 * // a,b
 * // 1,a
 * // 2,b
 * // 3,b
 * // 4,a
 * const store = new Store();
 * const data = table('data.csv', cast({ a: Number, b: String }));
 *
 * async function grouped() {
 *   const results = await store.query(
 *     data,
 *     groupBy('b')
 *   );
 *
 *   // results = [
 *   //   { group: { b: 'a' }, values: [{ a: 1, b: 'a' }, { a: 4, b: 'a' }] },
 *   //   { group: { b: 'b' }, values: [{ a: 2, b: 'b' }, { a: 3, b: 'b' }] }
 *   // ]
 *
 *   const alternative = await store.query(
 *     data,
 *     groupBy('b', (b, series) => {
 *       // `values` is added directly to returned series
 *       series.key = b;
 *
 *       return series;
 *     })
 *   );
 *
 *   // alternative = [
 *   //   { key: 'a', values: [{ a: 1, b: 'a' }, { a: 4, b: 'a' }] },
 *   //   { key: 'b', values: [{ a: 2, b: 'b' }, { a: 3, b: 'b' }] }
 *   // ]
 * }
 * ```
 * @param {string} key
 * @param {function} [toSeries]
 */
export function groupBy(key, toSeries) {
  toSeries =
    toSeries ||
    ((value, series) => {
      series.group = series.group || {};
      series.group[key] = value;

      return series;
    });

  // TODO
  return data => data;
}
