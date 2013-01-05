define(["dojo/request", "dojo/json", "dojo/dom-construct", "dojo/_base/array", "dojo/text!./features.json"],function(request, json, node, array, featureSource){

  var features = {

    init: function(){
      var self = this;
     
      featureSource = json.parse(featureSource);
      console.log("features", featureSource);
      self.showGroup("coordination", featureSource);
      self.showGroup("performance", featureSource);
    },

    showGroup: function(group, source){
      var self = this;
      var steps = source.features;
      //console.log("steps", steps);

      self.onRight = true;
      
      var filtered;

      //we're in coordination, so filter for coordination
      filtered = array.filter(steps, function(item){
        return array.indexOf(source.groups[group], item.code) > -1 && array.indexOf(source.groups.suppress, item.code) === -1;
      });

      array.forEach(filtered, function(step){
        if (!step.isIntro){
          self.addFeature(step, group);
        }
      });
    },
    
    addFeature: function(step, group){
      var feature = node.create("div", {"class": "qs-content"}, group+"Features");
      var header = node.create("h4", {}, feature);
      node.create("a", {innerHTML: step.title, name: step.code, "class": "qs-link link-image", href: "?p=feature&f="+step.code}, header);
      node.create("h5", {innerHTML: step.headline, "class": "qs-headline"}, feature);
      node.create("div", {style: {clear: "both"}}, feature);
      if (self.onRight){
        node.create("img", {src: step.image, alt: step.title, style:{"float": "right", "margin-left":"6px"}, height: "140", width: "220"}, feature);
        self.onRight = false;
      } else {
        node.create("img", {src: step.image, alt: step.title, style:{ "float": "left", "margin-right":"6px"}, height: "140", width: "220"}, feature);
        self.onRight = true;
      }
      node.create("div", {innerHTML: step.content}, feature);
      node.create("div", {style: {clear: "both"}}, feature);
    }
  };

  return features;

});