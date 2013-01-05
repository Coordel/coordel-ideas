define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/request"
    , "dojo/topic"
    , "app/models/pledges"
    , "dojo/domReady!"],function(dom, on, domClass, request, topic, stores){

  var allocateFormControl = {

    localCurrency: "USD",

    user: null,

    bitcoinPrices: null,

    init: function(user, prices){
      var self = this;

      self._csrf = $('#addIdea_csrf').val();

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

      on(dom.byId("allocateSubmit"), "click", function(){
        self.submit();
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

      self.pledge = pledge;

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

      newValue = accounting.formatNumber(newValue, [precision = 3], [thousand = ","], [decimal = "."]);
      dom.byId("allocateOwnershipPoints").innerHTML = newValue;
    },

    setBtcAmount: function(btcAmount){
      var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("allocateBtcAmount").innerHTML = newValue;
    },

   
    submit: function(){
      //there can be two types of pledges RECURRING and ONE-TIME. default ONE-TIME
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;
    

      var alloc = {
        docType: "allocation",
        project: dom.byId("allocateIdea").value,
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

  return allocateFormControl;

});