define(["dojo/dom", "dojo/domReady!"], function(dom){

  var account = {
    init: function(){

      //console.log(dom.byId("loginFormTemplate").text);

      var template = dom.byId("loginFormTemplate").text;

      var v1 = "/api/v1";

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
      
      $("#submit-form").click(function(){
        if (!$("#account").valid()){
          $(this).effect("shake", { times:2 }, 500);
        }
      });
      
      $("#fullname").focus().blur();
      $("#email").focus().blur();
      $("#password").focus().blur();
      $("#username").focus().blur();

    },
    validateLogin: function(args){
      console.log('validating');
    }
  };

  return account;

});