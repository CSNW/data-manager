import table from '../table';
import store from '../__fixtures__/store';

test('should fetch values', async () => {
  expect(await table('data.csv')([], store())).toMatchSnapshot();
});
