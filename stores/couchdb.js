var settings = require('../config/settings').settings("settings", "./config")
  , couchOpts = settings.config.couchOptions
  , couchName = settings.config.couchName;

var cradle = require('cradle').setup(couchOpts);
var cn  = new cradle.Connection();
var db = cn.database(couchName);

var couch = {
  db: db,
  cn: cn
};

exports.Store = couch;