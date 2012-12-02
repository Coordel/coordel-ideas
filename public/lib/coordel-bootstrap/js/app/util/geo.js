//http://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&sensor=false

define(["app/control/appControl", "dojo/request", "dojo/cookie", "dojo/topic"], function(app, request, cookie, topic){

  var geo = {
    _detectLocation: function(){
      var self = this;
      function initialize() {
        var loc = {};
        var geocoder = new google.maps.Geocoder();

          //Get the latitude and the longitude;
        function successFunction(position) {
          console.log("position", position);
          var lat = position.coords.latitude;
          var lng = position.coords.longitude;
          //geo.getCity(lat, lng);

          //victoria, bc
          //lat = "48.4328";
          //lng= "-123.3347";

          //london, uk
          //lat="51.5171";
          //lng="-0.1062";

          //paris, fr
          //lat = "48.8742";
          //lng = "2.3470";

          //guadalajara Mexico
          //lat = "20.6661";
          //lng = "-103.3519";

          var latlng = new google.maps.LatLng(lat, lng);
          geocoder.geocode({'latLng': latlng}, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
              app.location = self._getLocationString(results[1]);
              cookie("location", app.location);
              topic.publish("updateLocation", app.location);
            } else {
              topic.publish("updateLocation", false);
            }
          });
          
        }

        function errorFunction(err){
          topic.publish("updateLocation", false);
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(successFunction, errorFunction);
        } else {
          topic.publish("updateLocation", false);
        }
      }

      google.load("maps", "3.x", {other_params: "sensor=false", callback:initialize});
    },

    setLocation: function(){
      //it's possible that the location has already been set
      if (app.location){
        topic.publish("updateLocation", app.location);
      } else {
        this._detectLocation();
      }
    },


    _getLocationString: function(result){
      var city;
      var country;
      var state;
      var code;
      //console.log("results", results[1], results[1].formatted_address);
      result.address_components.forEach(function(item, key){
        console.log("type", item.types, item.long_name);
        var test = item.types;
        console.log("test", test);
        if (test[0]==="locality"){
          cityCode = key;
          console.log("city", item);
          city = item.long_name;
        }
        if (test[0]==="administrative_area_level_1"){
          state = item.short_name;
        }
        if (test[0]==="country"){
          country = item.long_name;
          code = item.short_name;
        }
      });
     

      //console.log("country", code, country);
      var location = "";
      if (state && country === "United States" || country === "Canada"){
        location = city + ", " + state;
      } else {
        location = city + ", " + country;
      }

      console.log("location", location);
      return location;
    }



  };

  return geo;

});