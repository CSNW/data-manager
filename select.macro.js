const { createMacro } = require('babel-plugin-macros');

module.exports = createMacro(select);

/**
 * @example
 * ```js
 * import { map } from 'data-manager';
 * import select from 'data-manager/select.macro';
 *
 * map(select('Year', 'Population'));
 *
 * // transforms at build-time into:
 *
 * map(row => {
 *   return { 'Year': row['Year'], 'Population': row['Population'] };
 * });
 *
 * const name = 'Population';
 *
 * map(select({
 *   year: 'Year',
 *   population: name
 * }));
 *
 * // transforms at build-time into:
 *
 * map(row => {
 *   return { year: row['Year'], population: row[name] };
 * });
 * ```
 * @param {string[] | object} mapping fields names or mapping to field name
 * @returns {function}
 */
function select({ references, state, babel: { template, types: t } }) {
  const paths = references.default;
  if (!paths || !paths.length) return;

  const buildSelect = template(`row => {
    return SELECT;
  }`);

  for (const identifier_path of paths) {
    const section_path = identifier_path.parentPath;
    const mapping = section_path.get('arguments.0').node;

    let properties;
    if (t.isArrayExpression(mapping)) {
      properties = mapping.elements.map(element => {
        const computed = !t.isStringLiteral(element);
        return t.objectProperty(element, row(element), computed);
      });
    } else if (t.isObjectExpression(mapping)) {
      properties = mapping.properties.map(property => {
        return t.objectProperty(
          property.key,
          row(property.value),
          property.computed
        );
      });
    } else {
      properties = section_path.node.arguments.map(arg => {
        const computed = !t.isStringLiteral(arg);
        return t.objectProperty(arg, row(arg), computed);
      });
    }

    const SELECT = t.objectExpression(properties);

    const select = buildSelect({ SELECT });
    section_path.replaceWith(select);
  }

  function row(key) {
    return t.memberExpression(t.identifier('row'), key, true);
  }
}
