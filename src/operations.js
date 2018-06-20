import { compare, mapValues, shallowCloneObj } from './utils';

export function filter(iterator) {
  return data => mapValues(data, values => values.filter(iterator));
}

export function map(iterator) {
  return data => mapValues(data, values => values.map(iterator));
}

export function sort(comparator) {
  return data => mapValues(data, values => values.sort(comparator));
}

export function sortBy(key, comparator) {
  return sort((a, b) => comparator(a[key], b[key]));
}

export function clone() {
  return data => mapValues(data, values => values.map(shallowCloneObj));
}

const defaultGetSeries = keys => (...values) => {
  // TODO
  return { group: {} };
};

export function groupBy(...keys) {
  const getSeries =
    typeof keys[keys.length - 1] === 'function'
      ? keys.pop()
      : defaultGetSeries(keys);

  // TODO
  return data => data;
}
