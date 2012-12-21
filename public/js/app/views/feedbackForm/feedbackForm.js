define(["dojo/dom"
        , "dojo/on"
        , "dojo/dom-class"
        , "dojo/store/JsonRest"
        , "app/models/pledges"
        , "app/views/contactPicker/contactPicker"
        , "dojo/domReady!"],function(dom, on, domClass, JsonRest, stores, contactPicker){

  var feedbackFormControl = {

    user: null,

    contactPicker: null,

    init: function(user){
      var self = this;
      self.user = user;
      self._csrf = $('#addIdea_csrf').val();

      $("#feedbackPerformance").slider({
        orientation: "horizontal",
        range: "min",
        min: 0,
        max: 100,
        value: 50,
        slide: function (event, ui) {
          $("#echoFeedbackPerformance").html(ui.value);
        }
      });

      $("#echoFeedbackPerformance").html($("#feedbackPerformance").slider("value"));

      $("#feedbackCoordination").slider({
        orientation: "horizontal",
        range: "min",
        min: 0,
        max: 100,
        value: 50,
        slide: function (event, ui) {
          $("#echoFeedbackCoordination").html(ui.value);
        }
      });

      $("#echoFeedbackCoordination").html($("#feedbackCoordination").slider("value"));

      on(dom.byId("feedbackSubmit"), "click", function(e){
        self.submit();
      });
    },

    showError: function(){
  
        domClass.add(dom.byId("feedbackAction"), "hide");
        domClass.add(dom.byId("feedbackSubmit"), "hide");
        domClass.remove(dom.byId("feedbackError"), "hide");
    },

    showControls: function(users){
        var self = this;

        if (self.contactPicker){
          self.contactPicker.destroy();
        }

        self.contactPicker = new contactPicker({contacts: users, placeholder: "Select person to receive feedback"}).placeAt("feedbackSelectContainer");
        //set the amounts
    },

    submit: function(){
      var self = this;

      var appId = self.contactPicker.value;

      var ideaId = dom.byId("feedbackIdea").value;

      var c = $("#feedbackCoordination").slider("value")
        , p = $("#feedbackPerformance").slider("value")
        , comment = $("#feedbackComment").val();

      var feedback = {
        from: self.user.appId,
        coordination: c,
        performance: p,
        created: moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
      };

      feedback.comment = "";
      
      if (comment.trim().length){
        feedback.comment = comment;
      }

      var remote = new JsonRest({
        target: "/ideas/" + ideaId + "/users/" + appId + "/feedback",
        headers: {
          "X-CSRF-Token": self._csrf //for object property name, use quoted notation shown in second
        }
      });
      
      remote.put(feedback).then(function(res){
        console.log("post feedback response", res);
        $('#feedbackModal').modal('hide');
        $("#feedbackPerformance").slider("value", 50);
        $("#feedbackCoordination").slider("value", 50);
        $("#feedbackComment").attr("value", "");
      });
      
    }
  };

  return feedbackFormControl;
});