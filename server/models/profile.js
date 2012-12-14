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

      //console.log("finding miniProfile", user);

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
          redis.scard('user:'+user.appId+':supporting', function(e, o){
          
            if (e){
              //console.log("error getting supporting", e);
              cb('error ' + e);
            } else {
              //console.log("got supporting", o);
              cb(null,o);
            }
          });
        },
        contacts: function(cb){
          redis.scard('coordelapp:'+user.appId+':people', function(e, o){
            if (e){
              //console.log("error getting contacts", e);
              cb('error '+e);
            } else {
              //console.log("got contacts", o);
              cb(null, o);
            }
          });
        }
      },
      function(e, profile) {
        if (e){
          fn(e);
        } else {
          fn(null, profile);
        }
      });
    },

    findSupportAccount: function(user, fn){
      var redis = store.redis
        , couch = store.couch;

      async.parallel({
        supporting: function(cb){
          redis.smembers('user:'+user.appId+':supporting', function(e, o){
          
            if (e){
              //console.log("error getting supporting", e);
              cb('error ' + e);
            } else {
              //console.log("got supporting", o);
              cb(null,o);
            }
          });
        },
        account: function(cb){
          couch.db.view('coordel/userSupportAccount', {
            key: user.appId,
            group: true,
            group_level: "1",
            reduce: true}, function(e, acct){
            if (e){
              cb('error '+e);
            } else {
           
              var spt = {
                pledged: 0,
                pledgedIdeas: [],
                proxied: 0,
                proxiedIdeas: [],
                allocated: 0,
                allocatedIdeas: []
              };

              if (acct.length){
                spt = acct[0].value;
              }
              
              cb(null, spt);
            }
          });
        }
      },
      function(e, results) {
        if (e){
          fn(e);
        } else {
          var spt = results.account;
          spt.supportedIdeas = results.supporting;
          fn(null, spt);
        }
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