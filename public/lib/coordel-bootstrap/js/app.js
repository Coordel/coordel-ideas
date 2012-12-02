$(document).ready(function () {

  $("#addIdea").tooltip({
    placement: "bottom",
    trigger: "hover"
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


  function setMenu(selector){
    $("#menuIdeas, #menuStream, #menuCoordel").removeClass("active");
    $(selector).addClass("active");
  }







});
