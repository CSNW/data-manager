import Store from '../store';
import { single } from '../../tests/__fixtures__/series';

const fetch = () => single()[0].values;

test('should flatMap with convert', async () => {
  const store = new Store();
  store.fetch = fetch;

  const mapper = row => [row, row];
  expect(await store.load('data.csv', mapper)).toMatchSnapshot();
});

test('should filter with convert', async () => {
  const store = new Store();
  store.fetch = fetch;

  const filter = row => {
    if (row.a < 2) return;
    return row;
  };
  expect(await store.load('data.csv', filter)).toMatchSnapshot();
});

test('should flatMap and filter with convert', async () => {
  const store = new Store();
  store.fetch = fetch;

  const flatMapAndFilter = row => {
    if (row.a < 2) return;
    return [row, row];
  };
  expect(await store.load('data.csv', flatMapAndFilter)).toMatchSnapshot();
});

test('should fetch if table has not been loaded', async () => {
  const store = new Store();
  store.fetch = jest.fn(fetch);

  expect(await store.load('data.csv')).toMatchSnapshot();
  expect(store.fetch).toHaveBeenCalled();
});

test('should resolve already loaded table', async () => {
  const store = new Store();
  store.cache.set('data.csv', single()[0].values);
  store.fetch = jest.fn(() => []);

  expect(await store.load('data.csv')).toMatchSnapshot();
  expect(store.fetch).not.toHaveBeenCalled();
});

test('should return currently loading table', () => {
  const store = new Store();
  const loading = Promise.resolve(single()[0].values);
  store.loading.set('data.csv', loading);
  store.fetch = jest.fn(() => []);

  expect(store.load('data.csv')).toBe(loading);
  expect(store.fetch).not.toHaveBeenCalled();
});

test('should waterfall operations', async () => {
  const store = new Store();

  const add1 = value => Promise.resolve(value + 1);
  const operations = [() => Promise.resolve(1), add1, add1, add1];
  expect(await store.query(...operations)).toEqual(4);
});
