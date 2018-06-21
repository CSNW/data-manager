const { createMacro } = require('babel-plugin-macros');

module.exports = createMacro(cast);

/**
 * @example
 * ```js
 * import { table } from 'data-manager';
 * import cast, { derived } from 'data-manager/cast.macro';
 *
 * const today = new Date();
 * const population = table('data/population.csv', cast({
 *   year: year => new Date(Number(year), 0, 1),
 *   state: String,
 *   population: Number,
 *   age: derived(row => today - new Date(Number(row.year), 0, 1))
 * }))
 *
 * // transforms at build-time into:
 *
 * const population = table('data/population.csv', (() => {
 *   const mapping = {
 *     year: year => new Date(Number(year), 0, 1),
 *     state: String,
 *     population: Number,
 *     age: derived(row => today - new Date(Number(row.year), 0, 1))
 *   };
 *
 *   return (row, index, rows) => {
 *     return {
 *       year: mapping.year(row.year),
 *       state: mapping.state(row.state),
 *       population: mapping.population(row.population),
 *       age: mapping.age(row, index, rows)
 *     };
 *   }
 * })()
 * ```
 * @param {object} mapping by field name
 * @returns {function}
 */
function cast({ references, state, babel: { template, types: t } }) {
  const paths = references.default;
  const derived_nodes = (references.derived || []).map(path => path.parent);

  if (!paths || !paths.length) return;

  const buildCast = template(`(() => {
    const mapping = MAPPING;
    return (row, index, rows) => {
      return CAST;
    };
  })()`);

  for (const identifier_path of paths) {
    const section_path = identifier_path.parentPath;
    const mapping = section_path.get('arguments.0');
    const properties = mapping.node.properties;

    // Create cast object
    //
    // key: mapping.key(row.key)
    // or for `derived`:
    // key: mapping.key(row, index, rows)
    const cast_properties = properties.map((property, index) => {
      const key = property.key;
      const computed = !t.isIdentifier(key);
      const derived = derived_nodes.includes(property.value);

      const value = t.callExpression(
        t.memberExpression(t.identifier('mapping'), key, computed),
        derived
          ? [t.identifier('row'), t.identifier('index'), t.identifier('rows')]
          : [t.memberExpression(t.identifier('row'), key, computed)]
      );

      return t.objectProperty(key, value);
    });
    const CAST = t.objectExpression(cast_properties);

    // Removed `derived` from mapping
    properties.forEach((property, index) => {
      if (derived_nodes.includes(property.value)) {
        const path = mapping.get(`properties.${index}.value`);
        path.replaceWith(property.value.arguments[0]);
      }
    });
    const MAPPING = mapping.node;

    const cast = buildCast({
      MAPPING,
      CAST
    });

    section_path.replaceWith(cast);
  }
}
