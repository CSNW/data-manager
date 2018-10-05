const { createMacro } = require('babel-plugin-macros');

module.exports = createMacro(match);

/**
 * Construct a matcher function using MongoDB-like syntax
 *
 * Logical: $and, $or, $not, $nor
 * Comparison: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
 * @example
 * ```js
 * import { filter } from 'data-manager';
 * import match from 'data-manager/match.macro';
 *
 * filter(match({
 *   a: 10,
 *   b: { $or: { $lt: 0, $gt: 100 } },
 *   c: { $in: [1, 2, 3] }
 * }));
 *
 * // transforms at build-time into:
 *
 * filter(function match(row) {
 *   return row.a === 10 && (row.b < 0 || row.b > 100) && [1, 2, 3].indexOf(row.c) >= 0
 * })
 * ```
 * @param {object} query
 * @returns {function}
 */
function match({ references, state, babel: { template, types: t } }) {
  const paths = references.default;
  if (!paths || !paths.length) return;

  const buildMatch = template(`row => {
    return LOGIC;
  }`);

  for (const identifier_path of paths) {
    const section_path = identifier_path.parentPath;
    const conditions = section_path.get('arguments.0');
    const properties = conditions.node.properties;

    // Create match logic
    const LOGIC = logical.$and(undefined, properties, t);

    const match = buildMatch({ LOGIC });
    section_path.replaceWith(match);
  }
}

function evaluate(context, property, t) {
  const key = property.key.name || property.key.value;

  if (key in logical) {
    return logical[key](context, property.value.properties, t);
  } else if (key in comparison) {
    return comparison[key](context, property.value, t);
  } else if (t.isObjectExpression(property.value)) {
    return logical.$and(property.key, property.value.properties, t);
  } else {
    return comparison.$eq(property.key, property.value, t);
  }
}

const logical = {
  $and(context, properties, t) {
    const conditions = properties.map(property =>
      evaluate(context, property, t)
    );

    return joinLogic('&&', conditions, t);
  },
  $or(context, properties, t) {
    const conditions = properties.map(property =>
      evaluate(context, property, t)
    );

    return joinLogic('||', conditions, t);
  },
  $not(context, properties, t) {
    return t.unaryExpression('!', logical.$and(context, properties, t));
  },
  $nor(context, properties, t) {
    const conditions = properties.map(property =>
      t.unaryExpression('!', evaluate(context, property, t))
    );

    return joinLogic('&&', conditions, t);
  }
};

const comparison = {
  $eq(key, value, t) {
    return t.binaryExpression('===', row(key, t), value);
  },
  $ne(key, value, t) {
    return t.binaryExpression('!==', row(key, t), value);
  },
  $gt(key, value, t) {
    return t.binaryExpression('>', row(key, t), value);
  },
  $gte(key, value, t) {
    return t.binaryExpression('>=', row(key, t), value);
  },
  $lt(key, value, t) {
    return t.binaryExpression('<', row(key, t), value);
  },
  $lte(key, value, t) {
    return t.binaryExpression('<=', row(key, t), value);
  },
  $in(key, value, t) {
    return t.binaryExpression(
      '>=',
      t.callExpression(t.memberExpression(value, t.identifier('indexOf')), [
        row(key, t)
      ]),
      t.numericLiteral(0)
    );
  },
  $nin(key, value, t) {
    return t.unaryExpression('!', comparison.$in(key, value, t));
  }
};

function joinLogic(operator, conditions, t) {
  if (conditions.length === 1) {
    return conditions[0];
  }

  return t.logicalExpression(
    operator,
    conditions[0],
    joinLogic(operator, conditions.slice(1), t)
  );
}

function row(key, t) {
  const computed = !t.isIdentifier(key);
  return t.memberExpression(t.identifier('row'), key, computed);
}
