define(["dojo/dom", "dojo/on", "dojo/dom-class", "dojo/topic", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, topic, stores){

  var cancelTimeFormControl = {

    user: null,

    init: function(user, prices){
      var self = this;
      self.user = user;

      on(dom.byId("cancelTimeSubmit"), "click", function(){
        self.submit();
      });
    },

    showError: function(){
      domClass.add(dom.byId("cancelTimeAction"), "hide");
      domClass.add(dom.byId("cancelTimeSubmit"), "hide");
      domClass.remove(dom.byId("cancelTimeError"), "hide");
    },

    showPledge: function(pledge){
      var self = this;

      self.pledge = pledge;
      //set the amounts
      dom.byId("cancelTimeType").innerHTML = pledge.type.toLowerCase();
      self.setHours(pledge.amount);
    },

    setHours: function(hours){
      dom.byId("cancelTimeHours").innerHTML = hours;
    },

    submit: function(){

      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;
    

      var pledge =  self.pledge;

      pledge.status = "CANCELLED";
      pledge.cancelled = timestamp;
      pledge.cancelledBy = self.user.appId;

      console.log("pledge", pledge);

      var db = stores.timeStore();
      
      db.put(pledge).then(function(res){
        $('#cancelTimePledgeModal').modal('hide');
        console.log("cancelling time", pledge.project);
        topic.publish("coordel/ideaAction", "cancelTime", pledge.project);
      });
    }
  };

  return cancelTimeFormControl;

});