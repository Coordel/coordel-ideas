define(["dojo/dom", "dojo/on", "dojo/dom-class", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, stores){

  var allocateFormControl = {

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

      if (user.app.coinbaseAccessToken){
        //this user has authorized their account with coinbase
        self.showAllocate();
      } else {
        //get authorized
        self.showAuthorize();
      }

      
      function coinbaseAuthorize(){
        window.open('/connect/coinbase', 'mywin','left=20,top=20,width=500,height=500,location=1,resizable=1');
        return false;
      }

      on(dom.byId("coinbaseAuthorize"), "click", function(){
        coinbaseAuthorize();
      });

     
    },

    showAuthorize: function(){
      domClass.remove(dom.byId("allocateAuthorize"), "hide");
      domClass.add(dom.byId("allocateAction"), "hide");
      domClass.add(dom.byId("allocateSubmit"), "hide");
    },

    showAllocate: function(){
      domClass.add(dom.byId("allocateAuthorize"), "hide");
      domClass.remove(dom.byId("allocateAction"), "hide");
      domClass.remove(dom.byId("allocateSubmit"), "hide");
    },

    showPledge: function(pledge){
      var self = this;

      //set the amounts
      dom.byId("allocatePledgeType").innerHTML = pledge.type.toLowerCase();
      self.setLocalAmount(pledge.amount);
      self.setBtcAmount(pledge.amount);
      self.setOwnershipPoints(pledge.amount);

      if (pledge.type === "RECURRING"){
        domClass.add(dom.byId("allocateOnceInstructions"), "hide");
        domClass.remove(dom.byId("allocateRecurringInstructions"), "hide");
      }
    },

    showError: function(){
      domClass.add(dom.byId("allocateAuthorize"), "hide");
      domClass.add(dom.byId("allocateAction"), "hide");
      domClass.add(dom.byId("allocateSubmit"), "hide");
      domClass.remove(dom.byId("allocateError"), "hide");
    },

    setLocalAmount: function(btcAmount){
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      dom.byId("allocateLocalAmount").innerHTML = newValue;
      if (self.bitcoinPrices[self.localCurrency].symbol){
        dom.byId("allocateLocalSymbol").innerHTML = self.bitcoinPrices[self.localCurrency].symbol;
      }
    },

    setOwnershipPoints: function(btcAmount){
      var self = this;
      var newValue = btcAmount / 0.075;

      newValue = accounting.formatNumber(newValue, [precision = 4], [thousand = ","], [decimal = "."]);
      console.log("btcAmount", btcAmount, "newValue", newValue);
      dom.byId("allocateOwnershipPoints").innerHTML = newValue;
    },

    setBtcAmount: function(btcAmount){
      var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("allocateBtcAmount").innerHTML = newValue;
    },

   
    submit: function(){
     
    }
  };

  return allocateFormControl;

});