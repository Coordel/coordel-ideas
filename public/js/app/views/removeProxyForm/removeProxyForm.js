define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/_base/array"
    , "dojo/topic"
    , "app/models/pledges"
    , "app/views/contactPicker/contactPicker"
    , "dojo/domReady!"],function(dom, on, domClass, array, topic, stores, contactPicker){

  var removeProxyFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    init: function(user, prices, contacts){
      var self = this;

      self.user = user;
      self.bitcoinPrices = prices;
      self.contacts = contacts;

      self.showProxy();

      if (user.app.localCurrency){
        self.localCurrency = user.app.localCurrency;
      }

      on(dom.byId("removeProxySubmit"), "click", function(){
        self.submit();
      });

    },

    showProxy: function(){
      var self = this;
      domClass.add(dom.byId("proxyAuthorize"), "hide");
      domClass.remove(dom.byId("proxyAction"), "hide");
      domClass.remove(dom.byId("proxySubmit"), "hide");

      var list = array.filter(self.contacts, function(item){
        return item.appId !== self.user.appId;
      });
      
      self.picker = new contactPicker({contacts: list, placeholder: "Select proxy"}).placeAt("removeProxySelectContainer");
      self.picker.inputControl.value = "This is the proxy";
      self.picker.inputControl.disabled = true;
    },

    showPledge: function(pledge){
      var self = this;
      console.log("showPledge removeProxy", pledge);



      self.pledge = pledge;

      //set the amount
      dom.byId("removeProxyPledgeType").innerHTML = pledge.type.toLowerCase();
      self.setLocalAmount(pledge.amount);
      self.setBtcAmount(pledge.amount);

      
      console.log("contacts" , self.contacts);
      var proxy = false;
      array.forEach(self.contacts, function(item){
        if (item.appId === pledge.proxy){
          self.picker.value = item.appId;
          self.picker.inputControl.value = item.fullName;
        }
      });
      

      if (pledge.type === "RECURRING"){
        domClass.add(dom.byId("removeProxyOnceInstructions"), "hide");
        domClass.remove(dom.byId("removeProxyRecurringInstructions"), "hide");
      }
    },

    showError: function(){
      domClass.add(dom.byId("removeProxyAction"), "hide");
      domClass.add(dom.byId("removeProxySubmit"), "hide");
      domClass.remove(dom.byId("removeProxyError"), "hide");
    },

    setOwnershipPoints: function(btcAmount){
      var self = this;
      var newValue = btcAmount / 0.075;

      newValue = accounting.formatNumber(newValue, [precision = 4], [thousand = ","], [decimal = "."]);
      console.log("btcAmount", btcAmount, "newValue", newValue);
      dom.byId("removeProxyOwnershipPoints").innerHTML = newValue;
    },

    setLocalAmount: function(btcAmount){
      console.log("set local amount", btcAmount);
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      dom.byId("removeProxyLocalAmount").innerHTML = newValue;
      if (self.bitcoinPrices[self.localCurrency].symbol){
        dom.byId("removeProxyLocalSymbol").innerHTML = self.bitcoinPrices[self.localCurrency].symbol;
      }
    },

    setBtcAmount: function(btcAmount){
      var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("removeProxyBtcAmount").innerHTML = newValue;
    },

    submit: function(){
      //change the status to PLEDGED
      //remove the proxy
      //remove date proxied

      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;
    

      var pledge =  self.pledge;

      pledge.status = "PLEDGED";
      delete pledge.proxy;
      delete pledge.proxied;

      console.log("pledge", pledge);

      var db = stores.moneyStore();
      

      db.put(pledge).then(function(res){
        $('#removeProxyModal').modal('hide');
        console.log("adding proxy", pledge.project);
        topic.publish("coordel/ideaAction", "removeProxy", pledge.project);
      });
    }

  };

  return removeProxyFormControl;

});