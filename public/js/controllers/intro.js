var IntroController = {
    init: function(args) {
        console.log("Controller init", args, ich);
        this.model = new models.AppIdeasModel();

        this.ideasView = new AppIdeasView({model: this.model});

        console.log("ideaView", this.ideasView);

        //this.model.ideas.refresh(args.ideas);

        this.ideasView.model.ideas.reset(args.ideas);

      

        /*

        get nav

        get mini profile

        get ideas



        */

        /*
        this.socket = new io.Socket(null, {port: 8000});
        var mysocket = this.socket;

        
        this.view = new AppIdeasView({model: this.model, socket: this.socket, el: $('#content')});
        var view = this.view;

        this.socket.on('message', function(msg) {view.msgReceived(msg);});
        this.socket.connect();

        this.view.render();

        return this;
        */
    }
};
