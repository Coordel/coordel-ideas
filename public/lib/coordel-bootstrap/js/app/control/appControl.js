define(["dojo/dom", "app/util/geo", "dojo/topic", "dojo/cookie", "dojo/domReady!" ], function(dom, geo, topic, cookie){

  var app = {
    max: {
      name: 65,
      purpose: 560
    },

    location: false,

    init: function(){
      //var console = console;

      //Get the latitude and the longitude;
      /*
      function successFunction(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        geo.getCity(lat, lng);
        console.log("position", position, lat, lng);
      }

      function errorFunction(){
        console.log("Geocoder failed");
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(successFunction, errorFunction);
      }
      */

      this.show();
    },
    show: function(){

      var self = this;

      console.log("showing app");

      //cookie("location", "");
      var hasCookie = false;
      if (cookie("location") && cookie("location").length){
        hasCookie = true;
      }

      if (hasCookie){
        self.location = cookie("location");
        //geo.setLocation();
        self.updateLocation(self.location);
      } else {
        geo.setLocation();
      }

      $("[rel=tooltip]").tooltip({
        placement: "bottom",
        trigger: "hover"
      });

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

      //watch for changes to the location
      topic.subscribe("updateLocation", function(location){
        self.updateLocation(location);
      });

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

    validate: function(){
      var console = console;
      var isValid = false;
      var maxNameOk = false;
      var maxPurposeOk = false;

      var maxName = this.max.name;
      var maxPurpose = this.max.purpose;

      var name = dom.byId("addName").value;
      var purpose = dom.byId("addPurpose").value;

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
    }
  };

  return app;
});