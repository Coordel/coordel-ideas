var MiniProfile = Backbone.View.extend({
  initialize: function (args) {
    _.bindAll(this, 'changeTitle');
    this.model.bind('change:title', this.changeTitle);
  },

  events: {
    'click .class': 'handleTitleClick'
  },

  render: function () {
    // "ich" is ICanHaz.js magic
    this.setElement(ich.movie(this.model.toJSON()));
    return this;
  },

  changeTitle: function () {
    this.$('.title').text(this.model.get('title'));
  },

  handleTitleClick: function () {
    alert('you clicked the title: ' + this.model.get('title'));
  }
});