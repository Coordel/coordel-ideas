define(["dojo/dom", "dojo/on", "dojo/dom-class", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, stores){

  var cancelMoneyFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    init: function(user, prices){
      var self = this;
      self.user = user;
      self.bitcoinPrices = prices;

      if (user.app.localCurrency){
        self.localCurrency = user.app.localCurrency;
      }
    },

    showError: function(){
      console.log("showing error");
      domClass.add(dom.byId("cancelMoneyAction"), "hide");
      domClass.add(dom.byId("cancelMoneySubmit"), "hide");
      domClass.remove(dom.byId("cancelMoneyError"), "hide");
    },

    showPledge: function(pledge){
      var self = this;
      console.log("showing pledge", pledge);
      //set the amounts
      dom.byId("cancelMoneyPledgeType").innerHTML = pledge.type.toLowerCase();
      self.setLocalAmount(pledge.amount);
      self.setBtcAmount(pledge.amount);
    },

    setLocalAmount: function(btcAmount){
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      dom.byId("cancelMoneyLocalAmount").innerHTML = newValue;
      if (self.bitcoinPrices[self.localCurrency].symbol){
        dom.byId("cancelMoneyLocalSymbol").innerHTML = self.bitcoinPrices[self.localCurrency].symbol;
      }
    },

    setBtcAmount: function(btcAmount){
      var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("cancelMoneyBtcAmount").innerHTML = newValue;
    },

    submit: function(){
     
    }
  };

  return cancelMoneyFormControl;

});