var bcrypt = require('bcrypt')
  , couch = require('../stores/couchdb').Store
  , redis = require('../stores/redis').Store
  , _ = require('underscore')
  , async = require('async');

var AM = {};


module.exports = AM;

// logging in //

AM.autoLogin = function(user, pass, callback)
{
  /*
  AM.accounts.findOne({user:user}, function(e, o) {
    if (o){
      o.pass == pass ? callback(o) : callback(null);
    } else{
      callback(null);
    }
  });
*/
};

AM.manualLogin = function(id, password, callback)
{
   _getUser({authGroup: 'coordel-users', id: id}, function(e, o){
    console.log("user", e, o);
    if (o === null){
      callback('user-not-found');
    } else{
      console.log(e, o);
      if (!o.isEncrypted){
        if (password === o.password){
          //we're okay, just need to encrypt the password, add the isEncrypted flag set to true, and resave the user
          //this exists because passwords were not hashed before

          callback(null, o);
        } else {
          //password doesn't match so need to just callback that it's invalid until the user does a successful login
          callback('invalid-password');
        }
      } else {
        bcrypt.compare(password, o.password, function(err, res) {
          if (res){
            callback(null, o);
          } else{
            callback('invalid-password');
          }
        });
      }
    }
  });
  /*
  AM.accounts.findOne({user:user}, function(e, o) {
    if (o == null){
      callback('user-not-found');
    } else{
      bcrypt.compare(pass, o.pass, function(err, res) {
        if (res){
          callback(null, o);
        } else{
          callback('invalid-password');
        }
      });
    }
  });
*/
};

AM.get = function(username, fn){
  _getUser({authGroup: 'coordel-users', id: username}, function(e, o){
    if (o === null){
      fn('user-not-found');
    } else {
      fn(null, o);
    }
  });
};

AM.getCounts = function(appId, fn){
  //console.log("appId", appId);
  
  var feedback = {
    key: appId,
    group: true,
    group_level: "1",
    reduce: true
  };

  var opps = {
    startkey: [appId],
    endkey: [appId, {}]
  };

  var list = {
    feedback: function(callback){
      couch.view('coordel/userFeedbackAvg', feedback, function (e, f) {
        if (e){
          callback(e);
        } else {
          callback(null, f);
        }
      });
    },
    ideas: function(callback){
      couch.view('coordel/userOpportunities', opps, function(e, opps){
        if (e){
          callback(e);
        } else {
          callback(null, opps);
        }
      });
    },
    contacts: function(callback){
      AM.getPeople(appId, function(e, people){
        if (e){
          callback(e);
        } else {
          callback(null, people);
        }
      });
    }
  };

  var counts = {
    ideas: 0,
    supporting: 0,
    contacts: 0,
    feeback: 0
  };

  async.parallel(list, function(e, results){
    if (e){
      return fn(e);
    }
    counts.ideas = results.ideas.length;
    counts.contacts = results.contacts.length;

    var lists = {
      ideas: results.ideas,
      contacts: results.contacts
    };

    var toReturn = {
      counts: counts,
      lists: lists
    };

    return fn(null, toReturn);
  });

};

AM.getPeople = function(appId, fn){
  //console.log("getPeople", appId);
  getUserApps(appId, 'people', function(err, people){
    if (err) return fn(err, false);
    return fn(null, people);
  });
};

function getPeople(key, fn){
  console.log("GET PEOPLE", key);
  var arr = redis.smembers(key, function(err, keyArr){
    console.log("after getKeyArray", err, keyArr);
    if (err) return fn(err, false);
    return fn(null, keyArr);
  });
}


function getUserApps(appId, field, fn){
  var multi = redis.multi();

  var key = 'coordelapp:'+appId+':' + field;
  console.log("get people key", key);
  getPeople(key, function(err, appIds){
    if (!appIds) appIds = [];
    appIds.forEach(function(id){
      var akey = 'coordelapp:' + id;
      console.log("GET USER APP FOR KEY", akey);
      multi.hgetall(akey);
    });

    multi.exec(function(err, apps){
      if (err) return fn(err, false);
      
      //need to make sure that there aren't any nulls
      apps = _.filter(apps, function(a){
        return a;
      });
      console.log("contact apps", apps);
      return fn(null, apps);
    });
  });
}

