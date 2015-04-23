(function(_, RSVP, d3, global) {
  'use strict';

  /**
    Generic data store with async load, cast, map, and query

    @class Store
  */
  var Store = function Store() {
    // Initialize data cache
    this.cache = {};

    // Load types from static
    this.types = _.clone(Store.types);
  };

  // Expose Store as DataManager globally and attach static
  var DataManager = global.DataManager = Store;
  DataManager.Store = Store;

  // Type converters for cast
  // @static
  Store.types = {
    'Number': function(value) {
      return +value;
    },
    'Boolean': function(value) {
      return value.toUpperCase ? value.toUpperCase() === 'TRUE' : (value === 1 || value === true);
    },
    'String': function(value) {
      return value == null ? '' : '' + value;
    },
    'Date': function(value) {
      return new Date(value);
    }
  };

  // Load path async (only supports csv currently)
  // @static
  Store.load = function load(path) {
    return new RSVP.Promise(function(resolve, reject) {
      d3.csv(path).get(function(err, rows) {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  };

  // Process given rows
  // @static
  Store.processRows = function processRows(cache, store) {
    var castFn = cache._cast || store._cast;
    var mapFn = cache._map || store._map;

    if (castFn || mapFn) {
      var values = cache.values;
      var index = -1;
      var length = values.length;
      var count = mapFn ? mapFn.count : 1;
      var results = new Array(length * count);

      while (++index < length) {
        if (castFn)
          results[index * count] = castFn(values[index], index, cache);
        else
          results[index * count] = values[index];

        if (mapFn)
          mapFn(results, index * count, results[index * count], index, cache);
      }

      cache.values = results;
    }

    return cache.values;
  };

  // Generate map function for given options
  // @static
  Store.generateMap = function generateMap(options) {
    options = options || {};
    var mapRow;

    if (_.isFunction(options)) {
      mapRow = function mapRow(out, cursor, row, index, details) {
        out[cursor] = options(row, index, details);
      };
      mapRow.count = 1;
      return mapRow;
    }

    // Categorize mapping
    var simple = [];
    var complex = [];
    _.each(options, function(option, to) {
      if (_.isObject(option))
        complex.push(_.extend({to: to}, option));
      else
        simple.push({to: to, from: option});
    });

    // Flatten complex mapping
    if (complex.length) {
      complex = _.reduce(complex, function(memo, options) {
        return _.chain(memo)
          .map(function(existing) {
            return _.map(options.columns, function(from) {
              var categories = {};
              if (options.categories)
                categories = options.categories[from];
              else if (options.category)
                categories[options.category] = from;

              return {
                mapping: existing.mapping.concat([{from: from, to: options.to}]),
                categories: _.extend({}, existing.categories, categories)
              };
            });
          })
          .flatten(true)
          .value();
      }, [{
        mapping: [],
        categories: {}
      }]);
    }

    // Generate compiled function
    //
    // Example:
    // {x: 'a'}
    //
    // function(resolve, clone, out, cursor, row, index) {
    //   row['x'] = resolve(row, 'a');
    //   out[cursor] = row;
    // }
    //
    // {x: 'a', y: {columns: ['b', 'c']}, z: {columns: ['d', 'e']}}
    //
    // function(...) {
    //   row['x'] = resolve(row, 'a');
    //
    //   out[cursor + 0] = row;
    //   out[cursor + 1] = clone(row);
    //   out[cursor + 2] = clone(row);
    //   out[cursor + 3] = clone(row);
    //
    //   out[cursor + 0]['z'] = resolve(out[cursor + 3], 'd');
    //   out[cursor + 0]['y'] = resolve(out[cursor + 3], 'b');
    //   // (categories not shown)
    //
    //   out[cursor + 1]['z'] = resolve(out[cursor + 3], 'e');
    //   out[cursor + 1]['y'] = resolve(out[cursor + 3], 'b');
    //
    //   ...
    // }

    var fn_body = '';

    // Simple mapping
    if (simple.length) {
      fn_body += _.map(simple, function(options) {
        return 'row[\'' + options.to + '\'] = ' + builder.resolve(options.from) + ';';
      }).join('\n');

      if (complex.length)
        fn_body += '\n\n';
      else
        fn_body += 'out[cursor] = row;';
    }

    // Complex mapping
    if (complex.length) {
      // Add declarations
      fn_body += _.map(complex, function(options, index, items) {
        return 'out[cursor + ' + index + '] = ' + (index > 0 ? 'clone(row)' : 'row') + ';';
      }).join('\n') + '\n\n';

      // Add mapping and categories
      fn_body += _.map(complex, function(options, index) {
        var mapping = _.map(options.mapping, function(mapping) {
          return 'out[cursor + ' + index + '][\'' + mapping.to + '\'] = ' + builder.resolve(mapping.from) + ';';
        }).join('\n');

        var categories = _.map(options.categories, function(value, key) {
          return 'out[cursor + ' + index + '][\'' + key + '\'] = ' + builder.value(value) + ';';
        }).join('\n');

        return mapping + '\n' + categories;
      }).join('\n\n');
    }

    var fn = new Function('resolve', 'clone', 'out', 'cursor', 'row', 'index', fn_body);

    mapRow = function mapRow(out, cursor, row, index, details) {
      if (row)
        return fn(utils.resolve, utils.cloneObject, out, cursor, row, index);
    };
    mapRow.count = complex.length || 1;
    return mapRow;
  };

  Store.generateCast = function generateCast(options, types) {
    if (_.isFunction(options)) return options;

    // Load type functions for options
    var cast_options = {};
    _.each(options, function(type, key) {
      cast_options[key] = _.isFunction(type) ? type : types[type];
    });

    // Create cast function that sets properties directly instead of with iterator
    //
    // Example:
    // row['a'] = cast_options['a'](row['a'], index, details);
    // row['b'] = cast_options['b'](row['b'], index, details);
    // row['c'] = cast_options['c'](row['c'], index, details);

    var fn_body = _.map(_.keys(cast_options), function(key) {
      return 'row[\'' + key + '\'] = cast_options[\'' + key + '\'](row[\'' + key + '\'], index, details);';
    }).join('\n');
    fn_body += 'return row;';
    var fn = new Function('cast_options', 'row', 'index', 'details', fn_body);

    return function castRow(row, index, details) {
      if (row)
        return fn(cast_options, row, index, details);
    };
  };

  _.extend(Store.prototype, {
    /**
      Load values currently in store

      @return {Promise}
    */
    values: function() {
      return new RSVP.Promise(function(resolve) {
        resolve(this.cache);
      }.bind(this));
    },

    /**
      Load file(s) into store with options

      @param {String|Array} path to csv(s)
      @param {Object} [options]
        @param {Object|Function} [options.cast] cast options/fn for given paths
        @param {Object|Function} [options.map] map options/fn for given paths
      @return {Promise}
    */
    load: function load(path, options) {
      var paths = _.isArray(path) ? path : [path];

      // Generate cast and map for options
      options = options || {};
      if (options.cast)
        options._cast = Store.generateCast(options.cast, this.types);
      if (options.map)
        options._map = Store.generateMap(options.map);

      var loading = _.map(paths, function(path) {
        var cache = this.cache[path];

        if (!cache) {
          // New path
          cache = this.cache[path] = {
            filename: path,
            values: []
          };
        }

        // Update cache with options
        _.extend(cache, options);

        if (cache.loaded) {
          // Already loaded, re-cast and map, if necessary
          if (options.cast || options.map) {
            cache.loading = new RSVP.Promise(function(resolve, reject) {
              _.defer(function() {
                try {
                  Store.processRows(cache, this);

                  cache.loading = null;
                  resolve(cache.values);
                }
                catch (ex) { reject(ex); }
              }.bind(this));
            }.bind(this));
          }
        }
        else if (!cache.loading) {
          // Hasn't loaded and isn't currently loading -> load
          cache.loading = Store.load(path)
            .then(function(values) {
              cache.values = values;

              Store.processRows(cache, this);

              cache.loading = null;
              cache.loaded = new Date();
              return cache.values;
            }.bind(this));
        }

        return cache.loading;
      }, this);

      return RSVP.all(loading)
        .then(function() {
          return _.pick(this.cache, paths);
        }.bind(this));
    },

    /**
      Register cast options/iterator to be called on every incoming row (before map)
      (e.g. Convert from strings to useful data types)

      @param {Object|Function} options or iterator
      @chainable
    */
    cast: function cast(options) {
      this._cast = Store.generateCast(options, this.types);

      return this;
    },

    /**
      Register map option/iterator to be called with every incoming row

      @example
      ```js
      store.map({
        x: 'year' // (row.year -> row.x)
        y: {
          columns: ['a', 'b', 'c'],
          category: 'type' // row.a -> row.y, row.type = 'a'
        },
        z: {
          columns: ['d', 'e'],
          categories: {
            d: {isD: true, isE: false},
            e: {isD: false, isE: true} // row.d -> row.z, isD: true, isE: false
          }
        }
      });
      ```

      @param {Object|Function} options or iterator
      @chainable
    */
    map: function map(options) {
      this._map = Store.generateMap(options);

      return this;
    },

    /**
      Create new query of data store

      @param {Object} options to pass to query
      @return {Query}
    */
    query: function query(options) {
      return new Query(this, options);
    }
  });

  /**
    Query
    Perform query on data store and get formatted series data

    Input:
    (Denormalized rows/tables)
    x, y, type, a, b, c

    Output:
    (Flattened array of objects with metadata and values)
    [
      {meta..., values: [...]},
      {meta..., values: [...]},
      {meta..., values: [...]},
      {meta..., values: [...]}
    ]

    Example:
    var query = {
      from: ['chart-1.csv', 'chart-2.csv'],
      filter: {
        // by key
        // ---
        // compare directly: a === true
        a: true,

        // comparison: $gt, $gte, $lt, $lte, $ne, $in, $nin
        // b > 10 AND b < 100
        b: {$gt: 10, $lt: 100}

        // compare with logical
        // c > 10 OR c < 100
        c: {$or: {$gt: 10, $lt: 100}}

        // by logical
        // ---
        $and: {a: 10, b: 20},
        $or: {c: 30, d: 40},
        $not: {e: false},
        $nor: {f: -10, g: {$in: ['a', 'b', 'c']}}}
      }
    }

    @param {Store} store instance to query
    @param {Object} [query] to run
  */
  var Query = DataManager.Query = function Query(store, query) {
    this.store = store;
    this.promise = new RSVP.Promise(function load(resolve) {
      resolve(store.cache);
    });

    if (query) {
      // Steps:
      // 1. from
      // 2. preprocess (rows)
      // 3. filter
      // 4. groupBy
      // 5. reduce
      // 6. postprocess (meta, values)
      // 7. series
      this
        .from(query.from)
        .then(function(data) {
          // Return merged rows
          return _.flatten(_.pluck(_.values(data), 'values'));
        })
        .preprocess(query.preprocess)
        .filter(query.filter)
        .groupBy(query.groupBy)
        .reduce(query.reduce)
        .postprocess(query.postprocess)
        .series(query.series);
    }
  };

  _.extend(Query.prototype, {
    // Proxy promise methods
    then: function() {
      this.promise = this.promise.then.apply(this.promise, arguments);
      return this;
    },
    'catch': function() {
      this.promise = this.promise['catch'].apply(this.promise, arguments);
      return this;
    },
    'finally': function() {
      this.promise = this.promise['finally'].apply(this.promise, arguments);
      return this;
    },

    /**
      @method from
      @chainable
      @param {Array|String} paths path of csv(s) to query
      @return {Query}
    */
    from: function from(paths) {
      if (!paths)
        return this;

      return this.then(function _from() {
        return this.store.load(paths);
      }.bind(this));
    },

    preprocess: function preprocess(fn) {
      if (!fn)
        return this;

      return this.then(function _preprocess(rows) {
        return fn(rows);
      });
    },

    filter: function filter(predicate) {
      if (!predicate)
        return this;

      return this.then(function _filter(rows) {
        if (_.isFunction(predicate)) {
          return _.filter(rows, predicate);
        }
        else {
          var matches = matcher(predicate);
          return _.filter(rows, matches);
        }
      });
    },

    /**
      @method groupBy
      @chainable
      @param {String|Array|Object} predicate key or keys array or key function object to group by
      - 'key' -> meta: group: {key: 'value'}
      - ['keyA', 'keyB'] -> meta: {keyA: 'value', keyB: 'value'},
      - {keyA: function(row) {...}, keyB: function(row) {...}} -> meta: {keyA: 'value', keyB: 'value'}
      @return {Query}
    */
    groupBy: function groupBy(predicate) {
      return this.then(function _groupBy(rows) {
        if (!predicate) {
          // TODO Do this at start of query
          return [{meta: {}, values: rows}];
        }
        else {
          var grouped = {};
          var meta = {};

          // Convert String -> Array -> Object format for predicate
          if (_.isString(predicate)) {
            predicate = [predicate];
          }
          if (_.isArray(predicate)) {
            predicate = _.object(predicate, _.map(predicate, function(key) {
              return function(row) {
                return row[key];
              };
            }));
          }

          // Convert predicate to arrays for quick iteration
          var keys = [];
          var values = [];
          _.each(predicate, function(value, key) {
            keys.push(key);
            values.push(value);
          });

          _.each(rows, function(row, index, rows) {
            var key = utils.quickKey(row, keys, values);
            if (!meta[key]) {
              meta[key] = _.object(keys, _.map(keys, function(key, index) {
                return values[index](row);
              }));

              grouped[key] = [];
            }

            grouped[key].push(row);
          });

          // Convert to [{meta: {...}, values: [...]}] format
          grouped = _.map(grouped, function(rows, key) {
            return {
              meta: meta[key],
              values: rows
            };
          });

          return grouped;
        }
      });
    },

    reduce: function reduce(predicate) {
      if (!predicate)
        return this;

      return this.then(function _reduce(results) {
        var approaches = {
          avg: function(values, column) {
            return approaches.sum(values, column) / values.length;
          },
          sum: function(values, column) {
            return _.reduce(values, function(memo, value) {
              return 0 + memo + value[column];
            }, 0);
          }
        };

        _.each(results, function(result) {
          var reduced = {};

          if (_.isFunction(predicate.iterator)) {
            reduced = _.reduce(result.values, predicate.iterator, predicate.memo || {});
            result.values = [reduced];
          }
          else if (predicate.byColumn) {
            _.each(predicate.byColumn, function(approach, column) {
              reduced[column] = approaches[approach](result.values, column);
            });

            result.values = [reduced];
          }
          else if (predicate.columns && predicate.approach) {
            _.each(predicate.columns, function(column) {
              reduced[column] = approaches[predicate.approach](result.values, column);
            });

            result.values = [reduced];
          }
        });

        return results;
      });
    },

    postprocess: function postprocess(fn) {
      if (!fn)
        return this;

      return this.then(function(groups) {
        return RSVP.all(_.map(groups, function(group) {
          return fn(group.values, group.meta);
        })).then(function(results) {
          _.each(groups, function(group, index) {
            if (results[index] != null)
              group.values = results[index];
          });

          return groups;
        });
      });
    },

    series: function series(options) {
      return this.then(function _series(results) {
        // TODO, don't put values directly on the series object (clone first)
        if (!options) {
          // Create series defaults
          _.each(results, function(result, index) {
            result.key = 'series-' + index;
            result.name = _.reduce(result.meta, function(memo, value, key) {
              var description = key + '=' + value;
              return memo.length ? memo + ', ' + description : description;
            }, '');
          });
        }
        else {
          if (_.isArray(options)) {
            results = _.map(options, createSeries);
          }
          else {
            _.each(options, function(series_values, key) {
              options[key] = _.map(series_values, createSeries);
            });
            results = options;
          }
        }

        return results;

        function createSeries(series) {
          // Find matching result and load values for series
          var matches = matcher(series.meta);
          var result = _.find(results, function(result) {
            return matches(result.meta);
          });

          series.values = (result && result.values) || [];
          return series;
        }
      });
    }
  });

  /**
    Matching helper for advanced querying

    Logical: $and, $or, $not, $nor
    Comparison: $gt, $gte, $lt, $lte, $in, $ne, $nin

    @example
    ```js
    var test = {a: 4, b: 3, c: 2, d: 1};

    // a = 4 AND b = 2
    matcher({a: 4, b: 3})(test); // -> true

    // z = 0 OR b = 3
    matcher({$or: {z: 0, b: 3}})(test); // -> true

    // c < 10 AND d >= 1
    matcher({c: {$lt: 10}, d: {$gte: 1}})(test); // -> true

    // a in [3, 4, 5] and d != 0
    matcher({a: {$in: [3, 4, 5]}, d: {$ne: 0}})(test); // -> true
    ```

    @method matcher
    @param {Object} query
    @returns {Function}
  */

  var matcher = DataManager.matcher = function matcher(query) {
    function result(key, value, lookup) {
      var operation = logical[key] || comparison[key];
      if (operation)
        return operation(value, lookup);

      var is_query = _.isObject(value) && !(value instanceof Date) && !_.isArray(value);
      if (is_query)
        return result('$and', value, key);
      else
        return builder.equal(key, value);
    }

    var logical = {
      '$and': function logical_and(query, lookup) {
        return '(' + _.map(query, function(value, key) {
          return result(key, value, lookup);
        }).join(') && (') + ')';
      },
      '$or': function logical_or(query, lookup) {
        return '(' + _.map(query, function(value, key) {
          return result(key, value, lookup);
        }).join(') || (') + ')';
      },
      '$not': function logical_not(query, lookup) {
        return '!((' + _.map(query, function(value, key) {
          return result(key, value, lookup);
        }).join(') && (') + '))';
      },
      '$nor': function logical_nor(query, lookup) {
        return '!(' + _.map(query, function(value, key) {
          return result(key, value, lookup);
        }).join(') && !(') + ')';
      }
    };

    var comparison = {
      '$gt': function comparison_gt(value, lookup) {
        return builder.resolve(lookup) + ' > ' + builder.value(value);
      },
      '$gte': function comparison_gte(value, lookup) {
        return builder.resolve(lookup) + ' >= ' + builder.value(value);
      },
      '$lt': function comparison_lt(value, lookup) {
        return builder.resolve(lookup) + ' < ' + builder.value(value);
      },
      '$lte': function comparison_lte(value, lookup) {
        return builder.resolve(lookup) + ' <= ' + builder.value(value);
      },
      '$in': function comparison_in(value, lookup) {
        return builder.indexOf(lookup, value) + ' >= 0';
      },
      '$ne': function comparison_ne(value, lookup) {
        return '!' + builder.equal(lookup, value);
      },
      '$nin': function comparison_nin(value, lookup) {
        return builder.indexOf(lookup, value) + ' === -1';
      }
    };

    var fn = new Function('row', 'resolve', 'equal', 'indexOf', 'return ' + result('$and', query) + ';');
    return function(row) {
      if (row)
        return fn(row, utils.resolve, utils.equal, utils.indexOf);
      else
        return false;
    };
  };

  // Utils
  var utils = DataManager.utils = {};

  /**
    Resolve value from object by nested key

    @example
    ```js
    var obj = {a: 1, b: {c: 2, d: {e: 3}}};
    DataManager.resolve(obj, 'a'); // -> 1
    DataManager.resolve(obj, 'b.c'); // -> 2
    DataManager.resolve(obj, 'b.d.e'); // -> 3
    DataManager.resolve(obj, 'x.y.z'); // -> undefined
    ```

    @method resolve
    @param {Object} obj
    @param {String} key
    @return {Any}
  */
  utils.resolve = function resolve(obj, key) {
    if (!obj) return;
    if (obj[key]) return obj[key];

    var parts = key.split('.');
    return _.reduce(parts, function(memo, part) {
      return memo && memo[part];
    }, obj);
  };

  // Create a key for groupBy using key:value format
  utils.quickKey = function quickKey(row, keys, values) {
    var key = [];
    for (var i = 0, l = keys.length; i < l; i++) {
      key.push(keys[i] + ':' + values[i](row));
    }
    return key.join('&');
  };

  // Quickly clone an object
  utils.cloneObject = function cloneObject(obj) {
    var cloned = {};
    for (var key in obj) {
      cloned[key] = obj[key];
    }
    return cloned;
  };

  // Check if two values are equal
  utils.equal = _.isEqual;

  // Check if item is in array
  utils.indexOf = _.indexOf;

  // Utils related to building compiled functions
  var builder = DataManager.builder = {};

  // Convert raw value to compilable value
  builder.value = function value(raw_value) {
    if (_.isString(raw_value))
      return '\'' + raw_value + '\'';
    else if (raw_value instanceof Date)
      return 'new Date(\'' + raw_value.toJSON() + '\')';
    else if (_.isObject(raw_value))
      return JSON.stringify(raw_value);
    else
      return raw_value;
  };

  // Use utils.resolve if '.' in key, otherwise use direct method
  builder.resolve = function resolve(key) {
    if (key.indexOf('.') >= 0)
      return 'resolve(row, \'' + key + '\')';
    else
      return 'row[\'' + key + '\']';
  };

  // Use _.isEqual ("equal" in fn scope) to compare row value to value
  builder.equal = function equal(key, value) {
    return 'equal(' + builder.resolve(key) + ', ' + builder.value(value) + ')';
  };

  // Use _.indexOf ("indexOf" in fn scope) to check if value is in array
  builder.indexOf = function(key, value) {
    return 'indexOf(' + builder.value(value) + ', ' + builder.resolve(key) + ')';
  };

})(_, RSVP, d3, this);
