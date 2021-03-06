define(["dojo/dom", "dojo/on", "dojo/dom-class", "dojo/topic", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, topic, stores){

  var timeFormControl = {

    user: null,

    init: function(user){
      var self = this;

      self.user = user;
  
      var hoursInput = dom.byId("supportTimeHours");

      on(dom.byId("supportTimeSubmit"), "click", function(){
        self.submit();
      });

      on(hoursInput, "keyup", function(e){
        var hours = accounting.formatNumber(e.target.value, [precision = 2], [thousand = ","], [decimal = "."]);
        self.validate(hours);
      });

      on(hoursInput, "blur", function(e){
        var hours = e.target.value;
        self.setHours(hours);
        self.validate(hours);
      });

       $('#supportTimeModal').on('hidden', function () {
        //clear all the fields
        self.resetAll();
      });

    },

    resetAll: function(){
      dom.byId("supportTimeHours").value = "";
      dom.byId("supportTimePledge").checked = true;
      dom.byId("supportTimeRecurringPledge").checked = false;
      dom.byId("supportTimeSubmit").disabled = true;
    },

    setHours: function(hours){
      var self = this;
      hours = accounting.formatNumber(hours, [precision = 2], [thousand = ","], [decimal = "."]);
      var inputHours = dom.byId("supportTimeHours");
      if (hours !== "0.00"){
        inputHours.value = hours;
      } else {
        inputHours.value = "";
      }
    },

    validate: function(hours){
      hours = accounting.formatNumber(hours, [precision = 2], [thousand = ","], [decimal = "."]);
      var bnSubmit = dom.byId("supportTimeSubmit");
      bnSubmit.disabled = true;
      if (hours !== "0.00"){
        bnSubmit.disabled = false;
      }
    },

    submit: function(){
      //there can be two types of pledges RECURRING and ONE-TIME. default ONE-TIME
      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id
        , type = "ONE-TIME";
      
      //check if type id recurring
      if (dom.byId("supportTimeRecurringPledge").checked){
        type = "RECURRING";
      }

      //get the amount from the BTC field
      var amount = dom.byId("supportTimeHours").value;


      var pledge = {
        docType: "time-pledge",
        project: dom.byId("supportTimeIdea").value,
        created: timestamp,
        creator: appId,
        type: type,
        amount: parseFloat(amount),
        status: "PLEDGED"
      };

      var db = stores.timeStore();
      db.add(pledge).then(function(res){
        _gaq.push(['_trackEvent', 'Ideas', 'Pledged time']);
        $('#supportTimeModal').modal('hide');
        topic.publish("coordel/ideaAction", "pledgeTime", pledge.project);
      });
    }
  };

  return timeFormControl;

});