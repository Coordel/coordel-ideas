define(["dojo/dom",
  "dojo/on",
  "dojo/dom-class",
  "dojo/request",
  "dojo/_base/array",
  "dojo/dom-construct",
  "app/models/pledges",
  "dojo/domReady!"],function(dom, on, domClass, request, array, build, stores){

  var paymentFormControl = {

    hasPaymentMethod: true,

    bitcoinPrices: false,

    localCurrency: "USD",

    init: function(user){
      var self = this;

      self._csrf = $('#addIdea_csrf').val();
      self.user = user;

      if (!self.bitcoinPrices){
        self.getPrices();
      }

      if (user.app.localCurrency){
        self.localCurrency = user.app.localCurrency;
      }

      if (user.app.hasPaymentMethod){
        self.hasPaymentMethod = true;
      }

      self.showLocalCurrency();
  
      //supportMoneyInfo is the layer that holds the info to show the first time
      //supportMoneyAction is the layer that has the amount and options fields
      //supportMoneyPaymentInfo holds the stripe payment form
      //supportMoneySubmit is the submit button
      //supportMoneyUnderstand is the i understand button
      //supportMoneyBtcAmount, supportMoneyCurrencyAmount

      var bnBtc = dom.byId("supportMoneyBtcAmount")
        , bnLocal = dom.byId("supportMoneyLocalAmount")
        , bnSubmit = dom.byId("supportMoneySubmit");

      on(bnBtc, "keyup", function(e){
        self.setLocalAmount(e.target.value);
        bnSubmit.disabled = true;
        if (bnBtc.value !== "" && bnBtc.value !== "0.0000"){
          bnSubmit.disabled = false;
        }
      });

      on(bnLocal, "keyup", function(e){
        self.setBtcAmount(e.target.value);
        bnSubmit.disabled = true;
        if (bnBtc.value !== "" && bnBtc.value !== "0.0000"){
          bnSubmit.disabled = false;
        }
      });

      on(dom.byId("supportMoneyUnderstand"), "click", function(e){
        self.detectAccount(user);
      });

      on(dom.byId("supportMoneyUseAccountCreateNew"), "click", function(){
        self.showCreateAccount(user);
      });

      on(dom.byId("supportMoneyUseAccountUseExisting"), "click", function(){
        self.showSupport();
      });

      on(dom.byId("supportMoneyCreateCoinbaseAccount"), "click", function(){
        self.createAccount(dom.byId("coinbaseEmail").value, dom.byId("coinbasePassword").value);
      });

      on(dom.byId("supportMoneySubmit"), "click", function(){
        self.submit();
      });

      $('#supportMoneyModal').on('hidden', function () {
        //clear all the fields
        self.resetAll();
      });

      $('#supportMoneyModal').on('show', function () {
        //clear all the fields
        if (self.hasPaymentMethod){
          self.showSupport();
        } else {
          self.showInfo();
        }
      });

    },

    resetAll: function(){
      dom.byId("coinbaseEmail").value = "";
      dom.byId("coinbasePassword").value = "";
      dom.byId("supportMoneyBtcAmount").value = "";
      dom.byId("supportMoneyLocalAmount").value = "";
      dom.byId("supportMoneyPledge").checked = true;
      dom.byId("supportMoneyRecurringPledge").checked = false;
      dom.byId("supportMoneySubmit").disabled = true;
    },

    showLocalCurrency: function(){
      var self = this;
      dom.byId("localCurrencyCode").innerHTML = self.localCurrency;
    },

    setBtcAmount: function(localAmount){
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = localAmount * (1/localValue);
      newValue = accounting.formatNumber(newValue, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("supportMoneyBtcAmount").value = newValue;
    },

    setLocalAmount: function(btcAmount){
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      dom.byId("supportMoneyLocalAmount").value = newValue;
    },

    detectAccount: function(user){
      var self = this;
      self.postCoinbaseUser(user.email, "xxxxxxxx", function(resp){
        var has = false;
        if (resp.errors.length){
          array.forEach(resp.errors, function(e){
            if (e === "Email is already taken"){
              has = true;
            }
          });
          if (has){
            //this person already has a coinbase account show already exists with option to use or create new
            self.showUseAccount(user);
          } else {
            self.showCreateAccount(user);
          }
        } else {

        }
      });
      
    },

    createAccount: function(email, password){
      var self = this;
      self.postCoinbaseUser(email, password, function(resp){
        var has = false;
        if (resp.success){
          self.showSupport();
        } else {
          domClass.remove("createCoinbaseAccountErrors", "hide");
          array.forEach(resp.errors, function(item){
            build.create("p", {innerHTML: item}, "createCoinbaseAccountErrors", "last");
          });
          //handle the errors
        }
      });
    },

    postCoinbaseUser: function(email, password, fn){
      var self = this;
      request.post("/coinbase/users", {
          data: {
            user: JSON.stringify({
              email: email,
              password: password
            }),
            _csrf: self._csrf
          },
          handleAs: "json"
      }).then(function(resp){
          fn(resp);
          //the login won't work for sure because we don't have a password
          //but we can go through the error to see if the email already exists
      });
    },

    getPrices: function(){
      var self = this;
      request("/bitcoin/prices", {
        handleAs: "json"
      }).then(function(prices){
        self.bitcoinPrices = prices;
      });
    },

    showInfo: function(){
      //call this function if the user doesn't have a stripe customerid yet. this is shown to each user once
      domClass.remove("supportMoneyInfo", "hide");
      domClass.add("supportMoneyAction", "hide");
      //domClass.add("supportMoneyPaymentInfo", "hide");
      domClass.add("supportMoneyCreateAccount", "hide");
      domClass.add("supportMoneyUseAccount", "hide");
      domClass.add("supportMoneySubmit", "hide");
    },

    showNewCustomerSupport: function(){
      //this has the amount and stripe payment form
      domClass.add("supportMoneyInfo", "hide");
      domClass.remove("supportMoneyAction", "hide");
      domClass.add("supportMoneyUseAccount", "hide");
      //domClass.add("supportMoneyPaymentInfo", "hide");
      domClass.add("supportMoneyCreateAccount", "hide");
      domClass.remove("supportMoneySubmit", "hide");
      dom.byId("supportMoneyBtcAmount").focus();
    },

    showUseAccount: function(user){
      domClass.add("supportMoneyInfo", "hide");
      domClass.add("supportMoneyCreateAccount", "hide");
      domClass.add("supportMoneySubmit", "hide");
      dom.byId("coinbaseExistingEmail").innerHTML = user.email;
      domClass.remove("supportMoneyUseAccount", "hide");
    },

    showCreateAccount: function(user){
      //show form to create the account
      domClass.add("supportMoneyInfo", "hide");
      domClass.remove("supportMoneyCreateAccount", "hide");
      domClass.add("supportMoneySubmit", "hide");
      dom.byId("coinbaseEmail").value = user.email;
      domClass.add("supportMoneyUseAccount", "hide");
    },

    showSupport: function(){
      domClass.add("supportMoneyInfo", "hide");
      domClass.remove("supportMoneyAction", "hide");
      //domClass.add("supportMoneyPaymentInfo", "hide");
      domClass.add("supportMoneyCreateAccount", "hide");
      domClass.add("supportMoneyUseAccount", "hide");
      domClass.remove("supportMoneySubmit", "hide");
    },

    submit: function(){
      //there can be two types of pledges RECURRING and ONE-TIME. default ONE-TIME
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id
        , type = "ONE-TIME";
      
      //check if type id recurring
      if ( dom.byId("supportMoneyRecurringPledge").checked){
        type = "RECURRING";
      }

      //get the amount from the BTC field
      var amount = dom.byId("supportMoneyBtcAmount").value;


      var pledge = {
        docType: "money-pledge",
        project: dom.byId("supportMoneyIdea").value,
        created: timestamp,
        creator: appId,
        type: type,
        amount: parseFloat(amount),
        currency: "BTC",
        status: "PLEDGED"
      };

      var db = stores.moneyStore();
      db.add(pledge).then(function(res){
        $('#supportMoneyModal').modal('hide');
      });
    }
  };

  return paymentFormControl;

});