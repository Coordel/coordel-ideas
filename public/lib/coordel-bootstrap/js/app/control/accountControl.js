define(["dojo/domReady!"], function(){

  var account = {
    init: function(){

      $('#account').validate({
        rules: {
          name: {
            required: true
          },
          email: {
            required: true,
            email: true
          },
          password: {
            minlength: 6,
            required: true
          },
          username: {
            minlength: 2,
            required: true
          }
        },
        focusCleanup: true,
        onkeyup: false,
        messages: {
          name: {
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
        },
        unhighlight: function(label){
          $(label).closest('.control-group').removeClass('error');
        },
        success: function(label) {
          label
            .text('OK!').addClass('valid').removeClass('error');
          label
            .siblings("span").addClass("hide");
          label
            .closest('.control-group').addClass('success');

        }
      });
    }
  };

  return account;

});