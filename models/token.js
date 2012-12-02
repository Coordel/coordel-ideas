var redis = require('../stores/redis').Store;

var T = {};
  T.randomToken = function(){
    return Math.round((new Date().valueOf() * Math.random())) + '';
  };

module.exports = T;

T.generate = function(username){
  var token = {
    username: username.toLowerCase(),
    token: T.randomToken(),
    series: T.randomToken()
  };
  T.save(token, function(){});
  return token;
};

T.refresh = function(token){

  return {
    username: token.username.toLowerCase(),
    token: T.randomToken(),
    series: token.series
  };
};

T.remove = function(username, fn){
  var key = 'logintoken:' + username.toLowerCase()
    , multi = redis.multi();

  multi.hdel(key, 'username');
  multi.hdel(key, 'token');
  multi.hdel(key, 'series');
  multi.exec(function(e, o){
    if (e) fn(e, false);
    fn(null, true);
  });

};

T.save = function(token, fn){
 
  var multi = redis.multi()
    , key = 'token:' + token.username.toLowerCase();

  multi.hset(key, 'username', token.username.toLowerCase());
  multi.hset(key, 'token', token.token);
  multi.hset(key, 'series', token.series);
  multi.exec(function(e, o){
    if (e) fn(e, false);
    fn(null, true);
  });
  
};

T.find = function(username, fn){
  var key = 'token:' + username.toLowerCase();

  redis.hgetall(key, function(e, o){
    if (e){
      return fn('not_found');
    } else {
      return fn(null, o);
    }
  });
};