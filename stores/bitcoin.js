var request = require('request')
  , moment = require('moment')
  , log = console.log
  , _ = require('underscore')
  , fs = require('fs');

var prices = {};
var lastLoaded = false;

var currencyNames = {
  JPY: 'Japanese Yen',
  USD: 'United States Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  RUB: 'Russian Ruble',
  THB: 'Thai Baht',
  CNY: 'Chinese Yuan Renminbi',
  SLL: 'Sierra Leone Leone',
  DKK: 'Danish Krone',
  BRL: 'Brazilian Real',
  GBP: 'British Pound',
  NZD: 'New Zealand Dollar',
  PLN: 'Polish Zloty',
  CAD: 'Canadian Dollar',
  SEK: 'Swedish Krona',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  EUR: 'Euro'
};

var currencySymbols = {
  JPY: '¥',
  USD: '$',
  AUD: '$',
  THB: '฿',
  BTC: '฿',
  CNY: '¥',
  BRL: 'R$',
  GBP: '£',
  NZD: '$',
  CAD: '$',
  SGD: 'S$',
  HKD: '$',
  EUR: '€'
};

var bitcoin = {
  prices: function(fn){
    fs.readFile(__dirname+'/cache/prices.json', 'utf8', function(e, data){
      data = JSON.parse(data);
      fn(data);
    });
    if (!lastLoaded || moment(lastLoaded).add('m', 15) <= moment()){
      log('need to refresh prices');
      bitcoin.refreshPrices();
    }
  },
  refreshPrices: function(){
    request('http://bitcoincharts.com/t/weighted_prices.json', function(e,r,o){
      if (!e){
        try {
          o = JSON.parse(o);
          _.each(currencyNames, function(name, key){
            if (o[key]){
              o[key].displayName = name;
            }
          });

          _.each(currencySymbols, function(s, key){
            if (o[key]){
              o[key].symbol = s;
            }
          });
      
          prices = o;
          lastLoaded = moment();
          fs.writeFile(__dirname+'/cache/prices.json', JSON.stringify(o), 'utf8', function(e){
            if (!e) {
              console.log('cached prices file');
            }
          });
        } catch (err){
          console.log("error refreshing prices", err);
        }
      }
    });
  },
  currencies: function(){
    return currencyNames;
  }
};

exports.Store = bitcoin;