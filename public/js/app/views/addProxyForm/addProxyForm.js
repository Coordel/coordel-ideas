define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/_base/array"
    , "dojo/topic"
    , "dijit/registry"
    , "app/models/pledges"
    , "app/views/contactPicker/contactPicker"
    , "dojo/domReady!"],function(dom, on, domClass, array, topic, registry, stores, contactPicker){

  var addProxyFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    init: function(user, currency, contacts){
      var self = this;

      //console.log("initing addProxyForm");

      self.user = user;
      //self.bitcoinPrices = prices;
      self.currency = currency;
      self.contacts = contacts;

      /*
      if (user.localCurrency){
        self.localCurrency = user.localCurrency;
      }
      */
   
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

      on(dom.byId("addProxyCoinbaseAuthorize"), "click", function(){
        coinbaseAuthorize();
      });

      on(dom.byId("addProxySubmit"), "click", function(){
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
      //console.log("show authorize");
      domClass.remove(dom.byId("addProxyAuthorize"), "hide");
      domClass.add(dom.byId("addProxyAction"), "hide");
      domClass.add(dom.byId("addProxySubmit"), "hide");
    },

    showProxy: function(){
      //console.log("show proxy");
      var self = this;
      domClass.add(dom.byId("addProxyAuthorize"), "hide");
      domClass.remove(dom.byId("addProxyAction"), "hide");
      domClass.remove(dom.byId("addProxySubmit"), "hide");

      //console.log("contacts", self.contacts);

      array.forEach(registry.findWidgets(dom.byId("addProxySelectContainer")), function(item){
        item.destroy();
        //console.log("destroyed");
      });

      var list = array.filter(self.contacts, function(item){
        return item.appId !== self.user.appId;
      });


      
      self.picker = new contactPicker({contacts: list, placeholder: "Select proxy"}).placeAt("addProxySelectContainer");
    },

    showPledge: function(pledge){
      var self = this;

      self.pledge = pledge;

      self.showFee(pledge);

      //it's possible that the user authenticated after this init was called on load...make sure
      if (self.user.app.coinbaseAccessToken){
        //this user has authorized their account with coinbase
        self.showProxy();
      }

      //set the amounts
      dom.byId("addProxyPledgeType").innerHTML = pledge.type.toLowerCase();
      self.setLocalAmount(pledge.amount);
      self.setBtcAmount(pledge.amount);
      self.setOwnershipPoints(pledge.amount);

      if (pledge.type === "RECURRING"){
        domClass.add(dom.byId("addProxyOnceInstructions"), "hide");
        domClass.remove(dom.byId("addProxyRecurringInstructions"), "hide");
      }
    },

    showFee: function(pledge){
      if (pledge.amount < 0.01){
        var symbol = this.currency.getSymbol();

        domClass.remove(dom.byId("addProxyFeeContainer"), "hide");
        dom.byId("addProxyFeeWarning").innerHTML = symbol + this.currency.toLocal(0.01);
        dom.byId("addProxyFeeAmount").innerHTML = symbol + this.currency.toLocal(0.0005);
      }
    },

    showError: function(){
      domClass.add(dom.byId("addProxyAuthorize"), "hide");
      domClass.add(dom.byId("addProxyAction"), "hide");
      domClass.add(dom.byId("addProxySubmit"), "hide");
      domClass.remove(dom.byId("addProxyError"), "hide");
    },

    setOwnershipPoints: function(btcAmount){
      /*
      var self = this;
      var newValue = btcAmount / 0.075;

      newValue = accounting.formatNumber(newValue, [precision = 4], [thousand = ","], [decimal = "."]);
      */
      dom.byId("addProxyOwnershipPoints").innerHTML = this.currency.getOwnership(btcAmount);
    },

    setLocalAmount: function(btcAmount){
      /*
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      */
      dom.byId("addProxyLocalAmount").innerHTML = this.currency.toLocal(btcAmount);
      dom.byId("addProxyLocalSymbol").innerHTML = this.currency.getSymbol();
    },

    setBtcAmount: function(btcAmount){
      //var newValue = accounting.formatNumber(btcAmount, [precision = 8], [thousand = ","], [decimal = "."]);
      dom.byId("addProxyBtcAmount").innerHTML = this.currency.formatBtc(btcAmount);
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