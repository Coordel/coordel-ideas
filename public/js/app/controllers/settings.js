define(["dojo/dom"
    , "dojo/dom-class"
    , "dojo/on"
    , "dojo/request/xhr"
    , "dojo/topic"
    , "dojo/domReady!"], function(dom, domClass, on, xhr, topic){

  var settings = {
    init: function(args){
      var self = this;
      self.user = args.user;
      self._csrf = $('#addIdea_csrf').val();

      $(".search-query").keyup(function(e){
        if (e.keyCode === 13){
          //console.log("submit the search", $(e.target).val());
          window.location = "/search?q=" + $(e.target).val();
        }
      });

      //console.log('settings init', args);

      //set whether the user is connected to coinbase
      self.coinbaseConnected(args.user.app.coinbaseAccessToken && args.user.app.coinbaseAccessToken.length > 0);

      //set whether the user is connected to twitter
      self.twitterConnected(args.user.app.twitterToken && args.user.app.twitterToken.length > 0);

    
      dom.byId("userImage").src = args.user.imageUrl;

      self.setProfileView();

      on(dom.byId('subNavProfile'), 'click', function(){
        self.setProfileView();
      });

      on(dom.byId('subNavAccount'), 'click', function(){
        //console.log("clicked account");
        self.setAccountView();
      });

      on(dom.byId('subNavPassword'), 'click', function(){
        self.setPasswordView();
      });

      on(dom.byId('subNavConnection'), 'click', function(){
        self.setConnectionView();
      });

      
      on(dom.byId('twitterConnectedOn'), 'click', function(){
        if (!domClass.contains('twitterConnectedOn', 'active')){
          //connect to twitter
          self.connect('twitter');
        }
      });
    

      on(dom.byId('twitterConnectedOff'), 'click', function(){
        if (!domClass.contains('twitterConnectedOff', 'active')){
          self.disconnect('twitter');
        }
      });

    
      on(dom.byId('coinbaseConnectedOn'), 'click', function(){
        if (!domClass.contains('coinbaseConnectedOn', 'active')){
          //connect to coinbase
          self.connect('coinbase');
        }
      });

      on(dom.byId('coinbaseConnectedOff'), 'click', function(){
        if (!domClass.contains('coinbaseConnectedOff', 'active')){
          //disconnect from coinbase
          self.disconnect('coinbase');
        }
      });

      on(dom.byId('profileSaveChanges'), 'click', function(){
        self.saveProfile();
      });

      on(dom.byId('accountSaveChanges'), 'click', function(){
        self.saveAccount();
      });

      on(dom.byId('passwordSaveChanges'), 'click', function(){
        self.savePassword();
      });

      $("#passwordNew").keyup(function(){
        var result = self.checkPassword(self.user.username, $("#passwordNew").val());
        //console.log("password result", result);
        self.setStrength(result);
      });
    },

    setStrength: function (strength){
      var $node = $("#passwordStrengthIndicator");
      $node.removeClass("error");
      $node.removeClass("weak");
      $node.removeClass("okay");
      $node.removeClass("perfect");

      $node.addClass(strength);
    },

    savePassword: function(){
      var noMatchError = "Passwords don't match. Please try again.";

      var current = dom.byId('passwordCurrent').value
        , newPass = dom.byId('passwordNew').value
        , newPassVerify = dom.byId('passwordNewVerify').value;

      dom.byId('passwordCurrent').value = '';
      dom.byId('passwordNew').value = '';
      dom.byId('passwordNewVerify').value = '';
      this.setStrength('');


      if (newPass !== newPassVerify){
        domClass.remove(dom.byId('passwordErrorsContainer'), 'hide');
        dom.byId('passwordErrors').innerHTML = noMatchError;
      } else {
        domClass.add(dom.byId('passwordErrorsContainer'), 'hide');
        var _csrf = this._csrf;

        xhr.post('/password', {
          data: {
            current: current,
            newPass: newPass
          },
          handleAs: "json",
          headers: {
            "X-CSRF-Token": _csrf
          }
        }).then(function(res){
          if (res.success){
            domClass.remove(dom.byId('passwordSuccessContainer'), 'hide');
          } else {
            domClass.remove(dom.byId('passwordErrorsContainer'), 'hide');
            dom.byId('passwordErrors').innerHTML = res.errors;
          }
        });
      }
    },

    checkPassword: function(username, password){
      var shortPass = 'error';
      var badPass = 'weak';
      var goodPass = 'okay';
      var strongPass = 'perfect';
      var emptyPass = '';

      //console.log("username", username, "password", password);

      return passwordStrength(password, username);

      function passwordStrength(password,username)
      {
        //console.log("in function");
          score = 0;

          if (password.length === 0){ return emptyPass;}

          //password < 4
          if (password.length < 4 ) { return shortPass;}

          //password == username
          if (password.toLowerCase()==username.toLowerCase()) return badPass;

          //password length
          score += password.length * 4;
          score += ( checkRepetition(1,password).length - password.length ) * 1;
          score += ( checkRepetition(2,password).length - password.length ) * 1;
          score += ( checkRepetition(3,password).length - password.length ) * 1;
          score += ( checkRepetition(4,password).length - password.length ) * 1;

          //password has 3 numbers
          if (password.match(/(.*[0-9].*[0-9].*[0-9])/))  score += 5;

          //password has 2 sybols
          if (password.match(/(.*[!,@,#,$,%,^,&,*,?,_,~].*[!,@,#,$,%,^,&,*,?,_,~])/)) score += 5;

          //password has Upper and Lower chars
          if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/))  score += 10;

          //password has number and chars
          if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/))  score += 15;
          //
          //password has number and symbol
          if (password.match(/([!,@,#,$,%,^,&,*,?,_,~])/) && password.match(/([0-9])/)) score += 15;

          //password has char and symbol
          if (password.match(/([!,@,#,$,%,^,&,*,?,_,~])/) && password.match(/([a-zA-Z])/))  score += 15;

          //password is just a nubers or chars
          if (password.match(/^\w+$/) || password.match(/^\d+$/) )  score -= 10;

          //verifing 0 < score < 100
          if ( score < 0 )  score = 0;
          if ( score > 100 )  score = 100;

          if (score < 34 )  return badPass;
          if (score < 68 )  return goodPass;
          return strongPass;
      }


      // checkRepetition(1,'aaaaaaabcbc') = 'abcbc'
      // checkRepetition(2,'aaaaaaabcbc') = 'aabc'
      // checkRepetition(2,'aaaaaaabcdbcd') = 'aabcd'

      function checkRepetition(pLen,str) {
          res = "";
          for ( i=0; i<str.length ; i++ ) {
              repeated=true;
              for (j=0;j < pLen && (j+i+pLen) < str.length;j++)
                  repeated=repeated && (str.charAt(j+i)==str.charAt(j+i+pLen));
              if (j<pLen) repeated=false;
              if (repeated) {
                  i+=pLen-1;
                  repeated=false;
              }
              else {
                  res+=str.charAt(i);
              }
          }
          return res;
      }
    },

    saveProfile: function(){
      var fullName = dom.byId('profileName').value
        , location = dom.byId('profileLocation').value
        , localCurrency = dom.byId('profileLocalCurrency').value
        , personalLink = dom.byId('profilePersonalLink').value
        , bio = dom.byId('profileBio').value;

      var data = {
        fullName: fullName,
        location: location,
        localCurrency: localCurrency,
        personalLink: personalLink,
        bio: bio
      };

      this.save('/settings/profile', data);
    },

    saveAccount: function(){
      var email = dom.byId('accountEmail').value
        , username = dom.byId('accountUsername').value;

      var data = {
        email: email,
        username: username
      };

      this.save('/settings/account', data);
    },

    save: function(url, data){
      var _csrf = this._csrf;

      xhr.post(url, {
        data: data,
        handleAs: "json",
        headers: {
          "X-CSRF-Token": _csrf
        }
      }).then(function(res){
        
      });
    },

    disconnect: function(service){
      var self = this
        , url = '/disconnect/'+service;

      //console.log("disconnecting", service);

      xhr.get(url).then(function(res){
        //console.log("response from disconnect", res);
        if (service === 'twitter'){
          self.twitterConnected(false);
        } else if (service === 'coinbase'){
          self.coinbaseConnected(false);
        }
      });
    },

    connect: function(service){
      var width = '500';
      if (service === 'coinbase'){
        width = '980';
      }
      window.open('/connect/'+service, 'mywin','left=20,top=20,width=' + width + ',height=500,toolbar=1,resizable=0');
      return false;
    },

    hideViews: function(){
      domClass.add(dom.byId('profileSettings'), 'hide');
      domClass.remove(dom.byId('subNavProfile'), 'active');
      domClass.add(dom.byId('accountSettings'), 'hide');
      domClass.remove(dom.byId('subNavAccount'), 'active');
      domClass.add(dom.byId('passwordSettings'), 'hide');
      domClass.remove(dom.byId('subNavPassword'), 'active');
      domClass.add(dom.byId('passwordErrorsContainer'), 'hide');
       domClass.add(dom.byId('passwordSuccessContainer'), 'hide');
      domClass.add(dom.byId('connectionSettings'), 'hide');
      domClass.remove(dom.byId('subNavConnection'), 'active');

    },

    setHeader: function(title){
      dom.byId('mainColumnHeader').innerHTML = title;
    },

    setProfileView: function(){
      this.setHeader('Profile');
      this.hideViews();
      domClass.remove(dom.byId('profileSettings'), 'hide');
      domClass.add(dom.byId('subNavProfile'), 'active');
      dom.byId('profileName').value = this.user.fullName;
      dom.byId('profileLocation').value = this.user.location || '';
      dom.byId('profileLocalCurrency').value = this.user.localCurrency || 'USD';
      dom.byId('profilePersonalLink').value = this.user.personalLink || '';
      dom.byId('profileBio').value = this.user.bio || '';
    },

    setAccountView: function(){
      this.setHeader('Account');
      this.hideViews();
      domClass.remove(dom.byId('accountSettings'), 'hide');
      domClass.add(dom.byId('subNavAccount'), 'active');
      dom.byId('accountEmail').value = this.user.email;
      dom.byId('accountUsername').value = this.user.username;
    },

    setConnectionView: function(){
      this.setHeader('Connections');
      this.hideViews();
      domClass.remove(dom.byId('connectionSettings'), 'hide');
      domClass.add(dom.byId('subNavConnection'), 'active');
    },

    setPasswordView: function(){
      this.setHeader('Password');
      this.hideViews();
      domClass.remove(dom.byId('passwordSettings'), 'hide');
      domClass.add(dom.byId('subNavPassword'), 'active');
    },

    twitterConnected: function(isConnected){
      //console.log("isTwitterConnected", isConnected);
      var on = dom.byId('twitterConnectedOn')
        , off = dom.byId('twitterConnectedOff');

      domClass.remove(on, 'active');
      domClass.add(off, 'active');
      if (isConnected){
        domClass.add(on, 'active');
        domClass.remove(off, 'active');
      }
    },

    coinbaseConnected: function(isConnected){
      //console.log("isCoinbaseConnected", isConnected);
      var on = dom.byId('coinbaseConnectedOn')
        , off = dom.byId('coinbaseConnectedOff');

      domClass.remove(on, 'active');
      domClass.add(off, 'active');
      if (isConnected){
        domClass.add(on, 'active');
        domClass.remove(off, 'active');
      }
    }


  };

  return settings;

});