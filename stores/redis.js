var settings = require('../config/settings').settings("settings", "./config")
  , redisOpts = settings.config.redisOptions
  , redis = require('redis').createClient(redisOpts.port, redisOpts.host);

redis.auth(redisOpts.auth);

exports.Store = redis;