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
        activity: function(cb){
          couch.db.view('coordel/userActivityReport', {startkey: [user.appId], endkey:[user.appId, {}], group: true, group_level: 2, reduce: true}, function(e, rows){
            if (e){
              cb('error'+e);
            } else {
              var act = {};
              var tasks = [];
              var other = [];
              var keys = ['message'
                , 'project-gave-feedback'
                , 'idea-invites-sent'
                , 'task-cleared-issue'
                , 'task-raised-issue'
                , 'task-submitted'
                , 'task-created'
                , 'task-agreed-done'
                , 'task-delegated'
                , 'task-declined'
                , 'task-accepted'
                , 'task-returned'
                , 'task-left'];
              var map = {
                message: 'MESSAGES',
                "project-gave-feedback": 'GAVE FEEDBACK',
                "project-invites-sent": "INVITED",
                "task-cleared-issue": "CLEARED ISSUES",
                "task-raised-issue": "RAISED ISSUES",
                "task-created": "CREATED",
                "task-submitted": "PROPOSED DONE",
                "task-agreed-done": "AGREED DONE",
                "task-delegated": "DELEGATED",
                "task-declined": "DECLINED",
                "task-accepted": "ACCEPTED",
                "task-returned": "RETURNED",
                "task-left": "LEFT"
              };
              _.each(rows, function(item){
                var name = item.key[1];
                if (_.indexOf(keys, name)> -1){
                  var entry = {name: map[name], value:item.value, key: name};
                  if (name.indexOf('task') > -1){
                    tasks.push(entry);
                  } else {
                    other.push(entry);
                  }
                }
              });
              act.tasks = tasks;
              act.other = other;
              //console.log("activity rows", act);
              cb(null, act);
            }
          });
        },
        supportingTypes: function(cb){
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
               
                withTime: 0,
                withMoney: 0
              };

              if (acct.length){
                _.each(acct, function(item){
                  if (item.docType === "money-pledge") {
                    if (item.status === "PLEDGED"){
                      
                      result.withMoney = result.withMoney + 1;
                    } else if (item.status === "PROXIED"){
                      result.withMoney = result.withMoney + 1;
                    } else if (item.status === "ALLOCATED" && item.type === "RECURRING"){
                      result.withMoney = result.withMoney + 1;
                    }
                  } else if (item.docType === "time-pledge") {
                    if (item.status === "PLEDGED") {
                      result.withTime = result.withTime + 1;
                    } else if (item.status === "ALLOCATED" && item.type === "RECURRING"){
                      result.withTime = result.withTime + 1;
                    }
                  }
                });
              }
              cb(null, result);
            }
          });
        },
        feedback: function(cb){
          couch.db.view('coordel/userFeedbackV2', {endkey: [user.appId], startkey: [user.appId, {}], descending: true}, function(e, feedback){
            if (e){
              cb('error '+e);
            } else {

              feedback = _.map(feedback, function(item){
                return item.value;
              });

              var f = {
                score: {sum:0, count:0},
                coordination: {sum:0, count:0, avg: 0},
                performance: {sum:0, count:0, avg: 0},
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
          fn(null, profile);
        }
      });
    },

    findFeedbackComments: function(appId, fn){
      store.couch.db.view('coordel/userFeedbackV2', {startkey: [appId], endkey: [appId, {}]}, function(e, feedback){
        if (e){
          fn('error '+e);
        } else {

          feedback = _.map(feedback, function(item){
            return item.value;
          });

          fn(null, feedback);
        }
      });
    },

    findProxies: function(appId, fn){
      store.couch.db.view('coordel/ideaProxies', {startkey: [appId], endkey: [appId, {}]}, function(e, proxies){
        if (e){
          fn('error '+e);
        } else {
          
          var map = {
            ideas: {},
            people: {}
          };

          var result = {
            people: 0,
            ideas: 0
          };

          proxies = _.map(proxies, function(item){
            console.log('proxy', item);
            return item.value;
          });

          _.each(proxies, function(item){

            if (!map.ideas[item.project]){
              map.ideas[item.project] = true;
              result.ideas = result.ideas + 1;
            }

            if (!map.people[item.creator]){
              map.people[item.creator] = true;
              result.people = result.people + 1;
            }
          });

          fn(null, result);
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
                proxiedToMe: 0,
                proxiedToMeIdeas: [],
                allocatedProxiedToMeIdeas: [],
                deallocatedProxiedToMeIdeas: [],
                proxyAllocated: [],
                proxyDeallocated: [],
                allocated: 0,
                allocatedIdeas: [],
                pledgedTimeIdeas: [],
                allocatedTimeIdeas: [],
                pledgedTime: 0,
                reportedTime: 0
              };

              if (acct.length){
                result.pledges = acct;
                _.each(acct, function(item){
                  if (item.docType === "money-pledge") {
                    if (item.status === "PLEDGED"){
                      result.pledged = parseFloat(result.pledged) + parseFloat(item.amount);
                      result.pledgedIdeas.push(item.project);
                      //this shows the user that this is a recurring pledge
                      if (item.type === "RECURRING"){
                        result.recurringPledges.push(item.project);
                      }
                    } else if (item.status === "PROXIED"){
                      //console.log("proxied", item);

                      if (user.appId === item.creator){
                        result.proxied = parseFloat(result.proxied) + parseFloat(item.amount);
                        result.proxiedIdeas.push(item.project);
                      }
                      
                      //it's possible that am the proxy for multiple people on an idea, only add ideas once
                      if (user.appId === item.proxy && _.indexOf(result.proxiedToMeIdeas, item.project) === -1){
                        result.proxiedToMe = result.proxiedToMe + 1;
                        result.proxiedToMeIdeas.push(item.project);
                      }
                    } else if (item.status === "ALLOCATED"){
                      result.allocatedIdeas.push(item.project);
                      //this shows the user that this is an allocated recurring pledge
                      if (item.type === "RECURRING"){
                        result.pledged = parseFloat(result.pledged) + parseFloat(item.amount);
                        result.recurringAllocatedPledges.push(item.project);
                      }
                    }
                  } else if (item.docType === "allocation"){

                    result.allocated = parseFloat(result.allocated) + parseFloat(item.amount);

                  } else if (item.docType === "proxy-allocation"){
                    //track proxies
                    if (_.indexOf(result.proxiedToMeIdeas, item.project) === -1){
                      result.proxiedToMe = result.proxiedToMe + 1;
                      result.proxiedToMeIdeas.push(item.project);
                    }

                    //track allocated
                    if (item.status === "ALLOCATED"){
                      if (_.indexOf(result.allocatedProxiedToMeIdeas, item.project) === -1){
                        result.allocatedProxiedToMeIdeas.push(item.project);
                      }
                    }

                    //track deallocated
                    if (item.status === "DEALLOCATED"){
                      if (_.indexOf(result.deallocatedProxiedToMeIdeas, item.project) === -1){
                        result.deallocatedProxiedToMeIdeas.push(item.project);
                      }
                    }
                  } else if (item.docType === "time-report") {
              
                    result.reportedTime  = parseFloat(result.reportedTime) + parseFloat(item.amount);

                  } else if (item.docType === "time-pledge") {
                    if (item.status === "PLEDGED"){
                      result.pledgedTime = parseFloat(result.pledgedTime) + parseFloat(item.amount);
                      result.pledgedTimeIdeas.push(item.project);
                      if (item.type === "RECURRING"){
                        result.recurringTimePledges.push(item.project);
                      }
                    } else if (item.status === "ALLOCATED"){
                      result.allocatedTimeIdeas.push(item.project);
                      if (item.type === "RECURRING"){
                        result.timePledged = parseFloat(result.timePledged) + parseFloat(item.amount);
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