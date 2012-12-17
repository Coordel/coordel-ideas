define(["dojo/dom", "dojo/on", "dojo/dom-class", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, stores){

  var cancelTimeFormControl = {

    user: null,

    init: function(user, prices){
      var self = this;
      self.user = user;
    },

    showError: function(){
      console.log("showing error");
      domClass.add(dom.byId("cancelTimeAction"), "hide");
      domClass.add(dom.byId("cancelTimeSubmit"), "hide");
      domClass.remove(dom.byId("cancelTimeError"), "hide");
    },

    showPledge: function(pledge){
      var self = this;
      //set the amounts
      dom.byId("cancelTimeType").innerHTML = pledge.type.toLowerCase();
      self.setHours(pledge.amount);
    },

    setHours: function(hours){
      dom.byId("cancelTimeHours").innerHTML = hours;
    },

    submit: function(){
     
    }
  };

  return cancelTimeFormControl;

});