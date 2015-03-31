(function(_, RSVP, d3, global) {
  'use strict';

  // Attach properties to global data object
  var dataManager = global.dataManager = {};

  /**
    Generic data store with async load, cast, map, and query

    @class Store
  */
  var Store = dataManager.Store = function Store() {
    this.loading = [];
    this.errors = [];

    // Initialize data cache
    this._cache = {};

    // Load types from static
    this.types = _.clone(Store.types);

    // Set default cast and map functions
    this._cast = this._generateCastByFilename({default: function(row) { return row; }});
    this._map = this._generateMapByFilename({default: function(row) { return row; }});
  };

  // Type converters for cast
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

  Store.prototype ={
    /**
      Load current data in store (sync)

      @param {String} [path]
      @return {Object}
    */
    cache: function(path) {
      // Initialize cache for path (if needed)
      if (path && !this._cache[path]) {
        this._cache[path] = {
          meta: {filename: path},
          raw: [],
          values: []
        };
      }

      // Return path or all of data
      return path ? this._cache[path] : this._cache;
    },

    /**
      Load values currently in store
      
      @return {Promise}
    */
    values: function() {
      return new RSVP.Promise(function(resolve) {
        resolve(this.cache());
      }.bind(this));
    },

    /**
      Load file(s) into store with options

      @param {String|Array} path to csv(s)
      @param {Object} [options]
      @return {Promise}
    */
    load: function load(path, options) {
      var paths = _.isArray(path) ? path : [path];
      
      // Generate _cast and _map
      options = options || {};
      if (options.cast)
        options._cast = this._generateCast(options.cast);
      if (options.map)
        options._map = this._generateMap(options.map);

      // 1. Load from path (cache or csv)
      var loading = RSVP.all(_.map(paths, function(path) {
        return this._load(path, options);
      }, this));

      // 2. Process rows
      // 3. Catch errors
      // 4. Finally remove
      loading = loading
        .then(this._doneLoading.bind(this, paths, options))
        .catch(function(err) {
          this._error({from: 'Store#load', error: err, paths: paths, options: options});
        }.bind(this))
        .finally(function() {
          this.loading = _.without(this.loading, loading);
        }.bind(this));

      // Add to loading (treat this.loading as immutable array)
      this.loading = this.loading.concat([loading]);

      return loading;
    },

    /**
      Register cast options/iterator to be called on every incoming row (before map)
      (e.g. Convert from strings to useful data types)
      
      @param {Object|Function} options or iterator
      @chainable
    */
    cast: function cast(options) {
      this._cast = this._generateCastByFilename({default: options});
      this._process();

      return this;
    },

    /**
      Register cast options/iterator to be called on every incoming row, by filename

      @param {Object|Function} options or iterator
      - As object: {filenameA: {options by key or iterator}, filenameB: ..., default: ...}
      - As iterator: function(filename, row) {return cast row}
      @chainable
    */
    castByFilename: function castByFilename(options) {
      this._cast = this._generateCastByFilename(options);
      this._process();

      return this;
    },

    /**
      Register map option/iterator to be called with every incoming row

      @param {Object|Function} options or iterator
      - Example
        {
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
        }
      @chainable
    */
    map: function map(options) {
      this._map = this._generateMapByFilename({default: options});
      this._process();

      return this;
    },

    /**
      Register map options/iterator to be called with every incoming row by filename

      @param {Object|Function} options or iterator
      - As object (filanameA: {options or iterator}, filenameB: ..., default: ...},
      - As iterator: function(filename, row) {return mapped row}
      @chainable
    */
    mapByFilename: function mapByFilename(options) {
      this._map = this._generateMapByFilename(options);
      this._process();

      return this;
    },

    /**
      Create new query of data store

      @param {Object} config to pass to query
      @return {Query}
    */
    query: function query(options) {
      return new Query(this, options);
    },

    // Process all data
    _process: function _process() {
      _.each(this.cache(), function(cache, path) {
        cache.values = this._processRows(cache.raw, cache.meta);
      }, this);
    },

    // Process given rows
    _processRows: function _processRows(rows, options) {
      var castFn = (options && options._cast) || this._cast.bind(this, options.filename);
      var mapFn = (options && options._map) || this._map.bind(this, options.filename);

      // Cast and map rows
      var cast = _.compact(_.flatten(_.map(rows, castFn, this), true));
      var mapped = _.compact(_.flatten(_.map(cast, mapFn, this), true));

      return mapped;
    },

    // Generate map function for options
    _generateMap: function _generateMap(options) {
      options = options || {};
      if (_.isFunction(options)) return options;

      function resolveFromRowOrMapped(row, mapped, key) {
        var value = resolve(row, key);
        if (_.isUndefined(value)) {
          value = resolve(mapped, key);
        }

        return value;
      }

      return function _map(row) {
        var mappedRows = [{}];
        var keys = [];
        _.each(options, function(option, to) {
          mappedRows = _.compact(_.flatten(_.map(mappedRows, function(mapped) {
            if (_.isObject(option)) {
              // Add columns to keys
              keys = keys.concat(option.columns);

              // Split columns into rows
              return _.map(option.columns, function(from) {
                var value = resolveFromRowOrMapped(row, mapped, from);
                if (!_.isUndefined(value)) {
                  var newRow = _.extend({}, mapped);
                  newRow[to] = value;

                  if (option.categories) {
                    _.extend(newRow, option.categories[from] || {});
                  }
                  else {
                    newRow[option.category || '__yColumn'] = from;
                  }

                  return newRow;
                }
                else {
                  return null;
                }
              });
            }
            else {
              keys.push(option);
              mapped[to] = resolveFromRowOrMapped(row, mapped, option);
              return mapped;
            }
          }), true));
        });

        // Copy non-mapped keys (except for "blank" keys)
        var copy = _.pick(row, _.difference(_.keys(row), keys, ['']));
        if (copy) {
          _.each(mappedRows, function(mapped) {
            _.extend(mapped, copy);
          });
        }

        return mappedRows;
      };
    },

    _generateMapByFilename: function _generateMapByFilename(options) {
      if (_.isFunction(options)) {
        return options;
      }
      else {
        options = _.defaults(options || {}, {default: {}});
        _.each(options, function(option, key) {
          options[key] = this._generateMap(option);
        }, this);

        return function _mapByFilename(filename, row) {
          if (options[filename]) {
            return options[filename](row);
          }
          else {
            return options['default'](row);
          }
        };
      }
    },

    _generateCast: function _generateCast(options) {
      if (_.isFunction(options)) return options;

      var types = this.types;
      return function _cast(row) {
        _.each(options, function(type, key) {
          var cast = _.isFunction(type) ? type : types[type];
          if (cast)
            row[key] = cast(row[key]);
        });

        return row;
      };
    },

    _generateCastByFilename: function _generateCastByFilename(options) {
      if (_.isFunction(options)) {
        return options;
      }
      else {
        options = _.defaults(options || {}, {default: {}});
        _.each(options, function(option, key) {
          options[key] = this._generateCast(option);
        }, this);

        return function _castByFilename(filename, row) {
          if (options[filename]) {
            return options[filename](row);
          }
          else {
            return options['default'](row);
          }
        };
      }
    },

    // Load (with caching)
    _load: function _load(path, options) {
      var cache = this.cache(path);

      if (cache.meta.loaded) {
        return new RSVP.Promise(function(resolve) { 
          resolve(cache.raw); 
        });
      }
      else if (cache.meta.loading) {
        return cache.meta.loading;
      }
      else {
        var loading = this._loadCsv(path);

        cache.meta.loading = loading;
        return loading;
      }
    },

    // Load csv from given path
    _loadCsv: function _loadCsv(path) {
      return new RSVP.Promise(function(resolve, reject) {
        d3.csv(path).get(function(err, rows) {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    },

    // Handle loading finished (successfully)
    _doneLoading: function _doneLoading(paths, options, rows) {
      // Process rows for each path
      _.each(paths, function(path, index) {
        var cache = this.cache(path);

        // Only update if new values or new cast / map
        if (cache.raw.length != rows[index].length || options.cast || options.map) {
          // Store options
          _.extend(cache.meta, options);

          // Store raw rows
          cache.raw = rows[index];

          // Store processed rows
          cache.values = this._processRows(rows[index], cache.meta);

          cache.meta.loaded = new Date();
        }

        delete cache.meta.loading;
      }, this);

      return this.cache();
    },

    // Handle errors
    _error: function(info) {
      this.errors.push(info);
    }
  };

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
  var Query = dataManager.Query = function Query(store, query) {
    this.store = store;

    this._query = query;
    this._values = [];
    this.calculate();
  };

  Query.prototype ={
    /**
      Get results of query

      @return {Promise}
    */
    values: function values() {
      if (this.calculating) {
        return this.calculating;
      }
      else {
        return new RSVP.Promise(function(resolve) { resolve(this._values); }.bind(this));
      }
    },

    /**
      Update query parameters

      @param {Object} query
    */
    update: function update(query) {
      this._query = query;
      this.calculate();
    },

    /**
      Calculate results of query

      Steps:
      1. from
      2. preprocess (rows)
      3. filter
      4. groupBy
      5. reduce
      6. postprocess (meta, values)
      7. series

      @return {Promise}
    */
    calculate: function calculate() {
      var query = this._query;
      var from = (_.isString(query.from) ? [query.from] : query.from) || [];

      // Cancel any existing calculations
      if (this.calculating) {
        this.calculating.cancelled = true;
      }

      var calculation = this.calculating = this.store.load(from)
        .then(function(data) {
          // 1. from
          var rows = _.reduce(data, function(memo, cache, filename) {
            if (!from.length || _.contains(from, filename)) {
              return memo.concat(cache.values);
            }
            else {
              return memo;
            }
          }, []);

          // 2. preprocess
          if (_.isFunction(query.preprocess)) {
            rows = query.preprocess(rows);
          }

          // 3. filter
          if (query.filter) {
            if (_.isFunction(query.filter)) {
              rows = _.filter(rows, query.filter);
            }
            else {
              rows = _.filter(rows, function(row) {
                return matcher(query.filter, row);
              });
            }
          }

          // 4. groupBy
          var results = this._groupBy(rows, query.groupBy);

          // 5. reduce
          results = this._reduce(results, query.reduce);

          // 6. postprocess
          if (_.isFunction(query.postprocess)) {
            var processed = _.map(results, function(result) {
              return query.postprocess(result.values, result.meta);
            });

            if (processed[0] instanceof RSVP.Promise) {
              // postprocess returned promises, wait for them to complete
              return RSVP.all(processed).then(afterPostProcessing.bind(this));
            }
            else if (_.isUndefined(processed[0])) {
              // Assume, return not called from processed and values were changed directly
              return afterPostProcessing.call(this);
            }
            else {
              return afterPostProcessing.call(this, processed);
            }
          }
          else {
            return afterPostProcessing.call(this);
          }

          function afterPostProcessing(processed) {
            if (!_.isUndefined(processed)) {
              _.each(processed, function(values, index) {
                results[index].values = values;
              });
            }

            // 7. series
            results = this._series(results, query.series);

            return results;
          }
        }.bind(this))
        .then(function(results) {
          if (!calculation.cancelled) {
            // Store values
            this._values = results;
          }

          return results;
        }.bind(this))
        ['catch'](function(err) {
          this.store._error({from: 'Query#calculate', error: err, query: this});
        }.bind(this))
        ['finally'](function() {
          if (!calculation.cancelled) {
            delete this.calculating;
          }
        }.bind(this));

      return this.calculating;
    },

    /**
      Internal implmentation of groupBy
      
      @param {Array} rows
      @param {String|Array|Object} key or keys array or key function object to group by
      - 'key' -> meta: group: {key: 'value'}
      - ['keyA', 'keyB'] -> meta: {keyA: 'value', keyB: 'value'},
      - {keyA: function(row) {...}, keyB: function(row) {...}} -> meta: {keyA: 'value', keyB: 'value'}
      @return {Array}
    */
    _groupBy: function(rows, groupBy) {
      if (!groupBy) {
        return [{meta: {}, values: rows}];
      }
      else {
        var grouped = {};
        var meta = {};

        // Convert String -> Array -> Object format for groupBy
        if (_.isString(groupBy)) {
          groupBy = [groupBy];
        }
        if (_.isArray(groupBy)) {
          groupBy = _.object(groupBy, _.map(groupBy, function(key) {
            return function(row) {
              return row[key];
            };
          }));
        }

        // Convert groupBy to arrays for quick iteration
        var keys = [];
        var values = [];
        _.each(groupBy, function(value, key) {
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
    },

    /**
      Internal implementation of reduce

      @param {Array} results
      @param {Object} reduce
      @return {Array}
    */
    _reduce: function(results, reduce) {
      if (reduce) {
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

          if (_.isFunction(reduce.iterator)) {
            reduced = _.reduce(result.values, reduce.iterator, reduce.memo || {});
            result.values = [reduced];
          }
          else if (reduce.byColumn) {
            _.each(reduce.byColumn, function(approach, column) {
              reduced[column] = approaches[approach](result.values, column);
            });

            result.values = [reduced];
          }
          else if (reduce.columns && reduce.approach) {
            _.each(reduce.columns, function(column) {
              reduced[column] = approaches[reduce.approach](result.values, column);
            });

            result.values = [reduced];
          }
        });
      }

      return results;
    },

    /**
      Internal implementation of series

      @param {Array} results
      @param {Array} series definitions (by meta)
      @return {Array}
    */
    _series: function(results, series) {
      // TODO, don't put values directly on the series object (clone first)
      if (!series) {
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
        if (!_.isArray(series)) {
          _.each(series, function(series_values, key) {
            series[key] = _.map(series_values, createSeries);
          });
          results = series;
        }
        else {
          results = _.map(series, createSeries);
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
    }
  };

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
  var matcher = dataManager.matcher = function matcher(query, row, lookup) {
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
    dataManager.resolve(obj, 'a'); // -> 1
    dataManager.resolve(obj, 'b.c'); // -> 2
    dataManager.resolve(obj, 'b.d.e'); // -> 3
    dataManager.resolve(obj, 'x.y.z'); // -> undefined
    ```
  
    @method resolve
    @param {Object} obj
    @param {String} key
    @return {Any}
  */
  var resolve = dataManager.resolve = function resolve(obj, key) {
    if (!obj) return;
    if (obj[key]) return obj[key];

    var parts = key.split('.');
    return _.reduce(parts, function(memo, part) {
      return memo && memo[part];
    }, obj);
  };

  // Create a key for groupBy using key:value format
  function quickKey(row, keys, values) {
    var key = '';
    for (var i = 0, l = keys.length; i < l; i++) {
      if (key.length > 0)
        key += '&';

      key += keys[i] + ':' + values[i](row);
    }
    return key;
  }

})(_, RSVP, d3, this);
