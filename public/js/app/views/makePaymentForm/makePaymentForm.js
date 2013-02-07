define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/request"
    , "dojo/topic"
    , "app/models/pledges"
    , "app/views/contactPicker/contactPicker"
    , "dojo/_base/array"
    , "dijit/registry"
    , "dojo/aspect"
    , "dojo/domReady!"],function(dom, on, domClass, request, topic, stores, contactPicker, array, registry, aspect){

  var makePaymentFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    picker: null,

    payee: null,

    validate: function(){

      var self = this
        , isValid = true
        , bnBtc = dom.byId("makePaymentBtcAmount")
        , bnLocal = dom.byId("makePaymentLocalAmount")
        , bnSubmit = dom.byId("makePaymentSubmit")
        , payee = this.picker.value;



      if (self.payee && bnBtc.value !== "" && bnBtc.value !== "0.00000000" && bnLocal.value !== "0.00" && bnBtc.value <= self.balance){
        isValid = false;
      }

      return isValid;
    },

    init: function(user, currency, contacts){
      var self = this;

      self._csrf = $('#addIdea_csrf').val();

      self.user = user;
      self.currency = currency;
      self.contacts = contacts;

      var bnBtc = dom.byId("makePaymentBtcAmount")
        , bnLocal = dom.byId("makePaymentLocalAmount")
        , bnSubmit = dom.byId("makePaymentSubmit");

      on(bnBtc, "keyup", function(e){
        self.setLocalAmount(e.target.value);
        bnSubmit.disabled = self.validate();
      });

      on(bnLocal, "keyup", function(e){
        self.setBtcAmount(e.target.value);
        bnSubmit.disabled = self.validate();
      });

      on(bnSubmit, "click", function(){
        self.submit();
      });

      //console.log("make payment form initialized");
    },

    show: function(idea, balance){
      var self = this;
      self.idea = idea;
      self.balance = balance;


      //it's possible that the user authenticated after this init was called on load...make sure
      if (self.user.app.coinbaseAccessToken){
        //this user has authorized their account with coinbase
        //self.showAllocate();
      }

      //set the amounts
      
      self.setLocalBalance(balance);
      self.setBtcBalance(balance);
      self.showPayee();

    },

    showPayee: function(){
      //console.log("show proxy");
      var self = this;
  

      //console.log("contacts", self.contacts);

      array.forEach(registry.findWidgets(dom.byId("makePaymentSelectContainer")), function(item){
        item.destroy();
        //console.log("destroyed");
      });

      var list = array.filter(self.contacts, function(item){
        return array.indexOf(self.idea.users, item.appId) > -1;
        //return item.appId !== self.user.appId;
      });

      self.picker = new contactPicker({contacts: list, placeholder: "Payment recipient"}).placeAt("makePaymentSelectContainer");

      aspect.after(self.picker, "change", function(payee){
        console.log("change", payee);
        self.payee = payee;
        self.validate();
      }, true);
    },

    showError: function(){
      domClass.add(dom.byId("allocateAuthorize"), "hide");
      domClass.add(dom.byId("allocateAction"), "hide");
      domClass.add(dom.byId("allocateSubmit"), "hide");
      domClass.remove(dom.byId("allocateError"), "hide");
    },

    setBtcAmount: function(localAmount){
      dom.byId("makePaymentBtcAmount").value = this.currency.toBtc(localAmount);
    },

    setLocalAmount: function(btcAmount){
      dom.byId("makePaymentLocalAmount").value = this.currency.toLocal(btcAmount);
    },

    setLocalBalance: function(btcAmount){
      dom.byId("makePaymentLocalBalance").innerHTML = this.currency.toLocal(btcAmount);
      dom.byId("makePaymentLocalSymbol").innerHTML = this.currency.getSymbol();
    },

    setBtcBalance: function(btcAmount){
      dom.byId("makePaymentBtcBalance").innerHTML = this.currency.formatBtc(btcAmount);
    },

   
    submit: function(){
      
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    

      var payment = {
        docType: "idea-payment",
        project: self.idea._id,
        amount: parseFloat(dom.byId("makePaymentBtcAmount").value),
        created: timestamp,
        creator: self.user.app.id,
        recipient: self.payee.appId,
        status: "STARTED"
      };

      console.log("payment", payment);

    
      var url = '/api/v1/payments';
      request.post(url, {
          data: {
            payment: JSON.stringify(payment)
          },
          headers: {
              "X-CSRF-Token": self._csrf //for object property name, use quoted notation shown in second
          },
          handleAs: "json"
        }).then(function(resp){
          if (resp.success){
            _gaq.push(['_trackEvent', 'Ideas', 'Made payment']);
            topic.publish("coordel/ideaAction", "makePayment", payment.project, payment);
            $('#makePaymentModal').modal('hide');
            dom.byId("makePaymentBtcAmount").value = '';
            dom.byId("makePaymentLocalAmount").value = '';
          } else {
            console.log("failed", resp.errors);
          }
           
          //the login won't work for sure because we don't have a password
          //but we can go through the error to see if the email already exists
        });
    }
  };

  return makePaymentFormControl;

});