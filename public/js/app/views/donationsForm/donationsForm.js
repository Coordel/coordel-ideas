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
      });
      
      $("#donate1").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d1
      });

      on(dom.byId("donate5"), "click", function(){
        self.setValue(5);
      });
   
      $("#donate5").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d5
      });
    
      on(dom.byId("donate10"), "click", function(){
        self.setValue(10);
      });

      $("#donate10").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d10
      });

      on(dom.byId("donate20"), "click", function(){
        self.setValue(20);
      });

      $("#donate20").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d20
      });

      on(dom.byId("donate50"), "click", function(){
        self.setValue(50);
      });

      $("#donate50").popover({
        html: true,
        placement: "bottom",
        trigger: "click",
        content: d50
      });

    },
    setValue: function(amount){
      dom.byId("donationsAmount").innerHTML = amount.toString();
    }
  };

  return donationsFormControl;

});