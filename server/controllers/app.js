var _     = require('underscore')
  , utils = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log   = console.log
  , md5   = require('MD5')
  , async = require('async')
  , request = require('request')
  , moment = require('moment')
  , IntroController;

AppController = function(store) {

  var Idea = require('../models/idea')(store);
  var Profile = require('../models/profile')(store);
  var UserApp = require('../models/userApp')(store);
  var Parse = require('../util/parse')(store);

  function searchPointerIdeas(query, fn){
    Parse.findPointerIdeas(query, function(e, o){
      if (e){
        fn(e);
      } else {
        fn(null, o);
      }
    });
  }

  function search(query, fn){
   
    var view = "ideaSearch";

    var words = []; //holds the words after filtering (matches function in search view in couchdb)
    var parse = ((query).toLowerCase().match(/\w+/g));
    var stopwords_en = {"a":true, "an":true, "the":true};
    parse.forEach(function(word){
      word = word.replace(/^[_]+/,"");
      if (!stopwords_en[word]){
        if (word.length >= 3){
          if (!word.match(/^\d+$/)){
            words.push(word);
          }
        }
      }
    });

    if (!words.length){
      fn(null, []);
    }

    var funcs = []; //holds the loading of each of the words by key
    var map = []; //holds the arrays of found ids for words by key

    //push the load word function for each of the words in the query
    words.forEach(function(word){
      funcs.push(loadWord(word));
      //funcs.push(loadUser(word));
    });

    //this function gets passed to the async.parallel function
    function loadWord(word){
      return function (cb){
        store.couch.db.view('coordel/' + view, {key: word, include_docs:true}, function(e, list){
          if (e){
            cb(e);
          } else {
            cb(null, list);
          }
        });
      };
    }
    
    function loadUser(word){
      return function (cb){
        store.couch.db.view('coordel/userSearch', {key: word, include_docs:true}, function(e, list){
          if (e){
            cb(e);
          } else {
            cb(null, list);
          }
        });
      };
    }
    
    async.parallel(funcs, function(err, results){

      //if there's an error, just send back an empty array
      if (err) res.json({results: []});
      //when the results of the word queries are iterated, the collected docs are held in this map
      var docs = {};
      results.forEach(function(list){
        //array to hold the ids of the docs for this word
        var ids = [];
        list.forEach(function(word,doc){

          //console.log("view", view);
          if (!docs[doc._id]){
            docs[doc._id] = doc;
          }
          ids.push(doc._id);
    
          map.push(ids);
        });
      });

      //now, intersect all of the word-ids arrays (finds the common ids across all arrays)
      var matches = _.intersection.apply(_,map);

      //now iterate the matches and fill the toReturn array with the docs that match
      var toReturn = [];
      _.each(matches, function(id){
        toReturn.push(docs[id]);
      });

      fn(null, toReturn);
    });
  }

  var App = {

    index: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        timeline: function(cb){
           Idea.timeline(0, function(e, o){
            if (e){
              cb('error' +e);
            } else {
              cb(null, o);
            }
          });
        },
        pointers: function(cb){
          Parse.findPointerTimeline(20, function(e, o){
            if (e){
              cb(e);
            } else {
              var p = _.filter(o, function(item){
                return item;
              });
              cb(null, p);
            }
          });
        }
      },
      function(e, results) {

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);


        //get the ideas
        var ideas = [];
        _.each(results.timeline, function(i){
          //since the project was stored as a string, we need to parse it before returning it.
          ideas.push(i);
        });

        res.render('index', {
          token: res.locals.token,
          title: 'Coordel',
          menu: '#menuIdeas',
          subNav: 'timeline',
          user: ext.user,
          ideas: compress(ideas),
          pointers: compress(results.pointers),
          profile: ext.profile,
          contacts: ext.contacts,
          username: req.session.username,
          imageUrl: req.session.currentUser.imageUrl,
          workspaceUrl:  store.workspaceUrl,
          fullName: req.session.currentUser.fullName,
          _csrf: req.session._csrf
        });
      });
    },

    settings: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        timeline: function(cb){
           Idea.timeline(0, function(e, o){
            if (e){
              cb('error' +e);
            } else {
              cb(null, o);
            }
          });
        }
      },
      function(e, results) {

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);

        //get the ideas
        var ideas = [];
        _.each(results.timeline, function(i){
          //since the project was stored as a string, we need to parse it before returning it.
          ideas.push(i);
        });
       
        res.render('settings', {
          token: res.locals.token,
          title: 'Coordel',
          menu: '#menuSettings',
          subNav: 'subNavProfile',
          user: ext.user,
          ideas: compress(ideas),
          profile: ext.profile,
          contacts: ext.contacts,
          username: req.session.username,
          imageUrl: req.session.currentUser.imageUrl,
          fullName: req.session.currentUser.fullName,
          workspaceUrl:  store.workspaceUrl,
          currencies: compress(store.bitcoin.currencies()),
          _csrf: req.session._csrf
        });
      });
    },

    showIdea: function(req, res){

      var id = req.params.id
        , hash = req.params.hash;


      //console.log("showing idea", id, hash);

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        ideas: function(cb){
          if (id){
            console.log("getting id", id);
            Idea.findById(id, function(e, o){
            if (e){
                cb(e);
              } else {
                cb(null, [o]);
              }
            });
          } else if (hash){
            console.log("getting hash", hash);
            Idea.findByHash(hash, function(e, o){
              if (e){
                cb(e);
              } else {
                cb(null, [o]);
              }
            });
          } else {
            cb([{}]);
          }
           
        }
      },
      function(e, results) {

        //console.log("got the results", results.ideas);

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);

       

        res.render('idea', {
          token: res.locals.token,
          title: 'Coordel idea',
          menu: '#menuOtherIdea',
          subNav: 'singleIdea',
          user: ext.user,
          ideas: compress(results.ideas),
          profile: ext.profile,
          contacts: ext.contacts,
          pointers: compress([]),
          username: req.session.username,
          imageUrl: req.session.currentUser.imageUrl,
          fullName: req.session.currentUser.fullName,
          workspaceUrl: store.workspaceUrl,
          _csrf: req.session._csrf
        });
      });
    },

    

    showIdeaFromHash: function(req, res){
      var hash = req.params.hash;
    },

    search: function(req, res){
      var query = req.query.q
        , user = req.session.currentUser;

      async.parallel({
          extendedUser: function(cb){
            extendUser(user, function(e, ext){
              cb(null,ext);
            });
          },
          searchResults: function(cb){
            if (query.substring(0,1)=== "~"){
              //look for pointers
              searchPointerIdeas(query, function(e, o){
                if (e){
                  cb(e);
                } else {
                  cb(null, o);
                }
              });
            } else {
              search(query, function(e, o){
                if (e){
                  cb(e);
                } else {
                  cb(null, o);
                }
              });
            }
            
          }
        },
        function(e, results) {

          
          //compress the user
          var ext = compressExtendedUser(results.extendedUser);

          res.render('search', {
            token: res.locals.token,
            title: 'Search results',
            menu: "#menuSearchResults",
            subNav: 'searchResults',
            query: query,
            user: ext.user,
            otherUser: compress({}),
            ideas: compress(results.searchResults),
            profile: ext.profile,
            contacts: ext.contacts,
            username: req.session.username,
            imageUrl: req.session.currentUser.imageUrl,
            fullName: req.session.currentUser.fullName,
            workspaceUrl:  store.workspaceUrl,
            _csrf: req.session._csrf
          });
        });

    },

    trending: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        trending: function(cb){
           Idea.trending(0, function(e, o){
            if (e){
              cb('error' +e);
            } else {
              cb(null, o);
            }
          });
        },
        pointers: function(cb){
          Parse.findPointerTimeline(20, function(e, o){
            if (e){
              cb(e);
            } else {
              var p = _.filter(o, function(item){
                return item;
              });
              cb(null, p);
            }
          });
        }
      },
      function(e, results) {

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);

        //get the ideas
        var ideas = [];
        _.each(results.trending, function(i){
          //since the project was stored as a string, we need to parse it before returning it.
          ideas.push(i);
        });

        res.render('index', {
          token: res.locals.token,
          title: 'Coordel',
          menu: '#menuIdeas',
          subNav: 'trending',
          user: ext.user,
          ideas: compress(ideas),
          profile: ext.profile,
          contacts: ext.contacts,
          pointers: compress(results.pointers),
          username: req.session.username,
          imageUrl: req.session.currentUser.imageUrl,
          fullName: req.session.currentUser.fullName,
          workspaceUrl:  store.workspaceUrl,
          _csrf: req.session._csrf
        });
      });
    },

    contacts: function(req, res){
      var curUser = req.session.currentUser
        , username = req.session.currentUser.username
        , menuName = '#menuMe';

      if (req.params.username){
        username = req.params.username;
      }

      getUser(curUser, username, function(e, user){

        var isMe = (curUser.appId === user.appId);
        if (!isMe){
          menuName = "#menuOther";
        }

        async.parallel({
          extendedUser: function(cb){
            extendUser(req.session.currentUser, function(e, ext){
              cb(null,ext);
            });
          },
          extendedOtherUser: function(cb){
            if (!isMe){
              extendUser(user, function(e, ext){
                cb(null,ext);
              });
            } else {
              cb(null, {});
            }
          }
        },
        function(e, results) {

          //compress the user
          var ext = compressExtendedUser(results.extendedUser);

          res.render('user', {
            token: res.locals.token,
            title: req.session.currentUser.fullName,
            menu: menuName,
            subNav: 'contacts',
            user: ext.user,
            otherUser: compress(results.extendedOtherUser),
            ideas: compress([]),
            profile: ext.profile,
            contacts: ext.contacts,
            username: req.session.username,
            imageUrl: req.session.currentUser.imageUrl,
            fullName: req.session.currentUser.fullName,
            workspaceUrl:  store.workspaceUrl,
            _csrf: req.session._csrf
          });
        });
      });
    },

    blueprints: function(req, res){
      store.couch.db.view('coordel/sharedTemplates', function(e, o){

        var templates = _.map(o, function(item){
          return item.value;
        });

        res.render('blueprints.ejs', {
          token: res.locals.token,
          title: 'Coordel Blueprints',
          menu: "#menuBlueprints",
          blueprints: compress(templates),
          user: compress(req.session.currentUser),
          username: req.session.username,
          imageUrl: req.session.currentUser.imageUrl,
          fullName: req.session.currentUser.fullName,
          workspaceUrl:  store.workspaceUrl,
          _csrf: req.session._csrf
        });
      });
    },

    moneyPledged: function(req, res){
      var curUser = req.session.currentUser
        , username = req.session.currentUser.username
        , menuName = '#menuMe';

      if (req.params.username){
        username = req.params.username;
      }

      getUser(curUser, username, function(e, user){

        var isMe = (curUser.appId === user.appId);
        if (!isMe){
          menuName = "#menuOther";
        }

        async.parallel({
          extendedUser: function(cb){
            extendUser(req.session.currentUser, function(e, ext){
              cb(null,ext);
            });
          },
          extendedOtherUser: function(cb){
            if (!isMe){
              extendUser(user, function(e, ext){
                cb(null,ext);
              });
            } else {
              cb(null, {});
            }
          },
          ideas: function(cb){
            Profile.findSupportAccount(user, function(e, o){
              if (e){
                console.log("error", e);

              } else {
                //console.log('account', o);
                var batch = _.union(o.pledgedIdeas, o.proxiedIdeas, o.recurringAllocatedPledges);
                Idea.findBatch(batch, function(e, o){
                  if (e){
                    cb('error '+e);
                  } else {
                    cb(null, o);
                  }
                });
              }
            });
          }
        },
        function(e, results) {

          _.each(results.ideas, function(item){
            item.pledgeType="money";
          });

          //compress the user
          var ext = compressExtendedUser(results.extendedUser);

          res.render('user', {
            token: res.locals.token,
            title: req.session.currentUser.fullName,
            menu: menuName,
            subNav: 'moneyPledged',
            user: ext.user,
            otherUser: compress(results.extendedOtherUser),
            ideas: compress(results.ideas),
            profile: ext.profile,
            contacts: ext.contacts,
            username: req.session.username,
            imageUrl: req.session.currentUser.imageUrl,
            fullName: req.session.currentUser.fullName,
            workspaceUrl:  store.workspaceUrl,
            _csrf: req.session._csrf
          });
        });
      });
    },

    timePledged: function(req, res){
      var curUser = req.session.currentUser
        , username = req.session.currentUser.username
        , menuName = '#menuMe';

      if (req.params.username){
        username = req.params.username;
      }

      getUser(curUser, username, function(e, user){

        var isMe = (curUser.appId === user.appId);
        if (!isMe){
          menuName = "#menuOther";
        }

        async.parallel({
          extendedUser: function(cb){
            extendUser(req.session.currentUser, function(e, ext){
              cb(null,ext);
            });
          },
          extendedOtherUser: function(cb){
            if (!isMe){
              extendUser(user, function(e, ext){
                cb(null,ext);
              });
            } else {
              cb(null, {});
            }
          },
          ideas: function(cb){
            Profile.findSupportAccount(user, function(e, o){
              if (e){
                //console.log("error", e);

              } else {
                //console.log('account', o);
                var batch = _.union(o.pledgedTimeIdeas, o.recurringAllocatedTimePledges);
                Idea.findBatch(batch, function(e, o){
                  if (e){
                    cb('error '+e);
                  } else {
                    cb(null, o);
                  }
                });
              }
            });
          }
        },
        function(e, results) {

          _.each(results.ideas, function(item){
            item.pledgeType="time";
          });

          //compress the user
          var ext = compressExtendedUser(results.extendedUser);

          res.render('user', {
            token: res.locals.token,
            title: req.session.currentUser.fullName,
            menu: menuName,
            subNav: 'timePledged',
            user: ext.user,
            otherUser: compress(results.extendedOtherUser),
            ideas: compress(results.ideas),
            profile: ext.profile,
            contacts: ext.contacts,
            username: req.session.username,
            imageUrl: req.session.currentUser.imageUrl,
            fullName: req.session.currentUser.fullName,
            workspaceUrl:  store.workspaceUrl,
            _csrf: req.session._csrf
          });
        });
      });
    },

    proxiedToMe: function(req, res){
      var curUser = req.session.currentUser
        , username = req.session.currentUser.username
        , menuName = '#menuMe';

      if (req.params.username){
        username = req.params.username;
      }

      getUser(curUser, username, function(e, user){

        var isMe = (curUser.appId === user.appId);
        if (!isMe){
          menuName = "#menuOther";
        }

        async.parallel({
          extendedUser: function(cb){
            extendUser(user, function(e, ext){
              cb(null,ext);
            });
          },
          extendedOtherUser: function(cb){
            if (!isMe){
              extendUser(user, function(e, ext){
                cb(null,ext);
              });
            } else {
              cb(null, {});
            }
          },
          ideas: function(cb){
            Profile.findSupportAccount(user, function(e, o){
              if (e){
                console.log("error", e);

              } else {
                //console.log('account', o);
                Idea.findBatch(o.proxiedToMeIdeas, function(e, o){
                  if (e){
                    cb('error '+e);
                  } else {
                    cb(null, o);
                  }
                });
              }
            });
          }
        },
        function(e, results) {

          _.each(results.ideas, function(item){
            item.pledgeType="money";
          });

          //compress the user
          var ext = compressExtendedUser(results.extendedUser);

          res.render('user', {
            token: res.locals.token,
            title: req.session.currentUser.fullName,
            menu: menuName,
            subNav: 'proxiedToMe',
            user: ext.user,
            otherUser: compress(results.extendedOtherUser),
            ideas: compress(results.ideas),
            profile: ext.profile,
            contacts: ext.contacts,
            username: req.session.username,
            imageUrl: req.session.currentUser.imageUrl,
            fullName: req.session.currentUser.fullName,
            workspaceUrl:  store.workspaceUrl,
            _csrf: req.session._csrf
          });
        });
      });
    },

    feedback: function(req, res){
      var curUser = req.session.currentUser
        , username = req.session.currentUser.username
        , menuName = '#menuMe';

      if (req.params.username){
        username = req.params.username;
      }

      getUser(curUser, username, function(e, user){

        var isMe = (curUser.appId === user.appId);
        if (!isMe){
          menuName = "#menuOther";
        }

        async.parallel({
          extendedUser: function(cb){
            extendUser(req.session.currentUser, function(e, ext){
              cb(null,ext);
            });
          },
          extendedOtherUser: function(cb){
            if (!isMe){
              extendUser(user, function(e, ext){
                cb(null,ext);
              });
            } else {
              cb(null, {});
            }
          }
        },
        function(e, results) {
          if (e){
            console.log("there were errors");
          } else {
            //compress the user
            var ext = compressExtendedUser(results.extendedUser);

            res.render('user', {
              token: res.locals.token,
              title: req.session.currentUser.fullName,
              menu: menuName,
              subNav: 'feedback',
              user: ext.user,
              otherUser: compress(results.extendedOtherUser),
              ideas: compress([]),
              profile: ext.profile,
              contacts: ext.contacts,
              username: req.session.username,
              imageUrl: req.session.currentUser.imageUrl,
              fullName: req.session.currentUser.fullName,
              workspaceUrl:  store.workspaceUrl,
              _csrf: req.session._csrf
            });
          }
        });
      });
    },

    supporting: function(req, res){

      var curUser = req.session.currentUser
        , username = req.session.currentUser.username
        , menuName = '#menuMe';

      if (req.params.username){
        username = req.params.username;
      }

      getUser(curUser, username, function(e, user){

        var isMe = (curUser.appId === user.appId);
        if (!isMe){
          menuName = "#menuOther";
        }

        async.parallel({
          extendedUser: function(cb){
            extendUser(req.session.currentUser, function(e, ext){
              cb(null,ext);
            });
          },
          extendedOtherUser: function(cb){
            if (!isMe){
              extendUser(user, function(e, ext){
                cb(null,ext);
              });
            } else {
              cb(null, {});
            }
          },
          ideas: function(cb){
            Idea.findUserSupporting(user.appId, function(e, o){
              if (e){
                cb('error '+e);
              } else {
                cb(null, o);
              }
            });

          }
        },
        function(e, results) {

          //console.log("ideas", results.ideas);

          //compress the user
          var ext = compressExtendedUser(results.extendedUser);

          res.render('user', {
            token: res.locals.token,
            title: req.session.currentUser.fullName,
            menu: menuName,
            subNav: 'supporting',
            user: ext.user,
            otherUser: compress(results.extendedOtherUser),
            ideas: compress(results.ideas),
            profile: ext.profile,
            contacts: ext.contacts,
            username: req.session.username,
            imageUrl: req.session.currentUser.imageUrl,
            fullName: req.session.currentUser.fullName,
            workspaceUrl:  store.workspaceUrl,
            _csrf: req.session._csrf
          });
        });
      });
    },

    ideas: function(req, res){
      var curUser = req.session.currentUser
        , username = req.params.username
        , menuName = "#menuMe";


      getUser(curUser, username, function(e, user){
        if (e){
          res.redirect('/');
        } else {

          //console.log("getting user", curUser, username);
          var isMe = (curUser.appId === user.appId);
          if (!isMe){
            menuName = "#menuOther";
          }

          async.parallel({
            extendedUser: function(cb){
              extendUser(req.session.currentUser, function(e, ext){
                cb(null,ext);
              });
            },
            extendedOtherUser: function(cb){
              if (!isMe){
                extendUser(user, function(e, ext){
                  cb(null,ext);
                });
              } else {
                cb(null, {});
              }
            },
            ideas: function(cb){
              store.couch.db.view('coordel/userOpportunities', {startkey: [user.appId], endkey: [user.appId, {}]}, function(e, opps){
                if (e){
                  cb('error '+e);
                } else {
                  cb(null, opps);
                }
              });
            }
          },
          function(e, results) {

            var ideas = _.map(results.ideas, function(item){
              return item.value;
            });

            //compress the user
            var ext = compressExtendedUser(results.extendedUser);


            res.render('user', {
              token: res.locals.token,
              title: req.session.currentUser.fullName,
              menu: menuName,
              subNav: 'ideas',
              user: ext.user,
              otherUser: compress(results.extendedOtherUser),
              ideas: compress(ideas),
              profile: ext.profile,
              contacts: ext.contacts,
              username: req.session.username,
              imageUrl: req.session.currentUser.imageUrl,
              fullName: req.session.currentUser.fullName,
              workspaceUrl:  store.workspaceUrl,
              _csrf: req.session._csrf
            });
          });
        }
      });
    }
  };

  //test if the requested user is the logged on user
  function getUser(user, username, fn){
    //console.log("in getUser", username);
    UserApp.findByUsername(username, function(e, a){
      if (e){
        //console.log("error in getUser", e);
        fn(e);
      } else {
        //console.log("looked for user", a);
        var appId = a.appId;
        if (user.appId === appId){
          fn(null, user);
        } else {
          var app = {
            firstName: a.firstName,
            fullName: a.fullName,
            appId: a.id,
            lastName: a.lastName,
            user: a.user,
            userId: a.userId,
            username: a.username,
            email: a.email,
            imageUrl: 'https://secure.gravatar.com/avatar/' + md5(a.email) + '?d=' + encodeURIComponent('https://work.coordel.com/images/default_contact.png')
          };
          fn(null, app);
        }
      }
    });
  }

  //compresses a json object into a format for trasmission into ejs templates
  function compress(json){
    return escape(JSON.stringify(json));
  }

  //compresses the extended user for transmission into an ejs template
  function compressExtendedUser(extendedUser){
    return {
      user: compress(extendedUser.user),
      contacts: compress(extendedUser.contacts),
      profile: compress(extendedUser.profile)
    };
  }

  //user is the user object (either req.session.currentUser or a loaded user)
  function extendUser(user, fn){

    async.parallel({
      profile: function(cb){
        Profile.findMiniProfile(user, function(e, o){
          if (e){

            cb('error' + e);
          } else {
            //console.log("mini profile", o);
            cb(null, o);
          }
        });
      },
      userApp: function(cb){
        UserApp.findById(user.appId, function(e, o){
          if (e){
            cb('error' + e);
          } else {
            cb(null, o);
          }
        });
      },
      supportAccount: function(cb){
        Profile.findSupportAccount(user, function(e, o){
          if (e){
            console.log("error", e);
            cb('error' + e);
          } else {
            cb(null, o);
          }
        });
      },
      contacts: function(cb){
        UserApp.findContacts(user, function(e, o){
          if (e){
            cb('error'+e );
          } else {
            cb(null, o);
          }
        });
      },
      feedback: function(cb){
        Profile.findFeedbackComments(user.appId, function(e, o){
          if(e){
            cb('error'+e);
          } else {
            cb(null, o);
          }
        });
      },
      proxies: function(cb){
        Profile.findProxies(user.appId, function(e, o){
          if(e){
            cb('error'+e);
          } else {
            cb(null, o);
          }
        });
      }
    },
    function(e, results) {

      var ext = {};
      //update the user
      user.imageUrl = 'https://secure.gravatar.com/avatar/' + md5(user.email) + '?d=' + encodeURIComponent('https://work.coordel.com/images/default_contact.png');
      user.app = results.userApp;
      user.account = results.supportAccount;
      user.feedback = results.feedback;
      user.proxies = results.proxies;

    

      //put the user into the extension
      ext.user = user;

      var contacts = [];
      _.each(results.contacts, function(c){
        contacts.push(c);
      });

      //add the contacts to the extension
      ext.contacts = contacts;

      //console.log("profile", results.profile);

      //add the profile to the extension
      ext.profile = results.profile;

      //return the extendedUser
      fn(null, ext);
    });
  }

  return App;
};

module.exports = AppController;