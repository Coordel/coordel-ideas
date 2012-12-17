/* Coordel Pledge
  A pledge tracks who pledges money
*/
var _ = require('underscore');

module.exports = function(store) {

  var validator = require('revalidator')
    , TimePledge;

  var Schema = {
    properties: {
      // enter any properties required for validation here
    }
  };

  TimePledge = {

    findById: function(id, fn){
      //couchdb get id
    },

    findByIdea: function(idea, fn){
      //couchdb view ideaPledges startkey[idea._id] endkey[idea._id, {}]
      store.couch.db.view('coordel/ideaTimePledges', {startkey: [idea], endkey:[idea,{}], include_docs: true}, function(e, o){
        if (e){
          fn(e);
        } else {
          o = _.map(o, function(item){
            return item.doc;
          });
          fn(null, o);
        }
      });
    },

    findByUser: function(user, fn){
      //couchdb view userPledges startkey[user.user] endkey[user.user, {}]
    },

    create: function(pledge, fn){
      //couchdb post pledge
      store.couch.db.save(pledge, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },

    save: function(pledge, fn){
      //couchdb put pledge
    },

    remove: function(pledge, fn){
      //couchdb delet pledge
    }

  };

  return TimePledge;

};