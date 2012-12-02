define('IdeaModel', [
  'jquery',
  'underscore',
  'backbone',
  'moment'
], function($, _, Backbone, moment) {
  var Client;

  var timestamp = moment().format();

  Client = Backbone.Model.extend({
    idAttribute: "_id",
    urlRoot: "/api/v1/ideas",
    // set defaults for checking existance in the template for the new model
    defaults: {
      responsible: '', //defaults to the username
      deadline: moment().add('days', 90).format(), //set to 90 days from today by default
      created: timestamp, //set to now
      updated: timestamp
    }
  });

  return Idea;
});