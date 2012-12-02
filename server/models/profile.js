/* Coordel Profile
  A profile is supplemental information about a user

  idea-profile - returns the idea count, supporting count, and contact count for a user
  
  profile returns the settings, location, personal link, bio of the user

*/
var async = require('async');

module.exports = function(store) {

  var validator = require('revalidator')
    , Profile;

  var Schema = {
    properties: {
      // enter any properties required for validation here
    }
  };

  Profile = {

    findMiniProfile: function(user, fn){
      var funcs = []
        , redis = store.redis
        , couch = store.couch;

      async.parallel({
        ideas: function(cb){
          couch.db.view('coordel/userOpportunities', {startkey: [user.appId], endkey: [user.appId, {}]}, function(e, opps){
            if (e){
              cb('error '+e);
            } else {
              cb(null, opps.length);
            }
          });
        },
        supporting: function(cb){
          redis.scard('user:'+user.id+':supporting', function(e, o){
          
            if (e){
              console.log("error getting supporting", e);
              cb('error ' + e);
            } else {
              console.log("got supporting", o);
              cb(null,o);
            }
          });
        },
        contacts: function(cb){
          redis.scard('coordelapp:'+user.appId+':people', function(e, o){
            if (e){
              console.log("error getting contacts", e);
              cb('error '+e);
            } else {
              console.log("got contacts", o);
              cb(null, o);
            }
          });
        }
      },
      function(e, profile) {
        if (e){
          fn(e);
        }
          fn(null, profile);
      });
    },

    findById: function(id, fn){
      //returns the couchdb get id
      //will include all profile, etc for the user
    },

    create: function(profile, fn){
      //when a profile is create, a doc with docType="user" is created in couchdb
      //profile info can be extended into this doc as the application grows
    }

  };

  return Profile;

};