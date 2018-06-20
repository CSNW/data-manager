import { Store, table, filter } from '../src/index';
import { single } from '../src/__fixtures__/series';

test('should fetch and filter csv data', async () => {
  const store = new Store({
    fetch() {
      return single()[0].values;
    }
  });

  const results = await store.query(
    table('data.csv'),
    filter(row => row.a > 2)
  );

  expect(results).toMatchSnapshot();
});
