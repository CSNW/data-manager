export function mapValues(data, iterator) {
  return data.map(series => {
    const mapped = shallowClone(series);
    mapped.values = iterator(series.values);

    return mapped;
  });
}

export function identity(value) {
  return value;
}

export function isFunction(value) {
  return typeof value === 'function';
}

export function shallowClone(obj) {
  const cloned = {};
  for (const key in obj) {
    cloned[key] = obj[key];
  }
  return cloned;
}
