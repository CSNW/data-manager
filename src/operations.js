import {
  compare,
  mapValues,
  shallowCloneObj,
  flatMap as _flatMap
} from './utils';

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

/**
 * Map series objects
 *
 * @param {function} iterator (series, index, data) => series
 * @returns {function} operation
 */
export function mapSeries(iterator) {
  return data => data.map(iterator);
}

/**
 * Flat map series values
 *
 * @param {function} iterator (row, index, rows) => row[]
 * @returns {function} operation
 */
export function flatMap(iterator) {
  return data =>
    data.map(series => {
      series.values = _flatMap(series.values, iterator);
      return series;
    });
}

/**
 * Sort series values
 *
 * @param {function} comparator (row_a, row_b) => number
 * @returns {function} operation
 */
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
 * Clone series objects (does not clone underlying rows)
 *
 * @returns {function} operation
 */
export function cloneSeries() {
  return data => data.map(series => shallowCloneObj(series));
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

  return data =>
    _flatMap(data, series => {
      const groups = new Map();
      series.values.forEach(row => {
        const id = row[key];

        if (!groups.has(id)) groups.set(id, []);
        const group = groups.get(id);

        group.push(row);
      });

      const grouped = [];
      groups.forEach((values, id) => {
        const group_series = toSeries(id, shallowCloneObj(series));
        group_series.values = values;

        grouped.push(group_series);
      });

      return grouped;
    });
}
