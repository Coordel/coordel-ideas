var settings = require('../config/settings').settings("settings", "./config")
  , couchOpts = settings.config.couchOptions
  , couchName = settings.config.couchName;

var cradle = require('cradle').setup(couchOpts);
var cn  = new cradle.Connection();
var db = cn.database(couchName);

function newUUID(cacheNum){
  if (cacheNum === undefined) {
      cacheNum = 10;
    }
    if (uuidCache.length < 2) {
      cn.uuids(cacheNum, function(e,uuids){
        if (e){
          console.log("UUID load failed ", e);
        } else {
          uuidCache = uuids;
        }
      });
    }
    return uuidCache.shift();
}

var uuidCache = [];

var couch = {
  db: db,
  cn: cn,
  uuid: function(){
    return newUUID();
  }
};

newUUID();

exports.Store = couch;