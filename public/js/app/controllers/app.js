define(["dojo/dom",
  "dojo/topic",
  "dojo/cookie",
  "dojo/_base/array",
  "dojo/on",
  "app/models/app",
  "app/views/miniProfile/miniProfile",
  "app/views/idea/idea",
  "app/views/addForm/addForm",
  "dojo/domReady!" ], function(dom, topic, cookie, array, on, model, miniProfile, idea){

  var app = {
    max: {
      name: 65,
      purpose: 560
    },

    location: false,

    model: null,

    init: function(args){

      console.log("init app", args);
 
      this.model= model.init(args);
      this.show();

    },
    show: function(){

      var self = this;

      console.log("showing app");

      console.log("model", this.model);

      var socket = io.connect(window.location.host);

      //console.log("showing app", this.username);

      //register for socketio events
      socket.on("idea", function (idea) {
        console.log("SOCKET IDEA", idea);
        self.model.timeline.notify(idea);
        topic.publish("coordel/addIdea", idea);
      });

      socket.on("stream", function(stream){
        console.log("SOCKET REPLY", stream);
     
      });

      self.showTimeline();

      if (self.model.currentUser){
        self.showMiniProfile();
      }

      $('#sign-out').click(function(){
        $('#sign-out-form').submit();
      });
  
      //menu

      $("#menuIdeas").click(function(){
        setMenu("#menuIdeas");
      });

      $("#menuStream").click(function(){
        setMenu("#menuStream");
      });

      $("#menuCoordel").click(function(){
        setMenu("#menuCoordel");
      });


      function setMenu(selector){
        $("#menuIdeas, #menuStream, #menuCoordel").removeClass("active");
        $(selector).addClass("active");
      }

      $("[rel=tooltip]").tooltip({
        placement: "bottom",
        trigger: "hover"
      });

      /* attach a submit handler to the form */
      $("#addIdeaForm").submit(function(event) {
        console.log("in here");

        /* stop form from submitting normally */
        event.preventDefault();
 
        /* get some values from elements on the page: */
        var name = $('#addName').val()
          , purpose = $('#addPurpose').val()
          , _csrf = $('#addIdea_csrf').val()
          , url = '/ideas';

        var postData = {
          name: name,
          purpose: purpose
        };

        $("#addIdeaModal").modal("hide");
        /* Send the data using post and put the results in a div */



        $.ajax( {
          url: url,
          type: 'post',
          data: postData,
          headers: {
              "X-CSRF-Token": _csrf //for object property name, use quoted notation shown in second
          },
          dataType: 'json',
          success: function( idea )
          {
            console.log("added an idea", idea);
            //self.model.timeline.notify(idea);
            //topic.publish("coordel/addIdea", idea);
          }
        });
        
      });

      $("#supportTimeForm").submit(function(event){
        event.preventDefault();
        $("#supportTimeModal").modal("hide");

        var id = $("#supportTimeIdea").val();

        var postData = {
          id: id,
          user: self.model.currentUser
        };

        console.log("postData", postData);

        $.ajax( {
          url: "/ideas/" + id + "/time",
          type: 'post',
          data: postData,
          headers: {
              "X-CSRF-Token": $('#addIdea_csrf').val() //for object property name, use quoted notation shown in second
          },
          dataType: 'json',
          success: function( idea )
          {
            console.log("followed an idea", idea);
          }
        });
      });

    },

    showTimeline: function(){
      var self = this;

      var ideas = this.model.timeline.query();

      array.forEach(ideas, function(item){
        var i = new idea({idea: item, currentUser: self.model.currentUser, contacts: self.model.contacts}).placeAt("stream-items-container");
      });

      self.ideasHandler = ideas.observe(function(item, removedFrom, insertedInto){
        console.log("observed", item, removedFrom, insertedInto);
        
        if(insertedInto > -1){ // new or updated object inserted
          console.log('inserting new item');
            var i = new idea({idea: item, currentUser: self.model.currentUser, contacts: self.model.contacts}).placeAt("stream-items-container", "first");
        }
      });



    },

    showMiniProfile: function(){
      var self = this;

      var p = new miniProfile({user: self.model.currentUser, miniProfile: self.model.miniProfile}).placeAt("profile-container");
    }

    

    
  };

  return app;
});