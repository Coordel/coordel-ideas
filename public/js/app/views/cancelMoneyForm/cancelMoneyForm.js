define(["dojo/dom", "dojo/on", "dojo/dom-class", "dojo/topic", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, topic, stores){

  var cancelMoneyFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    init: function(user, currency){
      var self = this;
      self.user = user;
      //self.bitcoinPrices = prices;
      self.currency = currency;

      /*
      if (user.localCurrency){
        self.localCurrency = user.localCurrency;
      }
      */

      on(dom.byId("cancelMoneySubmit"), "click", function(e){
        self.submit();
      });
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
      self.pledge = pledge;
      //set the amounts
      dom.byId("cancelMoneyPledgeType").innerHTML = pledge.type.toLowerCase();
      self.setLocalAmount(pledge.amount);
      self.setBtcAmount(pledge.amount);
    },

    setLocalAmount: function(btcAmount){
      /*
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      dom.byId("cancelMoneyLocalAmount").innerHTML = newValue;
      if (self.bitcoinPrices[self.localCurrency].symbol){
        dom.byId("cancelMoneyLocalSymbol").innerHTML = self.bitcoinPrices[self.localCurrency].symbol;
      }
      */
      dom.byId("cancelMoneyLocalAmount").innerHTML = this.currency.toLocal(btcAmount);
      dom.byId("cancelMoneyLocalSymbol").innerHTML = this.currency.getSymbol();
    },

    setBtcAmount: function(btcAmount){
      //var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("cancelMoneyBtcAmount").innerHTML = this.currency.formatBtc(btcAmount);
    },

    submit: function(){
      //there can be two types of pledges RECURRING and ONE-TIME. default ONE-TIME
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;

      var pledge =  self.pledge;

      pledge.status = "CANCELLED";
      pledge.cancelled = timestamp;
      pledge.cancelledBy = self.user.appId;

      console.log("pledge", pledge);

      var db = stores.moneyStore();
      
      db.put(pledge).then(function(res){
        $('#cancelMoneyPledgeModal').modal('hide');
        topic.publish("coordel/ideaAction", "cancelMoney", pledge.project);
      });

    }
  };

  return cancelMoneyFormControl;

});