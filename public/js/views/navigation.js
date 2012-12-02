$(document).ready(function(){

  function setMenu(selector){
    $("#menuIdeas, #menuStream, #menuCoordel").removeClass("active");
    $(selector).addClass("active");
  }

  //menu
  $("#menuIdeas").click(function(){
    setMenu("#menuIdeas");
    window.location.href = '/';
  });

  $("#menuStream").click(function(){
    setMenu("#menuStream");

  });

  $("#menuCoordel").click(function(){
    setMenu("#menuCoordel");
    window.location.href = 'http://coordel.com/web';
  });

  $('#sign-out').click(function(){
    $('#sign-out-form').submit();
  });

});