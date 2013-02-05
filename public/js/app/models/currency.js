//this is the model for our ideas
define(function(){
  var currency = {

    localCurrency: "USD",

    bitcoinPrices: null,

    init: function(prices, localCurrency){
      //console.log("init currency", prices, localCurrency);
      this.bitcoinPrices = prices;
      if (localCurrency){
        this.localCurrency = localCurrency;
      }
    },

    //returns btcAmount input as localCurrency
    toLocal: function(btcAmount){

      var self = this;
      //console.log("btcAmount to convert", btcAmount, self.bitcoinPrices);
      var d = self.bitcoinPrices[self.localCurrency]["24h"]
        , w = self.bitcoinPrices[self.localCurrency]["7d"]
        , m = self.bitcoinPrices[self.localCurrency]["30d"];

      //console.log("btcAmount to convert", btcAmount, self.bitcoinPrices);
      //console.log("d", d, "w", w, "m", m);
      //the api returns day, week, month as available.
      var localValue;

      if (d){
        localValue = d;
      } else if (w){
        localValue = w;
      } else if (m){
        localValue = m;
      }

      var newValue = btcAmount * localValue;
      newValue = self.formatLocal(newValue);
      return newValue;
    },

    getSymbol: function(){
      var newValue = "";
      if (this.bitcoinPrices[this.localCurrency].symbol){
        newValue = this.bitcoinPrices[this.localCurrency].symbol + newValue;
      }
      return newValue;
    },

    getOwnership: function(btcAmount){
      //returns the ownership points based on the BTC amount
      var newValue = btcAmount / 0.075;
      newValue = accounting.formatNumber(newValue, [precision = 4], [thousand = ","], [decimal = "."]);
      return newValue;
    },

    toBtc: function(localAmount){
      var self = this;

      var d = self.bitcoinPrices[self.localCurrency]["24h"]
        , w = self.bitcoinPrices[self.localCurrency]["7d"]
        , m = self.bitcoinPrices[self.localCurrency]["30d"];

      //the api returns day, week, month as available.
      var localValue;

      if (d){
        localValue = d;
      } else if (w){
        localValue = w;
      } else if (m){
        localValue = m;
      }
      var newValue = localAmount * (1/localValue);
      newValue = self.formatBtc(newValue);
      return newValue;
    },

    formatBtc: function(btcAmount){
      return accounting.formatNumber(btcAmount, [precision = 8], [thousand = ","], [decimal = "."]);
    },

    formatLocal: function(localAmount){
      return accounting.formatNumber(localAmount, [precision = 2], [thousand = ","], [decimal = "."]);
    }

  };

  return currency;
});