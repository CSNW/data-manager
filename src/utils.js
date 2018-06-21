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
    series.values = iterator(series.values);
    return series;
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

/**
 * Compose the given functions and call then from first to last
 *
 * @example
 * ```js
 * const cast = row => row;
 * const select = row => row;
 * const filter = row => row;
 *
 * const convert = flow(cast, select, filter);
 * // convert = row => cast(row) => select(row) => filter(row)
 * ```
 * @param {function[]} fns
 * @returns {function}
 */
export function flow(...fns) {
  return value => fns.reduce((memo, fn) => fn(memo), value);
}
