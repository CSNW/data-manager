export function mapValues(data, iterator) {
  return data.map(series => {
    const mapped = shallowCloneObj(series);
    mapped.values = iterator(series.values);

    return mapped;
  });
}

export function shallowCloneObj(obj) {
  const cloned = {};
  for (const key in obj) {
    cloned[key] = obj[key];
  }
  return cloned;
}
