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

    init: function(user, currency){
      var self = this;

      self._csrf = $('#addIdea_csrf').val();

      self.user = user;
      //self.bitcoinPrices = prices;
      self.currency = currency;

      /*
      if (user.localCurrency){
        self.localCurrency = user.localCurrency;
      }
      */

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

      topic.subscribe("coordel/coinbaseAuthorize", function(account){
        //the users authenticated, so show the allocate form;
        self.showAllocate();
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
      self.showFee(pledge);
      

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

    showFee: function(pledge){
      if (pledge.amount < 0.01){
        var symbol = this.currency.getSymbol();

        domClass.remove(dom.byId("allocateFeeContainer"), "hide");
        dom.byId("allocateFeeWarning").innerHTML = symbol + this.currency.toLocal(0.01);
        dom.byId("allocateFeeAmount").innerHTML = symbol + this.currency.toLocal(0.0005);
      }
    },

    showError: function(){
      domClass.add(dom.byId("allocateAuthorize"), "hide");
      domClass.add(dom.byId("allocateAction"), "hide");
      domClass.add(dom.byId("allocateSubmit"), "hide");
      domClass.remove(dom.byId("allocateError"), "hide");
    },

    setLocalAmount: function(btcAmount){
      /*
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      dom.byId("allocateLocalAmount").innerHTML = newValue;
      if (self.bitcoinPrices[self.localCurrency].symbol){
        dom.byId("allocateLocalSymbol").innerHTML = self.bitcoinPrices[self.localCurrency].symbol;
      }
      */
      dom.byId("allocateLocalAmount").innerHTML = this.currency.toLocal(btcAmount);
      dom.byId("allocateLocalSymbol").innerHTML = this.currency.getSymbol();
      
    },

    setOwnershipPoints: function(btcAmount){
      /*
      var self = this;
      var newValue = btcAmount / 0.075;

      newValue = accounting.formatNumber(newValue, [precision = 3], [thousand = ","], [decimal = "."]);
      dom.byId("allocateOwnershipPoints").innerHTML = newValue;
      */
      dom.byId("allocateOwnershipPoints").innerHTML = this.currency.getOwnership(btcAmount);
    },

    setBtcAmount: function(btcAmount){
      //var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);
      dom.byId("allocateBtcAmount").innerHTML = this.currency.formatBtc(btcAmount);
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

      //console.log("allocation", alloc, "pledge", self.pledge);

      
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
            _gaq.push(['_trackEvent', 'Ideas', 'Allocated money']);
            //console.log("successful", resp.allocation);
            topic.publish("coordel/ideaAction", "allocate", self.pledge.project);
            $('#allocateModal').modal('hide');
          } else {
            //console.log("failed", resp.errors);
          }
           
          //the login won't work for sure because we don't have a password
          //but we can go through the error to see if the email already exists
        });
     
    }
  };

  return allocateFormControl;

});