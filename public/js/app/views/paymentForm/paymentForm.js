define(["dojo/dom", "dojo/on", "dojo/dom-class", "dojo/domReady!"],function(dom, on, domClass){

  var paymentFormControl = {

    init: function(){
      var self = this;

      self.showInfo();
      
      //supportMoneyInfo is the layer that holds the info to show the first time
      //supportMoneyAction is the layer that has the amount and options fields
      //supportMoneyPaymentInfo holds the stripe payment form
      //supportMoneySubmit is the submit button
      //supportMoneyUnderstand is the i understand button

      on(dom.byId("supportMoneyUnderstand"), "click", function(){
        self.showNewCustomerSupport();
      });

    },

    showInfo: function(user){
      //call this function if the user doesn't have a stripe customerid yet. this is shown to each user once
      domClass.remove("supportMoneyInfo", "hide");
      domClass.add("supportMoneyAction", "hide");
      domClass.add("supportMoneyPaymentInfo", "hide");
      domClass.add("supportMoneySubmit", "hide");
    },

    showNewCustomerSupport: function(user){
      //this has the amount and stripe payment form
      domClass.add("supportMoneyInfo", "hide");
      domClass.remove("supportMoneyAction", "hide");
      domClass.remove("supportMoneyPaymentInfo", "hide");
      domClass.remove("supportMoneySubmit", "hide");
    },

    showSupport: function(user){
      domClass.add("supportMoneyInfo", "hide");
      domClass.remove("supportMoneyAction", "hide");
      domClass.add("supportMoneyPaymentInfo", "hide");
      domClass.remove("supportMoneySubmit", "hide");
    },

    validate: function(){

    },

    submit: function(){
      //if this is new, then need to create a customer entery in the stripe db

      //if this is a now payment
        //if new, create the customer and then make the minimum charge and update the bank
        //if not new, get the customer, check the bank, if funds available, updatebank, if not, charge min amount, or amount whichever
        //id greater

      //if pledge payment,
        //if new, create the customer, add the pledge
        //if not new add the pledge

    }
  };

  paymentFormControl.init();

});