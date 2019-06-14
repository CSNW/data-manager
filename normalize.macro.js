const { createMacro, MacroError } = require('babel-plugin-macros');

module.exports = createMacro(normalize);

/**
 * @example
 * ```js
 * import { flatMap } from 'data-manager';
 * import normalize from 'data-manager/normalize.macro';
 *
 * flatMap(normalize({
 *   x: 'a',
 *   y: {
 *     columns: ['b', 'c'],
 *     category: 'type'
 *   }
 * }));
 *
 * // transforms at build-time into:
 *
 * flatMap(row => {
 *   return [
 *     { x: row['a'], y: row['b'], type: 'b' },
 *     { x: row['a'], y: row['c'], type: 'c' }
 *   ];
 * });
 *
 * flatMap(normalize({
 *   x: 'a',
 *   y: {
 *     columns: ['b', 'c'],
 *     categories: {
 *       b: { isB: true, isC: false },
 *       b: { isB: false, isC: true }
 *     }
 *   }
 * }));
 *
 * // transforms at build-time into:
 *
 * flatMap(row => {
 *   return [
 *     { x: row['a'], y: row['b'], isB: true, isC: false },
 *     { a: row['a'], y: row['c'], isB: true, isC: false }
 *   ];
 * });
 * ```
 * @param {object} mapping fields to normalize / select
 * @returns {function}
 */
function normalize({ references, state, babel: { template, types: t } }) {
  const paths = references.default;
  if (!paths || !paths.length) return;

  const buildNormalize = template(`row => {
    return NORMALIZE;
  }`);

  for (const identifier_path of paths) {
    const section_path = identifier_path.parentPath;
    const mapping = section_path.get('arguments.0').node;

    const rows = mapping.properties.reduce(
      (rows, property) => {
        if (t.isObjectExpression(property.value)) {
          const columns_property = findByKey(
            property.value.properties,
            'columns'
          );
          const category_property = findByKey(
            property.value.properties,
            'category'
          );
          const categories_property = findByKey(
            property.value.properties,
            'categories'
          );

          const normalized = columns_property.value.elements.map(element => {
            let row = [
              t.objectProperty(property.key, toRow(element), property.computed)
            ];

            if (category_property) {
              row.push(
                t.objectProperty(
                  category_property.value,
                  element,
                  category_property.computed
                )
              );
            } else if (categories_property) {
              const categories = findByKey(
                categories_property.value.properties,
                toKey(element)
              );

              row = row.concat(categories ? categories.value.properties : []);
            }

            return row;
          });

          return rows.reduce((flattened, row) => {
            return flattened.concat(
              normalized.map(normal => row.concat(normal))
            );
          }, []);
        } else {
          return rows.map(row =>
            row.concat(
              t.objectProperty(
                property.key,
                toRow(property.value),
                property.computed
              )
            )
          );
        }
      },
      [[]]
    );

    const NORMALIZE = t.arrayExpression(
      rows.map(row => t.objectExpression(row))
    );

    const normalize = buildNormalize({ NORMALIZE });
    section_path.replaceWith(normalize);
  }

  function toRow(key) {
    return t.memberExpression(t.identifier('row'), key, true);
  }

  function toKey(node) {
    return node.name || node.value;
  }

  function findByKey(properties, key) {
    return properties.find(property => toKey(property.key) === key);
  }
}
