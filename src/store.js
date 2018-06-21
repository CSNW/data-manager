import { csv as fetchCsv } from 'd3-fetch';
import { flatMap } from './utils';

/**
 * Central store for csv data tables with caching and pre-processing
 *
 * @class Store
 */
export default class Store {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  /**
   * Load csv data at path, converting if loading for the first time
   *
   * @param {string} path
   * @param {function} [convert] map and filter rows
   */
  load(path, convert) {
    if (this.cache.has(path)) {
      return Promise.resolve(this.cache.get(path));
    }
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    const loading = Promise.resolve(this.fetch(path))
      .then(raw => {
        return convert ? flatMap(raw, convert).filter(Boolean) : raw;
      })
      .then(values => {
        this.cache.set(path, values);
        this.loading.delete(path);

        return values;
      });

    this.loading.set(path, loading);

    return loading;
  }

  /**
   * Fetch csv values at path
   *
   * @internal
   * @param {string} path
   * @returns {object[]} values
   */
  fetch(path) {
    return fetchCsv(path);
  }

  /**
   * Perform set of query operations on store
   * (loading and processing csv tables as-needed)
   *
   * @example
   * ```js
   * import { Store, table } from 'data-manager';
   *
   * const store = new Store();
   *
   * async function all() {
   *   const results = await store.query(
   *     table('data.csv'),
   *     // filter, map, sort, etc.
   *   );
   * }
   * ```
   * @param {function[]} ...operations
   * @returns {Promise<object>} data
   */
  query(...operations) {
    return operations.reduce((loading, operation) => {
      return loading.then(data => operation(data, this));
    }, Promise.resolve([]));
  }
}
