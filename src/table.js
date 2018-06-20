/**
 * Load csv data table for given path.
 *
 * - On first load, it will fetch, convert, and cache csv
 * - On subsequent loads, will load directly from cache
 * - `convert` performs filter and map, return `null` or `undefined` to filter row
 *
 * @example
 * ```js
 * import { table } from 'data-manager';
 *
 * const population = table('population.csv', row => {
 *   // return null or undefined to filter row
 *   if (row.invalid) return;
 *
 *   return {
 *     year: new Date(+row.year, 0, 1),
 *     population: +row.population
 *   };
 * });
 *
 * // -> use `population` in store.query(...)
 * ```
 * @param {string} path
 * @param {function} convert map and filter rows
 * @returns {function} operation
 */
export default function table(path, convert) {
  return (_, store) => {
    return store.load(path, convert).then(values => [{ values }]);
  };
}
