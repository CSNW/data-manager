import Source from '../source';
import { single } from './series';

export default function source() {
  const override = new Source();
  override.fetch = jest.fn(() => Promise.resolve(single()[0].values));

  return override;
}
