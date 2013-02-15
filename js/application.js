var NotesApp = (function(){
  var App = {
    stores: {},
    views: {},
    collections: {}
  };

  // Initialize localStorage Data Store
  App.stores.notes = new Backbone.LocalStorage('notes');

  var Note = Backbone.Model.extend({
    // Use localStorage datastore
    localStorage: App.stores.notes,

    initialize: function(){
      if(!this.get('title')){
        this.set({title: "Note @ " + Date() });
      };

      if(!this.get('body')){
        this.set({body: "No Content"});
      };
    }

  });

  var NoteList = Backbone.Collection.extend({
    // This collection is composed of Note objects
    model: Note,
    // Set the localStorage datastore
    localStorage: App.stores.notes,

    initialize: function(){
      var collection = this;

      this.localStorage.bind('update', function(){
        collection.fetch();
      })
    }
  });

  // Views
  var NewFormView = Backbone.View.extend({
    events: {
      "submit form": "createNote"
    },

    createNote: function(e){
      var attrs = this.getAttributes();
      note = new Note();
      note.set(attrs);
      note.save();

      // Stop browser from actually submitting the form
      e.preventDefault();
      // Stop jQuery Mobile from doing its form magic
      e.preventDefault();
      e.stopPropagation();

      // Close
      $('.ui-dialog').dialog('close');
      this.reset();
    },

    getAttributes: function(){
      return {
        title: this.$('form [name=title]').val(),
        body: this.$('form [name=body]').val(),
      }
    },

    reset: function(){
      // Normal form.reset() would be
      this.$('input, textarea').val('');
    }
  });

  // Represents a listview page displaying a collection
  // Each item is represented by a NoteListItemView
  var NoteListView = Backbone.View.extend({

    initialize: function(){
      _.bindAll(this, 'addOne', 'addAll');

      this.collection.bind('add', this.addOne);
      this.collection.bind('refresh', this.addAll);

      this.collection.fetch();
    },

    addOne: function(note){
      var view = new NoteListItemView({model: note});
      $(this.el).append(view.render().el);
    },

    addAll: function(){
      $(this.el).empty();
      this.collection.each(this.addOne);
    }
  });

  var NoteListItemView = Backbone.View.extend({
    tagName: 'LI',
    template: _.template($('#note-list-item-template').html()),

    initialize: function(){
      _.bindAll(this, 'render');

      this.model.bind('change', this.render);
    },

    render: function(){
      $(this.el).html(this.template({note: this.model}));
      return this;
    }
  });

  window.Note = Note;

  App.collections.all_notes = new NoteList();

  App.views.new_form = new NewFormView({
    el: $('#new'),
  });

  App.views.list_alphabetical = new NoteListView({
    el: $('#all_notes'),
    collection: App.collections.all_notes
  });

  return App;
})();