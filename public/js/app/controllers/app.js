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
  "app/models/currency",
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
  "app/views/makePaymentForm/makePaymentForm",
  "app/views/cancelMoneyForm/cancelMoneyForm",
  "app/views/cancelTimeForm/cancelTimeForm",
  "app/views/removeProxyForm/removeProxyForm",
  "app/views/feedbackForm/feedbackForm",
  "app/views/feedback/feedback",
  "app/views/proxyAllocateForm/proxyAllocateForm",
  "app/views/proxyDeallocateForm/proxyDeallocateForm",
  "app/views/donationsForm/donationsForm",
  "app/controllers/features",
  "app/views/pointer/pointer",
  "app/views/addForm/addForm",

  "dojo/domReady!" ], function(dom
                    , topic, cookie, array, on, domClass, build, request, hash, registry
                    , model, currency, miniProfile, userProfile, idea, blueprint, moneyForm
                    , timeForm, contact, allocate, reportTimeForm, addProxy, makePaymentForm
                    , cancelMoneyForm, cancelTimeForm, removeProxyForm, feedbackForm, feedback, proxyAllocateForm, proxyDeallocateForm, donationsForm, features, pointer){

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
      self.pointers = args.pointers;
      console.log("init app", args );
      this.currentMenu = args.menu;
      this.subNav = args.subNav;
      this.model= model.init(args);
      this.contacts = args.contacts;

      if (args.workspaceUrl){
        //console.log("workspaceUrl", args.workspaceUrl);
        self.workspaceUrl = args.workspaceUrl;
      }
      

      $("#ideasCarousel").carousel({interval: 10000});
      $("#workspaceCarousel").carousel({interval: 10000});

      $("#loginButton").click(function(){
        _gaq.push(
          // Queue the tracking event
          ['_trackEvent', 'Ideas', 'Login'],
          // Queue the callback function immediately after.
          // This will execute in order.
          function() {
            // Submit the parent form
            $("#loginForm").submit();
          }
        );
      });

      $("#startRegistration").click(function(e){
        _gaq.push(
          // Queue the tracking event
          ['_trackEvent', 'Registration', 'Started'],
          // Queue the callback function immediately after.
          // This will execute in order.
          function() {
            // Submit the parent form
            $("#registrationForm").submit();
          }
        );
      });


      //console.log("registration Open", args.subNav, args.registrationOpen);

      if (!args.subNav && !args.registrationOpen){
        //console.log("closing registration");
        self.closeRegistration();
      }

      self.setSearch();
     
      timeForm.init(args.user);

      if (args.subNav !== "singleIdea"){
        donationsForm.init();
      }
      
      
      request("/bitcoin/prices", {
        handleAs: "json"
        }).then(function(prices){

          self.bitcoinPrices = prices;
          self.show();

          currency.init(prices, args.user.localCurrency);
          moneyForm.init(args.user, currency);

          allocate.init(args.user, currency);
          reportTimeForm.init(args.user);
          addProxy.init(args.user, currency, args.contacts);
          proxyAllocateForm.init(args.user, currency, args.contacts);
          proxyDeallocateForm.init(args.user);

          cancelMoneyForm.init(args.user, currency);
          cancelTimeForm.init(args.user);

          removeProxyForm.init(args.user, currency, args.contacts);

          feedbackForm.init(args.user);

  
          makePaymentForm.init(args.user, currency, args.contacts);
  
        });


    },

    closeRegistration: function(){
      var self = this;
      //console.log("registration closed");
      domClass.add(dom.byId("registrationFormContainer"), "hide");
      domClass.remove(dom.byId("registrationClosedMessage"), "hide");


      $(function() {
        $('#requestSignupButton').click(function(e) {
          var _csrf = $('#addIdea_csrf').val();
          //console.log("clicked", _csrf);
          var email = $("#request-signup-email").val()
            , fullname = $("#request-signup-fullname").val();
          // Prevent the form from submitting with the default action

          $.ajax( {
          url: '/requestInvite',
          type: 'post',
          data: {email: email, fullname: fullname},
          headers: {
              "X-CSRF-Token":  _csrf//for object property name, use quoted notation shown in second
          },
          dataType: 'json',
          success: function( res )
          {
            //self.model.timeline.notify(idea);
            //topic.publish("coordel/addIdea", idea);
            //console.log("res", res);
            domClass.add(dom.byId("requestInviteForm"), "hide");
            domClass.remove(dom.byId("requestInviteSuccessMessage"), "hide");
            
            domClass.add(dom.byId("closedRegistrationAlert"), "hide");
          }
        });
          return false;
        });
      });
    },

    setSearch: function(){
      //console.log("set search");
      $(".search-query").keyup(function(e){
        if (e.keyCode === 13){
          //console.log("submit the search", $(e.target).val());
          window.location = "/search?q=" + $(e.target).val();
        }
      });
    },

    showBlueprints: function(args){

      console.log("blueprints args", args);

      var self = this;

      donationsForm.init();

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
          options.header = "Money pledges";
          options.subNavId = "subNavMoney";
        break;
        case 'timePledged':
          options.header = "Time pledges";
          options.subNavId = "subNavTime";
        break;
        case 'proxiedToMe':
          options.header = "Proxies";
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

      //console.log("menu", self.currentMenu);

      if (self.currentMenu === "#menuCoordel"){
        //console.log("init features", self.workspaceUrl);
        features.init(self.workspaceUrl);
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
        /*
        $("#menuIdeas").removeClass("active");
        $("#menuStream").removeClass("active");
        $("#menuCoordel").removeClass("active");
        $("#menuBlueprints").removeClass("active");
        $("#menuMe").removeClass("active");
        $(selector).addClass("active");
        */
      }

      setMenu(this.currentMenu);

      var socket = io.connect(window.location.host);

      //register for socketio events
      socket.on("idea", function (idea) {
        //console.log("SOCKET IDEA", idea);
        self.model.timeline.notify(idea);
        topic.publish("coordel/addIdea", idea);
      });

      socket.on("stream", function(item){
        //console.log("SOCKET REPLY", item);
        topic.publish("coordel/stream", item);
      });

      if (self.user){
        socket.on("miniProfile:"+self.user.appId, function(item){
          //console.log("SOCKET miniProfile", item);
          self.model.miniProfile = item;
          if (self.currentMenu === "#menuMe"){
            self.setUserNav();
          }
          topic.publish("coordel/miniProfile", item);
        });

        socket.on("supportAccount:"+self.user.appId, function(item){
          //console.log("SOCKET account", item);
          self.model.currentUser.account = item;
          topic.publish("coordel/supportAccount", item);
        });

        socket.on("supporting:"+self.user.appId, function(item){
          topic.publish("coordel/supportIdea", item);
        });

        socket.on("contact:"+self.user.appId, function(item){
          //console.log("got a new contact", item);
          ideaId = item.ideaId;
          contact = item.contact;
          self.model.contacts.push(contact);
          topic.publish("coordel/addIdeaContact", item);
        });

        socket.on("twitter:"+self.user.appId, function(account){
          //console.log("got twitter auth", account);
          self.model.currentUser.app.twitterToken = account.token;
          self.model.currentUser.app.twitterTokenSecret = account.tokenSecret;
          topic.publish("coordel/twitterAuthorize", account);
        });

        socket.on("coinbase:"+self.user.appId, function(account){
          //console.log("got coinbase auth", account);
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

        self.showPointers();
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

    showPointers: function(){
      var self=this;
      //console.log("show pointers", self.pointers);

      array.forEach(self.pointers, function(item){
        new pointer({pointer: item}).placeAt("pointers");
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

      //console.log("options", options);

      var i = new idea(options).placeAt("stream-items-container");

      i.expand();


    },

    showContacts: function(){

      var self = this
        , contacts = this.contacts;

      //console.log("contacts", contacts, self.user.contacts);

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



      function showIdea(item){

        

        var options = {
          idea: item,
          currentUser: self.model.currentUser,
          contacts: self.model.contacts,
          bitcoinPrices: self.bitcoinPrices
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
          //console.log("idea name", idea.name);
          i = new idea(options).placeAt("stream-items-container", "last");
        } else {
          i =
        }*/
      }

      array.forEach(ideas, function(item){
        showIdea(item);
        /*
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
        */
        /*
        if (args && args.unsorted){
          //console.log("idea name", idea.name);
          i = new idea(options).placeAt("stream-items-container", "last");
        } else {
          i =
        }*/
      });


      var _renderItem = function(item) {
        showIdea(item);
      };

      //console.log("doing the infinite scroll");

      $('#stream-items-container').infinitescroll({

        // callback   : function () { //console.log('using opts.callback'); },
        navSelector   : "#scrollNext",
        nextSelector  : "#scrollNext",
        itemSelector  : "#stream-items-container .idea",
        loading: {
          finished: undefined,
          finishedMsg: "",
          img: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
          msg: null,
          msgText: "",
          selector: null,
          speed: 'fast',
          start: undefined
        },
        state: {
          currPage: 0
        },
        debug     : false,
        dataType    : 'json',
        extraScrollPx: 200,
        path: function(pageNumber) {
          //console.log("pagenumber", pageNumber);
          return "/ideas/timeline/" + pageNumber;
        } ,
        //behavior    : 'twitter',
        appendCallback  : false // USE FOR PREPENDING
        //pathParse      : function( pathStr, nextPage ){ return pathStr.replace('2', nextPage ); }
      }, function( response, opts ) {
        //console.log("response, opts", response, opts);
        var jsonData = response.results;

        //console.log("isDone", opts.state.isDone);
           
            var newElements = "";
                //var newItems = new Array();
            for(var i=0;i<jsonData.length;i++) {
                  var item = $(_renderItem(jsonData[i]));
                  //item.css({ opacity: 0 });
                  //$theCntr.append(item);
                  //newItems.push(item.attr('id'));
            }
                //_addMasonryItem(newItems);
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