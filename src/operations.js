import { identity, isFunction, shallowClone, mapValues } from './utils';

export function filter(iterator = identity) {
  return data => mapValues(data, values => values.filter(iterator));
}

export function map(iterator = identity) {
  return data => mapValues(data, values => values.map(iterator));
}

export function sort(comparator) {
  return data => mapValues(data, values => values.sort(comparator));
}

export function sortBy(key, comparator) {
  // TODO
  return data => data;
}

function numbersAscending(a, b) {
  return a - b;
}

export const compare = {
  numbersAscending
};

const defaultGetSeries = keys => (...values) => {
  // TODO
  return { group: {} };
};

export function groupBy(...keys) {
  const getSeries = isFunction(keys[keys.length - 1])
    ? keys.pop()
    : defaultGetSeries(keys);

  // TODO
  return data => data;
}

export function clone() {
  return data => mapValues(data, values => values.map(shallowClone));
}
