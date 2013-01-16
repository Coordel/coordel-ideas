define(["dojo/dom"
    , "dojo/on"
    , "dojo/dom-class"
    , "dojo/request"
    , "dojo/_base/array"
    , "dojo/domReady!"],function(dom, on, domClass, request, array){

  var proxyDeallocateFormControl = {

    localCurrency: "USD",

    user: null,

    init: function(user){
      var self = this;

     

      self._csrf = $('#addIdea_csrf').val();

      self.user = user;

      on(dom.byId("proxyDeallocateSubmit"), "click", function(){
    
        self.submit();
      });

     
    },

    show: function(proxyAllocation){
      var self = this;
      self.proxyAllocation = proxyAllocation;

    },

    showError: function(){
      domClass.add(dom.byId("proxyDeallocateAction"), "hide");
      domClass.add(dom.byId("proxyDealocateSubmit"), "hide");
      domClass.remove(dom.byId("proxyDeallocateError"), "hide");
    },
   
    submit: function(){
      //there can be two types of pledges RECURRING and ONE-TIME. default ONE-TIME
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;

      var alloc = self.proxyAllocation;
      
      alloc.status = "DEALLOCATED";
    
      var url = '/api/v1/proxies/deallocations';
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
            $('#proxyDeallocateModal').modal('hide');
            topic.publish("coordel/ideaAction", "proxyDeallocate", self.pledge.project);
          } else {
          
          }
        });
     
    }
  };

  return proxyDeallocateFormControl;

});