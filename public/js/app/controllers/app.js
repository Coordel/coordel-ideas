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
  "app/views/reportTimeForm/reportTimeForm",
  "app/views/addProxyForm/addProxyForm",
  "app/views/cancelMoneyForm/cancelMoneyForm",
  "app/views/cancelTimeForm/cancelTimeForm",
  "app/views/removeProxyForm/removeProxyForm",
  "app/views/feedbackForm/feedbackForm",
  "app/views/feedback/feedback",
  "app/views/proxyAllocateForm/proxyAllocateForm",
  "app/views/proxyDeallocateForm/proxyDeallocateForm",
  "app/views/donationsForm/donationsForm",
  "app/controllers/features",
  "app/views/addForm/addForm",
  "dojo/domReady!" ], function(dom
                    , topic, cookie, array, on, domClass, build, request, hash, registry
                    , model, miniProfile, userProfile, idea, blueprint, moneyForm
                    , timeForm, contact, allocate, reportTimeForm, addProxy
                    , cancelMoneyForm, cancelTimeForm, removeProxyForm, feedbackForm, feedback, proxyAllocateForm, proxyDeallocateForm, donationsForm, features){

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

    
    init: function(args){
      var self = this;
      self.user = args.user;
      self.otherUser = args.otherUser;
      console.log("init app", args );
      this.currentMenu = args.menu;
      this.subNav = args.subNav;
      this.model= model.init(args);
      this.contacts = args.contacts;
      this.show();

      self.setSearch();
     
      timeForm.init(args.user);

      donationsForm.init();
      
      request("/bitcoin/prices", {
        handleAs: "json"
        }).then(function(prices){
          self.bitcoinPrices = prices;
          moneyForm.init(args.user, prices);
          allocate.init(args.user, prices);
          reportTimeForm.init(args.user);
          addProxy.init(args.user, prices, args.contacts);
          proxyAllocateForm.init(args.user, prices, args.contacts);
          proxyDeallocateForm.init(args.user);
          cancelMoneyForm.init(args.user, prices);
          cancelTimeForm.init(args.user);
          removeProxyForm.init(args.user, prices, args.contacts);
          feedbackForm.init(args.user);
        });


    },

    setSearch: function(){
      $(".search-query").keyup(function(e){
        if (e.keyCode === 13){
          console.log("submit the search", $(e.target).val());
          window.location = "/search?q=" + $(e.target).val();
        }
      });
    },

    showBlueprints: function(args){

      var self = this;

      self.setSearch();

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

    

    showIdeaSearchResults: function(){
  
      var self = this
        , cont = dom.byId("stream-items-container")
        , head = dom.byId("mainColumnHeader");



      if (self.ideaResults.length){
        array.forEach(registry.findWidgets(cont), function(item){
          item.destroy();
        });
        build.empty(cont);
        self.showTimeline({ideaResults: true});
      } else {
        self.showEmpty(cont, "No ideas found");
      }
    },

    showPeopleSearchResults: function(){
 
      var self = this
        , cont = dom.byId("stream-items-container")
        , head = dom.byId("mainColumnHeader");



      if (self.peopleResults.length){
        array.forEach(registry.findWidgets(cont), function(item){
          item.destroy();
        });
        build.empty(cont);
        self.showTimeline({peopleResults: true});
      } else {
        self.showEmpty(cont, "No people found");
      }
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


    setSubNav: function(subnav, isOther){
      var self = this;

      if (isOther){
        var username = self.otherUser.user.username;
        //update the links in the menu
         $("#subNavIdeas > a").attr("href", "/"+username);
        $("#subNavSupporting > a").attr("href", "/"+username+"/supporting" );
        $("#subNavTime > a").attr("href", "/"+username+"/time" );
        $("#subNavMoney > a").attr("href", "/"+username+"/money" );
        $("#subNavProxy > a").attr("href", "/"+username+"/proxy" );
        $("#subNavContacts > a").attr("href", "/"+username+"/contacts" );
        $("#subNavFeedback > a").attr("href", "/"+username+"/feedback" );
      }

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
        case 'proxiedToMe':
          options.header = "Proxied to me";
          options.subNavId = "subNavProxy";
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

      if (self.currentMenu === "#menuCoordel"){
        features.init();
      }

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
        $("#menuMe").removeClass("active");
        $(selector).addClass("active");
      }

      setMenu(this.currentMenu);

      var socket = io.connect(window.location.host, {secure: true});

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

      if (self.user){
        socket.on("miniProfile:"+self.user.appId, function(item){
          console.log("SOCKET miniProfile", item);
          self.model.miniProfile = item;
          if (self.currentMenu === "#menuMe"){
            self.setUserNav();
          }
          topic.publish("coordel/miniProfile", item);
        });

        socket.on("supportAccount:"+self.user.appId, function(item){
          console.log("SOCKET account", item);
          self.model.currentUser.account = item;
          topic.publish("coordel/supportAccount", item);
        });

        socket.on("supporting:"+self.user.appId, function(item){
          topic.publish("coordel/supportIdea", item);
        });

        socket.on("contact:"+self.user.appId, function(item){
          console.log("got a new contact", item);
          ideaId = item.ideaId;
          contact = item.contact;
          self.model.contacts.push(contact);
          topic.publish("coordel/addIdeaContact", item);
        });

        socket.on("twitter:"+self.user.appId, function(account){
          console.log("got twitter auth", account);
          self.model.currentUser.app.twitterToken = account.token;
          self.model.currentUser.app.twitterTokenSecret = account.tokenSecret;
          topic.publish("coordel/twitterAuthorize", account);
        });

        socket.on("coinbase:"+self.user.appId, function(account){
          console.log("got coinbase auth", account);
          self.model.currentUser.app.coinbaseAccessToken = account.coinbaseAccessToken,
          self.model.currentUser.app.coinbaseRefreshToken = account.coinbaseRefreshToken;
          topic.publish("coordel/coinbaseAuthorize", account);
        });
      }
      


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

      if (this.currentMenu === "#menuOtherIdea"){
        self.showIdea();
      }


      if (this.currentMenu === "#menuOther"){
        self.showOtherProfile();
        self.setSubNav(self.subNav, true);
    
        if (self.otherUser.user.account.proxiedToMe > 0){
          domClass.remove(dom.byId("subNavProxy"), "hide");
          dom.byId("navProxy").innerHTML = self.otherUser.user.account.proxiedToMe;
        }
        if (self.subNav && self.subNav === "contacts"){
          self.showOtherContacts();
        } else if (self.subNav && self.subNav === "supporting"){
          self.showTimeline({showFeedback: true});
        } else if (self.subNav && self.subNav === "feedback"){
          self.showOtherFeedback();
        } else {
          self.showTimeline({showDogears: true});
        }
      }

      if (this.currentMenu === "#menuSearchResults"){
        self.showTimeline();
      }

      if (self.model.currentUser && this.currentMenu === "#menuMe"){
        self.showUserProfile();
        self.setSubNav(self.subNav);

        if (self.model.currentUser.account.proxiedToMe > 0){
          domClass.remove(dom.byId("subNavProxy"), "hide");
          dom.byId("navProxy").innerHTML = self.model.currentUser.account.proxiedToMe;
        }
  
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

    showIdea: function(){
      var self = this;
      var item = self.model.timeline.query()[0];
      var isMe = true;

      $(".wrapper").width("580px");

      if (self.otherUser && self.otherUser.user){
        isMe = false;
      }

      var options = {
        idea: item,
        currentUser: self.model.currentUser,
        contacts: self.model.contacts
      };

      if (isMe && options.currentUser ){
        options.user = options.currentUser;
      }

      if (!isMe){
        options.user = self.otherUser.user;
      }

      if (self.subNavId){
        options.subNavId = self.subNavId;
      }

      console.log("options", options);

      var i = new idea(options).placeAt("stream-items-container");

      i.expand();


    },

    showContacts: function(){

      var self = this
        , contacts = this.contacts;

      array.forEach(contacts, function(item){
        

        var i = new contact({contact: item}).placeAt("stream-items-container");
      });
    },

    showOtherContacts: function(){

      var self = this
        , contacts = self.otherUser.contacts;

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

    showOtherFeedback: function(){
      var self = this
        , contacts = this.otherUser.contacts;

      array.forEach(self.otherUser.user.feedback, function(item){
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

      var isMe = true;

      if (self.otherUser && self.otherUser.user){
        isMe = false;
      }

   

      array.forEach(ideas, function(item){
        var options = {
          idea: item,
          currentUser: self.model.currentUser,
          contacts: self.model.contacts
        };



        if (isMe && options.currentUser ){
          options.user = options.currentUser;
        }

        if (!isMe){
          options.user = self.otherUser.user;
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

    showOtherProfile: function(){
      var self = this;
      var user = self.otherUser.user
        , mini = self.otherUser.profile;
    
      self.setUserNav();
      var p = new userProfile({user: user, miniProfile: mini}).placeAt("userProfileContainer");
    },

    setUserNav: function(){
      var mini = this.model.miniProfile
        , user = this.model.currentUser;

      if (this.otherUser && this.otherUser.user){
        user = this.otherUser.user;
        mini = this.otherUser.profile;
      }

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
      if (mini.supportingTypes.withMoney > 0){
        money.innerHTML = mini.supportingTypes.withMoney;
        domClass.remove(money, "hide");
      }
     
      domClass.add(time, "hide");
      if (mini.supportingTypes.withTime > 0){
        time.innerHTML = mini.supportingTypes.withTime;
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