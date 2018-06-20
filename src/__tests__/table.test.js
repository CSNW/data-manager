import table from '../table';
import store from '../__fixtures__/store';

test('should fetch values', () => {
  expect(table('data.csv')([], store())).resolves.toMatchSnapshot();
});
