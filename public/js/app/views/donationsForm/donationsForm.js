define(["dojo/dom"
  , "dojo/on"
  , "dojo/dom-class"
  , "dojo/topic"
  , "dojo/text!./templates/d1.html"
  , "dojo/text!./templates/d5.html"
  , "dojo/text!./templates/d10.html"
  , "dojo/text!./templates/d20.html"
  , "dojo/text!./templates/d50.html"
  , "dojo/domReady!"],

  function(dom, on, domClass, topic, d1, d5, d10, d20, d50){

  var donationsFormControl = {


    init: function(){
      var self = this;

      on(dom.byId("donate1"), "click", function(){
        self.setValue(1);
        $("#donate5").popover("hide");
        $("#donate10").popover("hide");
        $("#donate20").popover("hide");
        $("#donate50").popover("hide");
      });
      
      $("#donate1").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d1
      });

      on(dom.byId("donate5"), "click", function(){
        self.setValue(5);
        $("#donate1").popover("hide");
        $("#donate10").popover("hide");
        $("#donate20").popover("hide");
        $("#donate50").popover("hide");
      });
   
      $("#donate5").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d5
      });
    
      on(dom.byId("donate10"), "click", function(){
        self.setValue(10);
        $("#donate5").popover("hide");
        $("#donate1").popover("hide");
        $("#donate20").popover("hide");
        $("#donate50").popover("hide");
      });

      $("#donate10").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d10
      });

      on(dom.byId("donate20"), "click", function(){
        self.setValue(20);
        $("#donate5").popover("hide");
        $("#donate10").popover("hide");
        $("#donate1").popover("hide");
        $("#donate50").popover("hide");
      });

      $("#donate20").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d20
      });

      on(dom.byId("donate50"), "click", function(){
        self.setValue(50);
        $("#donate5").popover("hide");
        $("#donate10").popover("hide");
        $("#donate20").popover("hide");
        $("#donate1").popover("hide");
      });

      $("#donate50").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d50
      });

      // this identifies your website in the createToken call below
    Stripe.setPublishableKey('pk_CEEWnYHqepvKhinoNAP2PAbUXdbJ6');
 
    function stripeResponseHandler(status, response) {
      console.log("stripe respons handler", status, response);
      if (response.error) {
        $("#errorsContainer").removeClass("hide");
        // Show the errors on the form
        $('.payment-errors').text(response.error.message);
        $('.submit-button').prop('disabled', false);
      } else {
        var $form = $('#payment-form');
        // token contains id, last4, and card type
        var token = response.id;
        // Insert the token into the form so it gets submitted to the server
        $form.append($('<input type="hidden" name="stripeToken" />').val(token));
        // and submit
        $form.get(0).submit();
      }
    }
 
    $(function() {
      $('#payment-form').submit(function(event) {
        // Disable the submit button to prevent repeated clicks
        $('.submit-button').prop('disabled', true);
 
        Stripe.createToken({
          number: $('.card-number').val(),
          cvc: $('.card-cvc').val(),
          exp_month: $('.card-expiry-month').val(),
          exp_year: $('.card-expiry-year').val()
        }, stripeResponseHandler);
 
        // Prevent the form from submitting with the default action
        return false;
      });
    });

    },
    setValue: function(amount){
      dom.byId("donationsAmount").innerHTML = amount.toString();
      $("#submitAmount").val(amount.toString());
    }
  };

  return donationsFormControl;

});