requirejs.config({
  shim: {
    'underscore': {
      exports: '_'
    },
    'backbone': {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    },
    'bootstrap': {
      deps: ['jquery'],
      exports: 'bootstrap'
    }
  },
  /**
   * HACK:
   * Modified Underscore and Backbone to be AMD compatible (define themselves)
   * since it didn't work properly with the RequireJS shim when optimizing
   */
  paths: {
    'text'             : '../js/lib/text',
    'jquery'           : '../js/lib/jquery',
    'underscore'       : '../js/lib/underscore',
    'backbone'         : '../js/lib/backbone',
    'bootstrap'        : '../js/lib/bootstrap',
    'moment'           : '../js/lib/moment',
    'icanhaz'          : '../js/lib/icanhaz',
    'App'              : 'app',
    'Router'           : 'router'
  }
});
