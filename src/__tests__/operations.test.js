import {
  filter,
  map,
  sort,
  sortBy,
  compare,
  groupBy,
  clone
} from '../operations';

describe('filter', () => {
  test('should work', () => {
    expect(filter()).toBeDefined();
  });
});

describe('map', () => {
  test('should work', () => {
    expect(map()).toBeDefined();
  });
});

describe('sort', () => {
  test('should work', () => {
    expect(sort()).toBeDefined();
  });
});

describe('sortBy', () => {
  test('should work', () => {
    expect(sortBy()).toBeDefined();
  });
});

describe('compare', () => {
  test('should sort numbers ascending', () => {
    expect(compare.numbersAscending).toBeDefined();
  });
});

describe('groupBy', () => {
  test('should work', () => {
    expect(groupBy()).toBeDefined();
  });
});

describe('clone', () => {
  test('should work', () => {
    expect(clone()).toBeDefined();
  });
});
