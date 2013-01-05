define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/request"
    , "dojo/_base/array"
    , "dijit/registry"
    , "app/views/proxyAllocateForm/pledge"
    , "dojo/domReady!"],function(dom, on, domClass, request, array, registry, p){

  var proxyAllocateFormControl = {

    localCurrency: "USD",

    user: null,

    contacts: [],

    pledges: [],

    bitcoinPrices: null,

    init: function(user, prices, contacts){
      var self = this;

      self._csrf = $('#addIdea_csrf').val();

      self.user = user;
      self.bitcoinPrices = prices;
      self.contacts = contacts;

      if (user.app.localCurrency){
        self.localCurrency = user.app.localCurrency;
      }

      self.showAllocate();

      on(dom.byId("proxyAllocateSubmit"), "click", function(){
        self.submit();
      });

     
    },

    showAllocate: function(){
      domClass.remove(dom.byId("proxyAllocateAction"), "hide");
      domClass.remove(dom.byId("proxyAllocateSubmit"), "hide");
    },

    showPledges: function(pledges){
      var self = this;

      self.pledges = pledges;

      array.forEach(registry.findWidgets(dom.byId("proxyAllocationPledgesContainer")), function(item){
        item.destroy();
      });

      array.forEach(pledges, function(item){
        new p({
          pledge: item,
          bitcoinPrices: self.bitcoinPrices,
          localCurrency: self.localCurrency,
          contacts: self.contacts
        }).placeAt(dom.byId("proxyAllocationPledgesContainer"));
      });
    },

    showError: function(){
      domClass.add(dom.byId("proxyAllocateAction"), "hide");
      domClass.add(dom.byId("proxyAllocateSubmit"), "hide");
      domClass.remove(dom.byId("proxyAllocateError"), "hide");
    },
   
    submit: function(){
      //there can be two types of pledges RECURRING and ONE-TIME. default ONE-TIME
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;

      var alloc = {
        docType: "proxy-allocation",
        project: dom.byId("proxyAllocateIdea").value,
        created: timestamp,
        creator: appId,
        status: "ALLOCATED"
      };

      var url = '/api/v1/proxies/allocations';
      request.post(url, {
          data: {
            alloc: JSON.stringify(alloc)
          },
          headers: {
              "X-CSRF-Token": self._csrf //for object property name, use quoted notation shown in second
          },
          handleAs: "json"
        }).then(function(resp){
          if (resp.success){
            topic.publish("coordel/ideaAction", "proxyAllocate", self.pledge.project);
            $('#proxyAllocateModal').modal('hide');
          } else {
            console.log("failed", resp.errors);
          }
           
          //the login won't work for sure because we don't have a password
          //but we can go through the error to see if the email already exists
        });
     
    }
  };

  return proxyAllocateFormControl;

});