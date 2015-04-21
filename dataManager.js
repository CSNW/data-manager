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

    // Set default cast and map functions
    this._cast = Store.generateCast(function(row) { return row; });
    this._map = Store.generateMap(function(row) { return row; });
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
      return _.isString(value) ? value.toUpperCase() === 'TRUE' : (value === 1 || value === true);
    },
    'String': function(value) {
      return _.isUndefined(value) ? '' : '' + value;
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
  Store.processRows = function processRows(cache, store) {
    var castFn = (cache._cast) || store._cast;
    var mapFn = (cache._map) || store._map;

    // Cast and map rows
    cache.values = cache.raw;
    cache.values = _.compact(_.map(cache.values, function(row, index) {
      return castFn.call(store, row, index, cache, store.types);
    }));
    cache.values = _.reduce(cache.values, function(memo, row, index) {
      return mapFn.call(store, memo, row, index, cache);
    }, []);

    return cache.values;
  };

  // Generate map function for options
  function omit(obj, keys) {
    var copy = {};
    for (var key in obj) {
      if (!_.contains(keys, key))
        copy[key] = obj[key];
    }
    return copy;
  }
  Store.generateMap = function generateMap(options) {
    options = options || {};
    if (_.isFunction(options)) {
      return function(memo, row, index, details) {
        memo.push(options.call(this, row, index, details));
        return memo;
      };
    }

    // Categorize mapping
    var simple = [];
    var complex = [];
    var keys = [];
    _.each(options, function(option, to) {
      if (_.isObject(option)) {
        complex.push(_.defaults({to: to}, option, {
          category: '__yColumn'
        }));
        keys = keys.concat(option.columns);
      }
      else {
        simple.push({to: to, from: option});
        keys.push(option);
      }
    });

    return function mapRow(memo, row, index, details) {
      // Copy non-mapped keys from row
      var mapped = omit(row, keys);

      // First, do simple mapping
      _.each(simple, function(options) {
        mapped[options.to] = resolve(row, options.from);
      });

      // Then, do complex mapping
      if (complex.length) {
        var results = [mapped];

        _.each(complex, function(options) {
          var prev_results = results;
          results = [];

          _.each(prev_results, function(mapped) {
            _.each(options.columns, function(from) {
              var value = resolve(row, from);

              if (value != null) {
                var categories = options.categories && options.categories[from];

                var new_row = _.extend({}, mapped, categories);
                new_row[options.to] = value;

                if (!options.categories)
                  new_row[options.category] = from;

                results.push(new_row);
              }
            });
          });
        });

        _.each(results, function(mapped) {
          memo.push(mapped);
        });
      }
      else {
        memo.push(mapped);
      }

      return memo;
    };
  };

  Store.generateCast = function generateCast(options) {
    if (_.isFunction(options)) return options;

    return function castRow(row, index, details, types) {
      _.each(options, function(type, key) {
        var cast = _.isFunction(type) ? type : types[type];
        if (cast)
          row[key] = cast(row[key]);
      });

      return row;
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
        options._cast = Store.generateCast(options.cast);
      if (options.map)
        options._map = Store.generateMap(options.map);

      var loading = _.map(paths, function(path) {
        var cache = this.cache[path];

        if (!cache) {
          // New path
          cache = this.cache[path] = {
            filename: path,
            raw: [],
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
            .then(function(raw) {
              cache.raw = raw;

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
      this._cast = Store.generateCast(options);
      _.each(this.cache, function(cache) {
        // Re-process rows as necessary
        if (!cache.cast)
          Store.processRows(cache, this);
      }, this);

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
      _.each(this.cache, function(cache) {
        // Re-process rows as necessary
        if (!cache.map)
          Store.processRows(cache, this);
      }, this);

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
          return _.filter(rows, function(row) {
            return matcher(predicate, row);
          });
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
            var key = quickKey(row, keys, values);
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
          var result = _.find(results, function(result) {
            return matcher(series.meta, result.meta);
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
    matcher({a: 4, b: 3}, test); // -> true

    // z = 0 OR b = 3
    matcher({$or: {z: 0, b: 3}}, test); // -> true

    // c < 10 AND d >= 1
    matcher({c: {$lt: 10}, d: {$gte: 1}}, test); // -> true

    // a in [3, 4, 5] and d != 0
    matcher({a: {$in: [3, 4, 5]}, d: {$ne: 0}}, test); // -> true
    ```

    @method matcher
    @param {Object} query
    @param {Object} row
    @param {String} [lookup] (lookup value for recursion)
    @returns {Boolean}
  */
  var matcher = DataManager.matcher = function matcher(query, row, lookup) {
    function value(key, item) {
      var operation = logical[key] || comparison[key];
      if (operation) return operation(item);

      // If query is given for row key, match recursively with lookup
      // otherwise compare with equals
      // TODO Not too slow, but look into non-recursive approach
      var isQuery = _.isObject(item) && !(item instanceof Date) && !_.isArray(item);
      if (isQuery) return matcher(item, row, key);
      else return _.isEqual(resolve(row, key), item);
    }

    var logical = {
      '$and': function(query) {
        return _.reduce(query, function(result, item, key) {
          return result && value(key, item);
        }, true);
      },
      '$or': function(query) {
        return _.reduce(query, function(result, item, key) {
          return result || value(key, item);
        }, false);
      },
      '$not': function(query) {
        return !logical['$and'](query);
      },
      '$nor': function(query) {
        return _.reduce(query, function(result, item, key) {
          return result && !value(key, item);
        }, true);
      }
    };
    var comparison = {
      '$gt': function(value) {
        return resolve(row, lookup) > value;
      },
      '$gte': function(value) {
        return resolve(row, lookup) >= value;
      },
      '$lt': function(value) {
        return resolve(row, lookup) < value;
      },
      '$lte': function(value) {
        return resolve(row, lookup) <= value;
      },
      '$in': function(value) {
        return _.indexOf(value, resolve(row, lookup)) >= 0;
      },
      '$ne': function(value) {
        return resolve(row, lookup) !== value;
      },
      '$nin': function(value) {
        return _.indexOf(value, resolve(row, lookup)) === -1;
      }
    };

    return logical['$and'](query);
  };

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
  var resolve = DataManager.resolve = function resolve(obj, key) {
    if (!obj) return;
    if (obj[key]) return obj[key];

    var parts = key.split('.');
    return _.reduce(parts, function(memo, part) {
      return memo && memo[part];
    }, obj);
  };

  // Create a key for groupBy using key:value format
  function quickKey(row, keys, values) {
    var key = [];
    for (var i = 0, l = keys.length; i < l; i++) {
      key.push(keys[i] + ':' + values[i](row));
    }
    return key.join('&');
  }

})(_, RSVP, d3, this);
