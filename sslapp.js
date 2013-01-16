// dependencies
var express = require('express')
  , https = require('https')
  , fs = require('fs')
  , passport = require('passport');

var privateKey = fs.readFileSync('./ssl/private-key.pem').toString();
var certificate = fs.readFileSync('./ssl/public-cert.pem').toString();

var appOptions = {
  key : privateKey
, cert : certificate
};

var app = express();

//configure express
require('./configure')(app, express, passport);

// start server
var server = https.createServer(appOptions, app);
var io = require('socket.io', {secure: true}).listen(server);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
