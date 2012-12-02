define('App', [
  'jquery',
  'underscore',
  'backbone',
  'Router',
  'bootstrap'
], function($, _, Backbone, Router) {

  function initialize() {
    console.log($, _);
  }

  // TODO: error handling with window.onerror
  // http://www.slideshare.net/nzakas/enterprise-javascript-error-handling-presentation

  return {
    initialize: initialize
  };
});