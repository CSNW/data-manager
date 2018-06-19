(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.DataManager = {})));
}(this, (function (exports) { 'use strict';

  class Source {
    query() {
      // TODO
    }
  }

  function table() {
    // TODO
  }

  function filter() {
    // TODO
  }

  function map() {
    // TODO
  }

  function sort() {
    // TODO
  }

  function sortBy() {
    // TODO
  }

  const compare = {
    // TODO
  };

  function groupBy() {
    // TODO
  }

  function clone() {
    // TODO
  }

  exports.Source = Source;
  exports.table = table;
  exports.filter = filter;
  exports.map = map;
  exports.sort = sort;
  exports.sortBy = sortBy;
  exports.compare = compare;
  exports.groupBy = groupBy;
  exports.clone = clone;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
