define(["dojo/dom",
  "dojo/topic",
  "dojo/cookie",
  "dojo/_base/array",
  "dojo/on",
  "dojo/dom-class",
  "dojo/dom-construct",
  "dojo/request",
  "dojo/hash",
  "dijit/registry",
  "app/models/app",
  "app/views/miniProfile/miniProfile",
  "app/views/userProfile/userProfile",
  "app/views/idea/idea",
  "app/views/blueprint/blueprint",
  "app/views/moneyForm/moneyForm",
  "app/views/timeForm/timeForm",
  "app/views/contact/contact",
  "app/views/allocateForm/allocateForm",
  "app/views/addProxyForm/addProxyForm",
  "app/views/cancelMoneyForm/cancelMoneyForm",
  "app/views/removeProxyForm/removeProxyForm",
  "app/views/feedbackForm/feedbackForm",
  "app/views/feedback/feedback",
  "app/views/addForm/addForm",
  "dojo/domReady!" ], function(dom
                    , topic, cookie, array, on, domClass, build, request, hash, registry
                    , model, miniProfile, userProfile, idea, blueprint, moneyForm
                    , timeForm, contact, allocate, addProxy
                    , cancelMoneyForm, removeProxyForm, feedbackForm, feedback){

  var app = {
    max: {
      name: 65,
      purpose: 560
    },

    location: false,

    model: null,

    bpNav: "coords",

    coordbp: [],

    taskbp: [],

    showBlueprints: function(args){

      var self = this;

      self._csrf = args._csrf;

      self.currentUser = args.user;

      self.taskbp = array.filter(args.blueprints, function(item){
        return item.templateType === "task";
      });

      self.coordbp = array.filter(args.blueprints, function(item){
        return item.templateType === "project";
      });

      self.showCoordBlueprints();

      var coordNav = dom.byId("subNavCoordBlueprints");
      var taskNav = dom.byId("subNavTaskBlueprints");

      hash("coords", true);

      topic.subscribe("/dojo/hashchange", function(changedHash){
        // Handle the hash change publish
    
        if (changedHash === "coords"){
          domClass.remove(taskNav, "active");
          domClass.add(coordNav, "active");
          self.showCoordBlueprints();
        } else if (changedHash === "tasks"){
          domClass.add(taskNav, "active");
          domClass.remove(coordNav, "active");
          self.showTaskBlueprints();
        }
      });
      
    },

    showEmpty: function(node, message){
      array.forEach(registry.findWidgets(node), function(item){
        item.destroy();
      });
      build.empty(node);
      var row = build.toDom("<p class='empty-blueprint'>" + message + "</p>");
      build.place(row, node);
    },

    showTaskBlueprints: function(){
      var self = this
        , cont = dom.byId("stream-items-container")
        , head = dom.byId("mainColumnHeader");

      head.innerHTML = "Task blueprints";

      if (self.taskbp.length){
        array.forEach(registry.findWidgets(cont), function(item){
          item.destroy();
        });
        build.empty(cont);
        array.forEach(self.taskbp, function(item){
          new blueprint({_csrf:self._csrf, blueprint: item, name: item.task.name, purpose: item.task.purpose, user: self.currentUser}).placeAt("stream-items-container");
        });
      } else {
        self.showEmpty(cont, "No Task blueprints");
      }

      
    },

    showCoordBlueprints: function(){
      var self = this
        , cont = dom.byId("stream-items-container")
        , head = dom.byId("mainColumnHeader");

      head.innerHTML = "Coord blueprints";

      if (self.coordbp.length){
        array.forEach(registry.findWidgets(cont), function(item){
          item.destroy();
        });
        build.empty(cont);
        array.forEach(self.coordbp, function(item){
          new blueprint({_csrf:self._csrf, blueprint: item, name: item.project.name, purpose: item.project.purpose, user: self.currentUser}).placeAt("stream-items-container");
        });
      } else {
        self.showEmpty(cont, "No Coord blueprints");
      }
      
    },

    init: function(args){
      var self = this;
      self.user = args.user;
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
        case 'timeline':
          options.header = "Ideas";
          options.subNavId = "subNavTimeline";
        break;
        case 'trending':
          options.header = "Trending";
          options.subNavId = "subNavTrending";
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
        if (self.model.currentUser){
          self.showMiniProfile();
          self.setSubNav(self.subNav);
          if (self.subNav && self.subNav === "trending"){
            self.showTimeline({unsorted: true});
          } else {
            self.showTimeline();
          }
        } else {
          self.showTimeline();
        }
      }

      if (self.model.currentUser && this.currentMenu === "#menuMe"){
        self.showUserProfile();
        self.setSubNav(self.subNav);
  
        if (self.subNav && self.subNav === "contacts"){
          self.showContacts();
        } else if (self.subNav && self.subNav === "supporting"){
          self.showTimeline({showFeedback: true});
        } else if (self.subNav && self.subNav === "feedback"){
          self.showFeedback();
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

      var self = this
        , contacts = this.contacts;

      array.forEach(contacts, function(item){
        

        var i = new contact({contact: item}).placeAt("stream-items-container");
      });
    },

    showFeedback: function(){
      var self = this
        , contacts = this.contacts;

      array.forEach(self.user.feedback, function(item){
        var i = new feedback({contacts: contacts, feedback: item}).placeAt("stream-items-container", "first");
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

      var ideas;

      if (args && args.unsorted){
        ideas = this.model.timeline.query();
      } else {
        ideas = this.model.timeline.query(null, {sort: [{attribute:"created", descending: true}]});
      }

      array.forEach(ideas, function(item){
        var options = {
          idea: item,
          currentUser: self.model.currentUser,
          contacts: self.model.contacts
        };

        if (options.currentUser && options.currentUser.appId === item.creator){
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



        var i =new idea(options).placeAt("stream-items-container");
        /*
        if (args && args.unsorted){
          console.log("idea name", idea.name);
          i = new idea(options).placeAt("stream-items-container", "last");
        } else {
          i =
        }*/
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
      var feedback = dom.byId("navFeedback");


      
      domClass.add(ideas, "hide");
      if (mini.ideas > 0){
        ideas.innerHTML = mini.ideas;
        domClass.remove(ideas, "hide");
      }
      
      domClass.add(supporting, "hide");
      if (mini.supporting > 0){
        supporting.innerHTML = mini.supporting;
        domClass.remove(supporting, "hide");
      }
      
      domClass.add(contacts, "hide");
      if (mini.contacts > 0){
        contacts.innerHTML = mini.contacts;
        domClass.remove(contacts, "hide");
      }
      
      domClass.add(money, "hide");
      if (user.account.pledgedIdeas.length + user.account.proxiedIdeas.length > 0){
        money.innerHTML = user.account.pledgedIdeas.length + user.account.proxiedIdeas.length;
        domClass.remove(money, "hide");
      }
     
      domClass.add(time, "hide");
      if (user.account.pledgedTimeIdeas.length){
        time.innerHTML = user.account.pledgedTimeIdeas.length;
        domClass.remove(time, "hide");
      }

      
      domClass.add(feedback, "hide");
      if (user.feedback.length){
        feedback.innerHTML = user.feedback.length;
        domClass.remove(feedback, "hide");
      }

    }

    

    
  };

  return app;
});