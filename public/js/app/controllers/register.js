define(["dojo/dom", "dojo/dom-class", "dojo/on", "dojo/request/xhr", "dojo/domReady!"], function(dom, domClass, on, xhr){

  var account = {
    init: function(){
      var self = this;

      self._csrf = $('#addIdea_csrf').val();

      var template = dom.byId("loginFormTemplate").text;

      

      var v1 = "/api/v1";

      var reset = dom.byId('resetPasswordSaveChanges');
      if (reset){
        on(reset, 'click', function(){
          var newPass = dom.byId('resetPasswordNew').value
            , verifyPass = dom.byId('resetPasswordNewVerify').value
            , hash = decodeURIComponent(dom.byId('resetPasswordHash').value);

          //console.log("newPass", newPass, "hash", hash);


          if (newPass !== verifyPass){
            //not the same, end it
          } else {

            xhr.post('/resets', {
              data: {
                newPass: newPass,
                hash: hash
              },
              handleAs: "json",
              headers: {
                "X-CSRF-Token": self._csrf
              }
            }).then(function(res){
              window.location.href = '/';
            });


          }
          
        });
      }

      
      var resend = dom.byId('resendPasswordSubmit');
      if (resend){
        //console.log("setting submit");
        on(resend, 'click', function(e){
          //console.log("clicked", e);

          var email = dom.byId('resendEmail').value
            , username = dom.byId('resendUsername').value;

          //console.log("username", username);
          
          xhr.post('/password/resets', {
          data: {
            email: email,
            username:  username
          },
          handleAs: "json",
          headers: {
            "X-CSRF-Token": self._csrf
          }
        }).then(function(res){
            //console.log("response from post of reset", res);
            if (res.success){
              var node = dom.byId('resendPasswordSuccess');
              domClass.remove(node, 'hide');
              node.innerHTML = res.message;
            } else {
              //console.log("show the error", res.errors);
              var eNode = dom.byId('resendPasswordErrors');
              domClass.remove(eNode, 'hide');
              eNode.innerHTML = res.errors;
            }
          });
        });
      }
      
      

      $("#login").popover({
        placement: 'bottom',
        html: true,
        content: template
      });

      

      $('#account').validate({
        rules: {
          fullname: {
            required: true
          },
          email: {
            required: true,
            email: true,
            remote: {
              url: v1 + "/users/email/",
              type: "get",
              data: {
                email: function() {
                  return $("#email").val();
                }
              }
            }
          },
          password: {
            minlength: 6,
            required: true
          },
          username: {
            minlength: 2,
            required: true,
            remote: {
              url: v1 + "/users/username/",
              type: "get",
              data: {
                username: function() {
                  return $("#username").val();
                }
              }
            }
          }
        },
        focusCleanup: true,
        onkeyup: false,
        messages: {
          fullname: {
            required: "A name is required!"
          },
          email: {
            required: "An e-mail is required!",
            email: "Doesn't look like a valid e-mail"
          },
          password: {
            minlength: "Must have 6 characters!",
            required: "A password is required!"
          },
          username: {
            required: "A username is required!"
          }
        },

        highlight: function(label) {
          $(label).closest('.control-group').addClass('error');
          $(label).siblings("span").addClass("hide");

          if ($(label).siblings('label').length > 0){
            $(label).siblings('label').remove();
          }
        },
        unhighlight: function(label){
          $(label).closest('.control-group').removeClass('error');
        },
        success: function(label) {
          if(label.attr('generated')){
            if (label.closest('.controls').children('label').length > 1){
              label.remove();
            }
          }
          label
            .text('OK!').addClass('valid').removeClass('error');
          label
            .siblings("span").addClass("hide");
          label
            .closest('.control-group').addClass('success');
        }
      });

     

      $('.redeemInviteForm').validate({
        rules: {
          fullname: {
            required: true
          },
          password: {
            minlength: 6,
            required: true
          },
          username: {
            minlength: 2,
            required: true,
            remote: {
              url: v1 + "/users/username/",
              type: "get",
              data: {
                username: function() {
                  return $("#username").val();
                }
              }
            }
          }
        },
        focusCleanup: true,
        onkeyup: false,
        messages: {
          fullname: {
            required: "A name is required!"
          },
          password: {
            minlength: "Must have 6 characters!",
            required: "A password is required!"
          },
          username: {
            required: "A username is required!"
          }
        },

        highlight: function(label) {
          $(label).closest('.control-group').addClass('error');
          $(label).siblings("span").addClass("hide");

          if ($(label).siblings('label').length > 0){
            $(label).siblings('label').remove();
          }
        },
        unhighlight: function(label){
          $(label).closest('.control-group').removeClass('error');
        },
        success: function(label) {
          if(label.attr('generated')){
            if (label.closest('.controls').children('label').length > 1){
              label.remove();
            }
          }
          label
            .text('OK!').addClass('valid').removeClass('error');
          label
            .siblings("span").addClass("hide");
          label
            .closest('.control-group').addClass('success');
        }
      });

      $("#submit-form").click(function(e){
        if (!$("#account").valid()){
          $(this).effect("shake", { times:2 }, 500);
        }
      });



      $("#fullname").focus().blur();
      $("#email").focus().blur();
      $("#password").focus().keyup().blur();
      $("#username").focus().blur();

      $("#password").keyup(function(){
        var result = self.checkPassword($("#username").val(), $("#password").val());
        //console.log("password result", result);

        setStrength(result);
      });

      function setStrength(strength){
        var $node = $("#passwordStrengthIndicator");
        $node.removeClass("error");
        $node.removeClass("weak");
        $node.removeClass("okay");
        $node.removeClass("perfect");

        $node.addClass(strength);
      }

    },

    validateLogin: function(args){
      //console.log('validating');
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
    }
  };

  return account;

});