define(["dojo/dom", "dojo/on", "dojo/dom-class", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, stores){

  var allocateFormControl = {

    user: null,

    init: function(user){
      var self = this;

      self.user = user;

     
    },

    setPledgeHours: function(hours){
      dom.byId("reportTimeHours").innerHTML = hours;
    },

    showPledge: function(pledge){
      var self = this;

      //set the amounts
      dom.byId("reportTimePledgeType").innerHTML = pledge.type.toLowerCase();
      self.setPledgeHours(pledge.amount);

    },

    showError: function(){
      domClass.add(dom.byId("reportTimeAction"), "hide");
      domClass.add(dom.byId("reportTimeSubmit"), "hide");
      domClass.remove(dom.byId("reportTimeError"), "hide");
    },

    setOwnershipPoints: function(hours){
      var self = this;
      var newValue = hours * 50;
      dom.byId("reportTimeOwnershipPoints").innerHTML = newValue;
    },
   
    submit: function(){
     
    }
  };

  return allocateFormControl;

});