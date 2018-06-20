const { join } = require('path');
const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const { csvParse } = require('d3-dsv');

const { Store } = require('../../');
const { single } = require('./series');

function store() {
  const override = new Store();
  override.fetch = jest.fn(() => Promise.resolve(single()[0].values));

  return override;
}

class FixtureStore extends Store {
  async fetch(path) {
    path = join(__dirname, path);

    const data = await readFile(path);
    const values = csvParse(data.toString());

    return values;
  }
}

module.exports = {
  store,
  FixtureStore
};
