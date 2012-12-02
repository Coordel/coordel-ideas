define(["dojo/text!./templates/purposeHelp.html", "dojo/domReady!"],function(purposeHelp){

  var addFormControl = {

    init: function(){
      var self = this;

      $("#addIdea").tooltip({
        placement: "bottom",
        trigger: "hover"
      });

      $("#addName").keyup(function(){
        if (self.validate()){
          $("#addShare").addClass("btn-primary").attr("disabled", false);
        } else {
          $("#addShare").removeClass("btn-primary").attr("disabled", "disabled");
        }
      });

      $("#addPurpose").keyup(function(){
        if (self.validate()){
          $("#addShare").addClass("btn-primary").attr("disabled", false);
        } else {
          $("#addShare").removeClass("btn-primary").attr("disabled", "disabled");
        }
      });

      $("#addName").bind('focus', function(e){
        $(this).popover({
          placement: 'right',
          html: true,
          content: '<span>here is the test</span>'
        });
      });

      $("#addName").bind('blur', function(e){
        $(this).popover('hide');
      });

      $("#addPurpose").bind('focus', function(){
        $(this).popover({
          placement: 'right',
          html: true,
          title: 'Purpose',
          content: purposeHelp
        });
      });

      $("#addPurpose").bind('blur', function(){
        $(this).popover('hide');
      });


      $("#addIdeaModal").on("shown", function() {
        $("#addName").focus();
      });

      $("#addIdeaModal").on("hidden", function() {
        $("#addName").val("");
        $("#addPurpose").val("");
        $("#addNameCount").text(self.max.name.toString());
        $("#addPurposeCount").text(self.max.purpose.toString());
      });


      $("#resetLocation").click(function(){
        console.log("resetting location");
        geo.setLocation();
      });
    },
    max: {
      name: 65,
      purpose: 560
    },
    validate: function(){
      var console = console;
      var isValid = false;
      var maxNameOk = false;
      var maxPurposeOk = false;

      var maxName = this.max.name;
      var maxPurpose = this.max.purpose;

      var name = $("#addName").val();
      var purpose = $("#addPurpose").val();

      var nameCount = maxName - name.length;
      var purposeCount = maxPurpose - purpose.length;

      $("#addNameCount").text(nameCount.toString());
      $("#addPurposeCount").text(purposeCount.toString());


      if (nameCount < 0){
        $("#addNameCount").addClass("text-error");
        $("#addNameCount").removeClass("muted");
      } else {
        $("#addNameCount").removeClass("text-error");
        $("#addNameCount").addClass("muted");
        maxNameOk = true;
      }

      if (purposeCount < 0){
        $("#addPurposeCount").addClass("text-error");
        $("#addPurposeCount").removeClass("muted");
      } else {
        $("#addPurposeCount").removeClass("text-error");
        $("#addPurposeCount").addClass("muted");
        maxPurposeOk = true;
      }

      if (name.length && purpose.length && maxNameOk && maxPurposeOk){
        isValid = true;
      }
      return isValid;
    },
    updateLocation: function(location){

      var self = this;
      if (location){
        self.location = location;
        cookie("location", location);
        //set the string
        $("#addLocationBtn").removeClass("hide");
        $("#addLocation").text(location);
      } else {
        //hide the location button
        $("#addLocationBtn").addClass("hide");
      }
    },
  };

  addFormControl.init();

});