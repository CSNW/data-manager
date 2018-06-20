import table from '../table';
import source from '../__fixtures__/source';

test('should fetch values', () => {
  expect(table('data.csv')([], source())).resolves.toMatchSnapshot();
});
