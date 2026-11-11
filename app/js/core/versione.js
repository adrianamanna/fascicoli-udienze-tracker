/* Versione dell'app. Va tenuta uguale a quella di package.json (un test lo controlla). */
(function (root) {
  'use strict';
  var GC = (root.GC = root.GC || {});
  GC.versione = '0.6.0';
})(typeof globalThis !== 'undefined' ? globalThis : this);
