import { csv as fetchCsv } from 'd3-fetch';

const identity = value => value;

export default class Store {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  load(path, convert = identity) {
    if (this.cache.has(path)) {
      return Promise.resolve(this.cache.get(path));
    }
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    const loading = Promise.resolve(this.fetch(path, convert)).then(values => {
      this.cache.set(path, values);
      this.loading.delete(path);

      return values;
    });

    this.loading.set(path, loading);

    return loading;
  }

  fetch(path, convert) {
    return fetchCsv(path, convert);
  }

  query(...operations) {
    return operations.reduce((loading, operation) => {
      return loading.then(data => operation(data, this));
    }, Promise.resolve([]));
  }
}
