/* Coordel Profile
  A profile is supplemental information about a user

  idea-profile - returns the idea count, supporting count, and contact count for a user
  
  profile returns the settings, location, personal link, bio of the user

*/
var async = require('async')
  , _ = require('underscore');

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
        },
        feedback: function(cb){
          couch.db.view('coordel/userFeedbackComments', {startkey: [user.appId], endkey: [user.appId, {}]}, function(e, feedback){
            if (e){
              cb('error '+e);
            } else {
              console.log("feedback", feedback);

              feedback = _.map(feedback, function(item){
                return item.value;
              });

              var f = {
                score: {sum:0, count:0},
                coordination: {sum:0, count:0},
                performance: {sum:0, count:0},
                avg: 0
              };

              if (feedback.length){
                
                _.each(feedback, function(item){
                  if (item.score){
                    f.score.sum += item.score;
                    f.score.count += 1;
                  }
                  if (item.coordination){
                    f.coordination.sum += item.coordination;
                    f.coordination.count += 1;
                  }
                  if (item.performance){
                    f.performance.sum += item.performance;
                    f.performance.count += 1;
                  }
                });

                //f.score.avg = f.score.sum/f.score.count;
                f.coordination.avg = f.coordination.sum/f.coordination.count;
                f.performance.avg = f.performance.sum/f.performance.count;

                f.avg = Math.round((f.coordination.avg + f.performance.avg) / 2);
                console.log("feedback", f);
                
                cb(null, f);
              } else {
                cb (null, f);
              }
            }
          });
        }
      },
      function(e, profile) {
        if (e){
          fn(e);
        } else {
          console.log("profile ", profile);
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
            startkey: [user.appId],
            endkey: [user.appId, {}]}, function(e, acct){
            if (e){
              cb('error '+e);
            } else {

              acct = _.map(acct, function(item){
                return item.value;
              });
           
              var result = {
                pledges: [],
                pledged: 0,
                pledgedIdeas: [],
                recurringPledges: [],
                recurringAllocatedPledges: [],
                recurringTimePledges: [],
                recurringAllocatedTimePledges: [],
                proxied: 0,
                proxiedIdeas: [],
                allocated: 0,
                allocatedIdeas: [],
                pledgedTimeIdeas: [],
                pledgedTime: 0
              };

              if (acct.length){
                result.pledges = acct;
                _.each(acct, function(item){
                  if (item.docType === "money-pledge") {
                    if (item.status === "PLEDGED"){
                      result.pledged = result.pledged + item.amount;
                      result.pledgedIdeas.push(item.project);
                      //this shows the user that this is a recurring pledge
                      if (item.type === "RECURRING"){
                        result.recurringPledges.push(item.project);
                      }
                    } else if (item.status === "PROXIED"){
                      //console.log("proxied", item);
                      result.proxied = result.proxied + item.amount;
                      result.proxiedIdeas.push(item.project);
                    } else if (item.status === "ALLOCATED"){
                      //this shows the user that this is an allocated recurring pledge
                      if (item.type === "RECURRING"){
                        result.recurringAllocatedPledges.push(item.project);
                      }
                    }
                  } else if (item.docType === "time-pledge") {
                    if (item.status === "PLEDGED"){
                      result.pledgedTime = result.pledgedTime + item.amount;
                      result.pledgedTimeIdeas.push(item.project);
                      if (item.type === "RECURRING"){
                        result.recurringTimePledges.push(item.project);
                      }
                    } else if (item.status === "ALLOCATED"){
                      if (item.type === "RECURRING"){
                        result.recurringAllocatedTimePledges.push(item.project);
                      }
                    }
                  }
                });
              }

              cb(null, result);
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