define(["dojo/dom", "dojo/on", "dojo/dom-class", "dojo/request","dojo/topic", "app/models/pledges", "dojo/domReady!"],function(dom, on, domClass, request, topic, stores){

  var allocateFormControl = {

    user: null,

    init: function(user){
      var self = this;

      self.user = user;

      self._csrf = $('#addIdea_csrf').val();

      on(dom.byId("reportTimeSubmit"), "click", function(){
        self.submit();
      });

      $('#reportTimeModal').on('hidden', function () {
        //clear all the fields
        dom.byId("reportTimeDescription").value = "";
      });
    },

    setPledgeHours: function(hours){
      dom.byId("reportTimeHours").innerHTML = hours;
    },

    showPledge: function(pledge){
      var self = this;

      self.pledge = pledge;

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

      var self = this
        , timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = self.user.app.id;
      

      //get the amount from the BTC field
      var amount = self.pledge.amount;
      var desc = dom.byId("reportTimeDescription").value;

      var report = {
        docType: "time-report",
        project: dom.byId("reportTimeIdea").value,
        pledgeId: self.pledge._id,
        amount: amount,
        description: desc,
        created: timestamp,
        reportedBy: appId,
        creator: self.pledge.creator,
        status: "STARTED"
      };

      //update the pledge status to ALLOCATED
      self.pledge.status = "ALLOCATED";

      console.log("report", report, "pledge", self.pledge);

      var url = '/api/v1/pledges/timeReports';
      request.post(url, {
          data: {
            report: JSON.stringify(report),
            pledge: JSON.stringify(self.pledge)
          },
          headers: {
              "X-CSRF-Token": self._csrf //for object property name, use quoted notation shown in second
          },
          handleAs: "json"
        }).then(function(resp){
          if (resp.success){
            console.log("successful", resp.allocation);
            topic.publish("coordel/ideaAction", "reportTime", self.pledge.project, self.pledge.type);
            $('#reportTimeModal').modal('hide');
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