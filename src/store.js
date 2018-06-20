export default class Store {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  load(path, map) {
    if (this.cache.has(path)) {
      return Promise.resolve(this.cache.get(path));
    }
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    const loading = Promise.resolve(this.fetch(path))
      .then(raw => {
        return map ? raw.map(map) : raw;
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
    // TODO
    return [];
  }

  query(...operations) {
    return operations.reduce((loading, operation) => {
      return loading.then(data => operation(data, this));
    }, Promise.resolve([]));
  }
}
