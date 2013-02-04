define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/request"
    , "dojo/topic"
    , "app/models/pledges"
    , "dojo/domReady!"],function(dom, on, domClass, request, topic, stores){

  var makePaymentFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    init: function(user, currency){
      var self = this;

      self._csrf = $('#addIdea_csrf').val();

      self.user = user;
      self.currency = currency;

      on(dom.byId("makePaymentSubmit"), "click", function(){
        self.submit();
      });
    },

    showPledge: function(pledge){
      var self = this;

      self.pledge = pledge;

      //it's possible that the user authenticated after this init was called on load...make sure
      if (self.user.app.coinbaseAccessToken){
        //this user has authorized their account with coinbase
        self.showAllocate();
      }

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
      dom.byId("allocateLocalAmount").innerHTML = this.currency.toLocal(btcAmount);
      dom.byId("allocateLocalSymbol").innerHTML = this.currency.getSymbol();
      
    },

    setBtcAmount: function(btcAmount){
      dom.byId("allocateBtcAmount").innerHTML = this.currency.formatBtc(btcAmount);
    },

   
    submit: function(){
      //there can be two types of pledges RECURRING and ONE-TIME. default ONE-TIME
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;
    

      var payment = {
        docType: "idea-payment",
        project: dom.byId("makePaymentIdea").value,
        pledgeId: self.pledge._id,
        amount: self.pledge.amount,
        created: timestamp,
        allocator: appId,
        creator: self.pledge.creator,
        status: "STARTED"
      };

      //update the pledge status to ALLOCATED
      self.pledge.status = "ALLOCATED";

      console.log("allocation", alloc, "pledge", self.pledge);

      
      var url = '/api/v1/pledges/allocations';
      request.post(url, {
          data: {
            alloc: JSON.stringify(alloc),
            pledge: JSON.stringify(self.pledge)
          },
          headers: {
              "X-CSRF-Token": self._csrf //for object property name, use quoted notation shown in second
          },
          handleAs: "json"
        }).then(function(resp){
          if (resp.success){
            console.log("successful", resp.allocation);
            topic.publish("coordel/ideaAction", "allocate", self.pledge.project);
            $('#allocateModal').modal('hide');
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