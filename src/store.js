import { csv as fetchCsv } from 'd3-fetch';

export default class Store {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  load(path, convert) {
    if (this.cache.has(path)) {
      return Promise.resolve(this.cache.get(path));
    }
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    const loading = Promise.resolve(this.fetch(path))
      .then(raw => {
        return convert ? raw.map(convert).filter(Boolean) : raw;
      })
      .then(values => {
        this.cache.set(path, values);
        this.loading.delete(path);

        return values;
      });

    this.loading.set(path, loading);

    return loading;
  }

  fetch(path) {
    return fetchCsv(path);
  }

  query(...operations) {
    return operations.reduce((loading, operation) => {
      return loading.then(data => operation(data, this));
    }, Promise.resolve([]));
  }
}
