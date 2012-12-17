define(["dojo/dom",
  "dojo/topic",
  "dojo/cookie",
  "dojo/_base/array",
  "dojo/on",
  "dojo/dom-class",
  "dojo/request",
  "app/models/app",
  "app/views/miniProfile/miniProfile",
  "app/views/userProfile/userProfile",
  "app/views/idea/idea",
  "app/views/moneyForm/moneyForm",
  "app/views/timeForm/timeForm",
  "app/views/contact/contact",
  "app/views/allocateForm/allocateForm",
  "app/views/addProxyForm/addProxyForm",
  "app/views/cancelMoneyForm/cancelMoneyForm",
  "app/views/removeProxyForm/removeProxyForm",
  "app/views/feedbackForm/feedbackForm",
  "app/views/addForm/addForm",
  "dojo/domReady!" ], function(dom
                    , topic, cookie, array, on, domClass, request
                    , model, miniProfile, userProfile, idea, moneyForm
                    , timeForm, contact, allocate, addProxy
                    , cancelMoneyForm, removeProxyForm, feedbackForm){

  var app = {
    max: {
      name: 65,
      purpose: 560
    },

    location: false,

    model: null,

    init: function(args){

      console.log("init app", args );
      this.currentMenu = args.menu;
      this.subNav = args.subNav;
      this.model= model.init(args);
      this.contacts = args.contacts;
      this.show();
     
      timeForm.init(args.user);
    
      request("/bitcoin/prices", {
        handleAs: "json"
      }).then(function(prices){
        self.bitcoinPrices = prices;
        moneyForm.init(args.user, prices);
        allocate.init(args.user, prices);
        addProxy.init(args.user, prices, args.contacts);
        cancelMoneyForm.init(args.user, prices);
        removeProxyForm.init(args.user, prices);
        feedbackForm.init(args.user);
      });
      

    },

    setSubNav: function(subnav){
      var self = this;

      var options = {
        header: 'Ideas',
        subNavId: 'subNavIdeas'
      };

      switch (subnav){
        case 'ideas':
        break;
        case 'supporting':
          options.header = "Supporting";
          options.subNavId = "subNavSupporting";
        break;
        case 'moneyPledged':
          options.header = "Pledged money";
          options.subNavId = "subNavMoney";
        break;
        case 'timePledged':
          options.header = "Pledged time";
          options.subNavId = "subNavTime";
        break;
        case 'contacts':
          options.header = "Contacts";
          options.subNavId = "subNavContacts";
        break;
        case 'feedback':
          options.header = "Feedback";
          options.subNavId = "subNavFeedback";
        break;
      }

      dom.byId("mainColumnHeader").innerHTML = options.header;

      self.subNavId = options.subNavId;

      domClass.add(options.subNavId, "active");
    },

    show: function(){

      var self = this;

      var socket = io.connect(window.location.host);

      //register for socketio events
      socket.on("idea", function (idea) {
        console.log("SOCKET IDEA", idea);
        self.model.timeline.notify(idea);
        topic.publish("coordel/addIdea", idea);
      });

      socket.on("stream", function(item){
        console.log("SOCKET REPLY", item);
        topic.publish("coordel/stream", item);
      });

      if (this.currentMenu === "#menuIdeas"){
         self.showTimeline();
      }

      if (self.model.currentUser && this.currentMenu === "#menuIdeas"){
        self.showMiniProfile();
      }

      if (self.model.currentUser && this.currentMenu === "#menuMe"){
        self.showUserProfile();
        self.setSubNav(self.subNav);
        console.log("subNav", self.subNav);
        if (self.subNav && self.subNav === "contacts"){
          self.showContacts();
        } else if (self.subNav && self.subNav === "supporting"){
          console.log("setting feedback to true");
          self.showTimeline({showFeedback: true});
        } else {
          self.showTimeline({showDogears: true});
        }
        
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

      $("#menuBlueprints").click(function(){
        setMenu("#menuBlueprints");
      });


      function setMenu(selector){
        $("#menuIdeas").removeClass("active");
        $("#menuStream").removeClass("active");
        $("#menuCoordel").removeClass("active");
        $("#menuBlueprints").removeClass("active");
        $(selector).addClass("active");
      }

      setMenu(this.currentMenu);

      $("[rel=tooltip]").tooltip({
        placement: "bottom",
        trigger: "hover"
      });

      /* attach a submit handler to the form */
      $("#addIdeaForm").submit(function(event) {

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
  
          }
        });
      });

    },

    showContacts: function(){
      console.log("contacts");
      var self = this
        , contacts = this.contacts;

      array.forEach(contacts, function(item){
        

        var i = new contact({contact: item}).placeAt("stream-items-container");
      });
    },


    showTimeline: function(args){
      var self = this;

     

      /*
      $('#stream-items-container').infinitescroll({
        // other options
        dataType: 'json',
        appendCallback: false
      }, function(json, opts) {
        // Get current page
        var page = opts.state.currPage;
        console.log("infinite scroll", json, opts);
        // Do something with JSON data, create DOM elements, etc ..
      });
       */

      var ideas = this.model.timeline.query();

      array.forEach(ideas, function(item){
        var options = {
          idea: item,
          currentUser: self.model.currentUser,
          contacts: self.model.contacts
        };

        if (options.currentUser.appId === item.creator){
          options.user = options.currentUser;
        }

        if (args && args.showDogears){
          options.showDogears = true;
        }

        if (args && args.showFeedback){
          options.showFeedback = true;
        }

        if (self.subNavId){
          options.subNavId = self.subNavId;
        }



        var i = new idea(options).placeAt("stream-items-container");
      });

      self.ideasHandler = ideas.observe(function(item, removedFrom, insertedInto){
        
        if(insertedInto > -1){ // new or updated object inserted
          var i = new idea({idea: item, subNavId: self.subNavId, currentUser: self.model.currentUser, contacts: self.model.contacts}).placeAt("stream-items-container", "first");
        }
      });



    },

    showMiniProfile: function(){
      var self = this;

      var p = new miniProfile({user: self.model.currentUser, miniProfile: self.model.miniProfile}).placeAt("profile-container");
    },

    showUserProfile: function(){
      var self = this;
      var user = self.model.currentUser
        , mini = self.model.miniProfile;
    
      self.setUserNav();
      var p = new userProfile({user: user, miniProfile: mini}).placeAt("userProfileContainer");
    },

    setUserNav: function(){
      var mini = this.model.miniProfile
        , user = this.model.currentUser;

      var ideas = dom.byId("navIdeas");
      var supporting = dom.byId("navSupporting");
      var contacts = dom.byId("navContacts");
      var money = dom.byId("navMoney");
      var time = dom.byId("navTime");


      ideas.innerHTML = mini.ideas;
      supporting.innerHTML = mini.supporting;
      contacts.innerHTML = mini.contacts;
      money.innerHTML = user.account.pledgedIdeas.length + user.account.proxiedIdeas.length;
      time.innerHTML = user.account.pledgedTimeIdeas.length;
    }

    

    
  };

  return app;
});