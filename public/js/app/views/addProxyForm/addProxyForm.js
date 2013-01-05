define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/_base/array"
    , "dojo/topic"
    , "app/models/pledges"
    , "app/views/contactPicker/contactPicker"
    , "dojo/domReady!"],function(dom, on, domClass, array, topic, stores, contactPicker){

  var addProxyFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    init: function(user, prices, contacts){
      var self = this;

      self.user = user;
      self.bitcoinPrices = prices;
      self.contacts = contacts;

      if (user.app.localCurrency){
        self.localCurrency = user.app.localCurrency;
      }

      if (user.app.coinbaseAccessToken){
        //this user has authorized their account with coinbase
        self.showProxy();
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

      on(dom.byId("proxySubmit"), "click", function(){
        self.submit();
      });

      $('#addProxyModal').on('hidden', function () {
        //clear all the fields
        self.resetAll();
      });
    },

    resetAll: function(){
      var self = this;
      self.picker.value = "";
      self.picker.inputControl.value = "";
    },


    showAuthorize: function(){
      domClass.remove(dom.byId("proxyAuthorize"), "hide");
      domClass.add(dom.byId("proxyAction"), "hide");
      domClass.add(dom.byId("proxySubmit"), "hide");
    },

    showProxy: function(){
      var self = this;
      domClass.add(dom.byId("proxyAuthorize"), "hide");
      domClass.remove(dom.byId("proxyAction"), "hide");
      domClass.remove(dom.byId("proxySubmit"), "hide");

      var list = array.filter(self.contacts, function(item){
        return item.appId !== self.user.appId;
      });
      
      self.picker = new contactPicker({contacts: list, placeholder: "Select proxy"}).placeAt("proxySelectContainer");
    },

    showPledge: function(pledge){
      var self = this;

      self.pledge = pledge;

      //set the amounts
      dom.byId("proxyPledgeType").innerHTML = pledge.type.toLowerCase();
      self.setLocalAmount(pledge.amount);
      self.setBtcAmount(pledge.amount);
      self.setOwnershipPoints(pledge.amount);

      if (pledge.type === "RECURRING"){
        domClass.add(dom.byId("proxyOnceInstructions"), "hide");
        domClass.remove(dom.byId("proxyRecurringInstructions"), "hide");
      }
    },

    showError: function(){
      domClass.add(dom.byId("proxyAuthorize"), "hide");
      domClass.add(dom.byId("proxyAction"), "hide");
      domClass.add(dom.byId("proxySubmit"), "hide");
      domClass.remove(dom.byId("proxyError"), "hide");
    },

    setOwnershipPoints: function(btcAmount){
      var self = this;
      var newValue = btcAmount / 0.075;

      newValue = accounting.formatNumber(newValue, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("proxyOwnershipPoints").innerHTML = newValue;
    },

    setLocalAmount: function(btcAmount){
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      dom.byId("proxyLocalAmount").innerHTML = newValue;
      if (self.bitcoinPrices[self.localCurrency].symbol){
        dom.byId("proxyLocalSymbol").innerHTML = self.bitcoinPrices[self.localCurrency].symbol;
      }
    },

    setBtcAmount: function(btcAmount){
      var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("proxyBtcAmount").innerHTML = newValue;
    },

    submit: function(){
      //change the status to PROXIED
      //add the chosen user as the proxy
      //set the date proxied

      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;
    

      var pledge =  self.pledge;

      pledge.status = "PROXIED";
      pledge.proxy = self.picker.value;
      pledge.proxied = timestamp;

      var db = stores.moneyStore();
      
      db.put(pledge).then(function(res){
        $('#addProxyModal').modal('hide');
        topic.publish("coordel/ideaAction", "addProxy", pledge.project);
      });
    }

  };

  return addProxyFormControl;

});