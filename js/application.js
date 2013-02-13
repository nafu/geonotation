var NotesApp = (function(){
  var App = {
    stores: {}
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
  
  return App;
})();