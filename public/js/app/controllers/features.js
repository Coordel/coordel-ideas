define(["dojo/dom", "dojo/request", "dojo/dom-class", "dojo/json", "dojo/dom-construct", "dojo/_base/array", "dojo/io-query", "dojo/text!./features.json"],
  function(dom, request, domClass, json, node, array, ioQuery, featureSource){

  var features = {

    init: function(workspaceUrl){
      var self = this;
      var query = ioQuery.queryToObject(window.location.search.substring(1));
      self.workspaceUrl = workspaceUrl;

      var featureNode = dom.byId("previewFeatureDetails")
        , listNode = dom.byId("previewFeatureList")
        , leadNode = dom.byId("previewLead")
        , menu = dom.byId("menuCoordel");
        
        
      
      //console.log('query', query, query.p, query.f);
      featureSource = json.parse(featureSource);
      //console.log("features", featureSource);

      if (query.p && query.p === "feature"){
        //console.log("show feature", query.f);
        domClass.remove(featureNode, "hide");
        domClass.remove(menu, "active");
        domClass.add(listNode, "hide");
        domClass.add(leadNode, "hide");
        self.showFeature(query.f, featureSource.features);
      } else {
        self.showGroup("coordination", featureSource);
        self.showGroup("performance", featureSource);
      }
    },

    showFeature: function(feature, featureSource){
      var self = this;

      //console.log("feature", feature, featureSource);

      request("/support/features/"+ feature + ".html").then(
      function(html){
        var featureNode = dom.byId("feature-details-stream-items-container");
        
        featureNode.innerHTML = html;
     
      
        var source = false;
        array.forEach(featureSource, function(f){
          //console.log("f.code", f, feature);
          if (f.code === feature){
            source = f;
          }
        });
        
        if (source){
          //console.log("source", source);
          dom.byId("feature-details-container-header").innerHTML = source.title;
          dom.byId("feature-details.container-headline").innerHTML = source.headline;
        }
        
        if (source.movie){
          //console.log(dom.byId("feature-movie"));
          dom.byId("feature-movie").src = source.movie;
        } else {
          //console.log(dom.byId("feature-movie-container"));
          domClass.add(dom.byId("feature-movie-container"), "hide");
          domClass.remove(dom.byId("feature-image"), "hide");
          dom.byId("feature-image").src = source.image;
        }
          
      },
      function(error){
        //console.log("HTML not found");
      });
    },

    showGroup: function(group, source){
      var self = this;
      var steps = source.features;
      ////console.log("steps", steps);

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