function _getUser(args, fn){
  console.log("args", args.id, args.authGroup);
  //args will have authGroup and id
  //this function loads the user from the correct group [coordel, facebook, twitter, etc]
  redis.sismember([args.authGroup, 'user:' + args.id], function(err, reply) {
    //console.log("after testing  sismember", err, reply);
    if (err){
      //no user
      //console.log("error getting user from store", err);
      fn(err, false);
    } else if (!reply){
      //console.log("user didn't exist");
      fn("Login not found", false);
    } else if (reply) {
      //console.log("user existed, loading");
      var key = 'user:' + args.id;
      //console.log("USER GET KEY", key);
      redis.hgetall(key, function(err, user){
        //console.log("USER", user);
        if (err){
          //console.log("couldn't load existing user from store",err);
          fn(err, false);
        } else {
          //console.log("found the user", user);
          fn(false, user);
        }
      });
    }
  });
}

// record insertion, update & deletion methods //

AM.signup = function(newData, callback)
//need to try and look if the user has an old sign up and if so, create the new entries before testing
{
  AM.accounts.findOne({user:newData.user}, function(e, o) {
    if (o){
      callback('username-taken');
    } else{
      AM.accounts.findOne({email:newData.email}, function(e, o) {
        if (o){
          callback('email-taken');
        } else{
          AM.saltAndHash(newData.pass, function(hash){

            //need to increment userId and appId (we do this in case we decide that one day a user wants to have more than one app)

            //create the user set at userid:[userId]
            //id, appId, email, username, firstName, lastName, password, invited

            //create add entries to lookup sets for the user at email:[email]:userid [userId] and username:[username]:userid [userId]

            //create the profile entry or the user in couchdb



            newData.pass = hash;
          // append date stamp when record was created //
            newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
            AM.accounts.insert(newData, callback(null));
          });
        }
      });
    }
  });
};

AM.update = function(newData, callback)
{
  AM.accounts.findOne({user:newData.user}, function(e, o){
    o.name    = newData.name;
    o.email  = newData.email;
    o.country  = newData.country;
    if (newData.pass === ''){
      AM.accounts.save(o); callback(o);
    } else{
      AM.saltAndHash(newData.pass, function(hash){
        o.pass = hash;
        AM.accounts.save(o); callback(o);
      });
    }
  });
}

AM.setPassword = function(email, newPass, callback)
{
  AM.accounts.findOne({email:email}, function(e, o){
    AM.saltAndHash(newPass, function(hash){
      o.pass = hash;
      AM.accounts.save(o); callback(o);
    });
  });
}

AM.validateLink = function(email, passHash, callback)
{
  AM.accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
    callback(o ? 'ok' : null);
  });
}

AM.saltAndHash = function(pass, callback)
{
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(pass, salt, function(err, hash) {
      callback(hash);
    });
  });
}

AM.delete = function(id, callback)
{
  AM.accounts.remove({_id: this.getObjectId(id)}, callback);
}

// auxiliary methods //

AM.getEmail = function(email, callback)
{
  AM.accounts.findOne({email:email}, function(e, o){ callback(o); });
}

AM.getObjectId = function(id)
{
  return AM.accounts.db.bson_serializer.ObjectID.createFromHexString(id)
}

AM.getAllRecords = function(callback)
{
  AM.accounts.find().toArray(
    function(e, res) {
    if (e) callback(e)
    else callback(null, res)
  });
};

AM.delAllRecords = function(id, callback)
{
  AM.accounts.remove(); // reset accounts collection for testing //
}

// just for testing - these are not actually being used //

AM.findById = function(id, callback)
{
  AM.accounts.findOne({_id: this.getObjectId(id)},
    function(e, res) {
    if (e) callback(e)
    else callback(null, res)
  });
};


AM.findByMultipleFields = function(a, callback)
{
// this takes an array of name/val pairs to search against {fieldName : 'value'} //
  AM.accounts.find( { $or : a } ).toArray(
    function(e, results) {
    if (e) callback(e)
    else callback(null, results)
  });
}