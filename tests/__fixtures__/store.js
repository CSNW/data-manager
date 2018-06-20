import Store from '../../src/store';
import { single } from './series';

export default function store() {
  const override = new Store();
  override.fetch = jest.fn(() => Promise.resolve(single()[0].values));

  return override;
}
