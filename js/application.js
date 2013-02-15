var NotesApp = (function(){
  var App = {
    stores: {},
    views: {}
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

  window.Note = Note;

  // Views
  var NewFormView = Backbone.View.extend({
    events: {
      "submit form": "createNote"
    },

    createNote: function(e){
      console.log('createNote called');
      var attrs = this.getAttributes,
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

  window.Note = Note;

  $(document).ready(function(){
    App.views.new_form = new NewFormView({
      el: $('#new'),
    });
  });

  return App;
})();