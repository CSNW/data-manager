function numbersAscending(a, b) {
  return a - b;
}
function numbersDescending(a, b) {
  return b - a;
}

export const compare = {
  numbersAscending,
  numbersAsc: numbersAscending,
  numbersDescending,
  numbersDesc: numbersDescending
};

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

/**
 * Approximately compliant version of future Array.prototype.flatMap
 * https://tc39.github.io/proposal-flatMap/
 *
 * @internal
 * @param {any[]} values
 * @param {function} iterator (value, index, values) => any
 * @param {any} [context]
 * @returns {any[]}
 */
export function flatMap(values, iterator, context) {
  const flattened = [];

  values.forEach((value, index) => {
    const result = context
      ? iterator.call(context, value, index, values)
      : iterator(value, index, values);

    Array.isArray(result)
      ? flattened.push.apply(flattened, result)
      : flattened.push(result);
  });

  return flattened;
}
