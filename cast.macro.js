const { createMacro } = require('babel-plugin-macros');

module.exports = createMacro(cast);

// Before:
//
// const c = value => value;
//
// cast({
//   a: Number,
//   b: value => value,
//   c,
//   f: derived(row => row.d + row.e)
// });
//
// After:
//
// const c = value => value;
//
// (function() {
//   const mapping = {
//     a: Number,
//     b: value => value
//     c,
//     f: row => row.d + row.e
//   };
//
//   return function(row, index, rows) {
//     return {
//       a: mapping.a(row.a),
//       b: mapping.b(row.b),
//       c: mapping.c(row.c),
//       f: mapping.f(row, index, rows)
//     };
//   };
// })()

function cast({ references, state, babel: { template, types: t } }) {
  const paths = references.default;
  const derived_nodes = (references.derived || []).map(path => path.parent);

  if (!paths || !paths.length) return;

  const buildCast = template(`(function() {
    const mapping = MAPPING;

    return function(row, index, rows) {
      return CAST;
    }
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
