export default class Store {
  constructor(overrides = {}) {
    const { fetch = fetchCsv } = overrides;
    this._fetch = fetch;
  }

  fetch(path, map) {
    return Promise.resolve(this._fetch(path)).then(data => {
      return map ? data.map(map) : data;
    });
  }

  query(...operations) {
    return operations.reduce((loading, operation) => {
      return loading.then(data => operation(data, this));
    }, Promise.resolve([]));
  }
}

function fetchCsv(path) {
  // TODO
  return [];
}
