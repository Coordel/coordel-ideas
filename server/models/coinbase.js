/* Coinbase api
  A pledge tracks what someone who pleges money gives
*/
var _ = require('underscore')
  , async = require('async')
  , request = require('request')
  , apiVersion = '/api/v1'
  , baseUrl = 'https://coinbase.com'
  , apiUrl = baseUrl + apiVersion
  , _ = require('underscore')
  , moment = require('moment')
  , TokenProvider = require('refresh-token');


module.exports = function(store) {

  function getToken(user, fn) {
    
    if(user.coinbaseAccessToken && user.coinbaseTokenExpires > moment().format(store.timeFormat)){
      return fn(null, user.coinbaseAccessToken);
    }

    request.post({
      url: 'https://coinbase.com/oauth/token',
      form: {
        refresh_token: user.coinbaseRefreshToken,
        client_id:     store.coinbase.clientId,
        client_secret: store.coinbase.clientSecret,
        grant_type:    'refresh_token'
      }
    }, function (err, response, body) {


      console.log("result from post to oauth/token", err, body);
      if(err) return fn(err);

      var token = JSON.parse(body)
        , expires = moment().add('s', 7200).format(store.timeFormat)
        , UserApp = require('./userApp')(store);


      if (token.access_token){
        console.log("TOKEN REFRESHED", token);
        //need to update the user with the new stuff
        var keys = [
          {
            name: "coinbaseAccessToken", value: token.access_token
          },
          {
            name: "coinbaseRefreshToken", value: token.refresh_token
          },
          {
            name: "coinbaseTokenExpires", value: expires
          }
        ];

        UserApp.set(user.id, keys, function(err, app) {
          console.log("updated app with coinbase keys", app);
          return fn(null, token.access_token);
        });
      } else {
        console.log("ERROR REFRESHING ACCESS TOKEN", token.error);
        return fn(token.error, false);
      }
    });
  }

  function post(user, resource, data, fn){
    //console.log("data", data, data.transaction);
    getToken(user, function(e, token){
      if (e){
        /*
        if (e === "invalid_request"){
          console.log("error posting", e);
          //if this request is invalid, we should retry the post
          post(user, resource, data, fn);
        } else {
          */
          console.log("Post failure, no token");
          fn('No token');
       // }
        
      } else {
        var postUrl = apiUrl + resource + '?access_token='+token;
        request.post({url: postUrl, json: data}, function(e, r, body){
          if (e) {
            console.log("Error Posting URL", getUrl, e);
            return fn('Unexpected error posting url');
          } else {
            fn(null, body);
          }
        });
      }
    });
  }


  function get(user, resource, fn){
    getToken(user, function(e, token){
      if (e){
        /*
        if (e === "invalid_request"){
          //if this request is invalid, we should retry
          console.log("get error", e);
          get(user, resource, fn);
        } else {
          */
          console.log("Get failure, no token");
          fn('No token');
        //}
      } else {
        var getUrl = apiUrl + resource + '?access_token='+token;
        request.get(getUrl, function(e, r, body){
          if (e) {
            console.log("ERROR GETTING URL", getUrl, e);
            return fn('Unexptected error getting url');
          } else {
            fn(null, body);
          }
        });
      }
    });
  }


  var account = {
    getBalance: function(user, fn){
      get(user, '/account/balance', function(e, res){
        if (e){
          console.log('error getting balance', e);
          fn(e);
        } else {
          res = JSON.parse(res);
          if (res.amount){
            fn(null, res.amount);
          } else {
            console.log("GET BALANCE FAILED", res);
            fn('failed to get balance');
          }
        }
      });
    },
    getReceiveAddress: function(user, fn){
      get(user, '/account/receive_address', function(e, res){
        if (e){
          console.log('error receive address', e);
          fn(e);
        } else {
          res = JSON.parse(res);
          if (res.success){
            fn(null, res.address);
          } else {
            console.log("GET RECEIVE ADDRESS FAILED", res);
            fn('failed to get address');
          }
        }
      });
    }
  };

  var transactions = {
    getReport: function(user, fn){

    },
    sendMoney: function(user, data, fn){
      ///console.log("transaction", data);
      
      post(user, '/transactions/send_money', data, function(e, res){
        if (e){
          console.log('error send money', e);
          fn(e);
        } else {
          if (res.success){
            fn(null, res);
          } else {
            if (res.errors.length){
              var isFee = false;
              _.each(res.errors, function(item){
                if (item.indexOf('transaction requires a 0.0005 fee')>-1){
                  isFee = true;
                }
              });
              if(isFee){
                data.transaction.fee = '.0005';
                post(user, '/transactions/send_money', data, function(e, res){
                  if (e){
                    console.log('error adding transaction');
                    fn(e);
                    fn(null, res);
                  }
                });
              } else {
                fn(null, res);
              }
            }
          }
        }
      });
    }
  };

  var coordel = {
    sendMoney: function(data, fn){
      var postUrl = apiUrl + '/transactions/send_money?api_key='+store.coinbase.salesAccount;
      request.post({url: postUrl, json: data}, function(e, r, body){
        if (e) {
          console.log("Error Posting URL", getUrl, e);
          return fn('Unexpected error posting url');
        } else {
          fn(null, body);
        }
      });
    }
  };

  var users = {
    add: function(){

    }
  };

  Coinbase = {
    account: account,
    transactions: transactions,
    users: users,
    coordel: coordel
  };

  return Coinbase;

};