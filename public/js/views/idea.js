$(document).ready(function(){

  $('.idea').mouseover(function(){
    $(this).find('.idea-footer-menu').removeClass('hide');
  });

  $('.idea').mouseout(function(){
    $(this).find('.idea-footer-menu').addClass('hide');
  });

});