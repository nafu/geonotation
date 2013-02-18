var NotesApp = (function(){

  var debug = false;

  function fuzzCoords(coords){
    coords.latitude += (Math.random() - 0.5) * 0.1;
    coords.longitude += (Math.random() - 0.5) * 0.1;
  }

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
    },

    // Returns true if the Note is tagged with location data
    isGeoTagged: function(){
      return this.get('latitude') && this.get('longitude');
    },

    // Creates a url for a map pinned with this Note's location
    mapImageUrl: function(options){
      // Using Google Static Maps API
      // docs: http://code.google.com/apis/maps/documentation/staticmaps/

      var base = "http://maps.google.com/maps/api/staticmap?"
      var defaults = {
        zoom: 14,
        height: 500,
        width: 500,
        maptype: 'roadmap',
        sensor: 'false'
      }

      // Update options with defaults
      options = _.extend(defaults, options);

      // Convert {width:400, height:300} to {size: "400x300"}
      options.size = options.width + "x" + options.height;
      delete options.height;
      delete options.width;

      // Add markers to parameters to add a blue pin to the map
      var latlon = this.get('latitude') + "," + this.get('longitude');
      options.markers = "color:blue|label:X|" + latlon;

      // Center on this Note's location
      options.center = latlon;

      var url = base + $.param(options);
      return url;
    },

    distanceFromCurrent: function(){
      if(!this.isGeoTagged() || !App.currentLocation){
        return 0;
      }
      // Convert Degrees to Radians
      function toRad(n){
        return n * Math.PI / 180;
      }

      var lat1 = App.currentLocation.latitude,
          lat2 = this.get('latitude'),
          lon1 = App.currentLocation.longitude,
          lon2 = this.get('longitude');

      var R = 6371; // km
      var dLat = toRad(lat2-lat1);
      var dLon = toRad(lon2-lon1);
      var lat1 = toRad(lat1);
      var lat2 = toRad(lat2);

      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var d = R * c;
      return d;
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

  var NearestPageView = Backbone.View.extend({
    events: {
      'click .locate': 'updateLocation'
    },

    initialize: function(options){
      this.listView = options.listView;
    },

    updateLocation: function(e){
      var pageView = this;

      if('geolocation' in navigator){
        navigator.geolocation.getCurrentPosition(function(position){
          if(position && position.coords){
            // Set Current Location
            App.currentLocation = position.coords;
            pageView.listView.collection.sort();
            pageView.listView.collection.fetch();
          }
        });
      }
    }
  });

  // Views
  var NewFormView = Backbone.View.extend({
    events: {
      "submit form": "createNote"
    },

    createNote: function(e){
      var attrs = this.getAttributes();
      var note = new Note();

      function create(){
        note.set(attrs);
        note.save();

        // Stop browser from actually submitting the form
        e.preventDefault();
        // Stop jQuery Mobile from doing its form magic
        e.stopPropagation();

        // Close
        $('.ui-dialog').dialog('close');
        this.reset();
      }

      if(attrs.locate == 'yes' && 'geolocation' in navigator) {
        // Do geolocate
        navigator.geolocation.getCurrentPosition(function(position){
          // Handle Our Geolocation Results
          if(position && position.coords){
            attrs.latitude = position.coords.latitude;
            attrs.longitude = position.coords.longitude;
          }

          if(debug){
            fuzzCoords(attrs);
          }

          create();
        });
      }else{
        // save
        create();
      }
    },

    getAttributes: function(){
      return {
        title: this.$('form [name=title]').val(),
        body: this.$('form [name=body]').val(),
        locate: this.$('form [name=locate]').val(),
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
      this.collection.bind('reset', this.addAll);

      this.collection.fetch();
    },

    addOne: function(note){
      var view = new NoteListItemView({model: note});
      $(this.el).append(view.render().el);

      if('mobile' in $){
        $(this.el).listview('refresh');
      }
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

  // Container for NoteDetailView
  // Respansible for generating each NoteDetailView
  var NoteDetailList = Backbone.View.extend({
    el: $('body'),

    initialize: function(){
      _.bindAll(this, 'addOne', 'addAll');

      this.collection.bind('add', this.addOne);
      this.collection.bind('reset', this.addAll);

      this.collection.fetch();
    },

    addOne: function(note){
      var view = new NoteDetailView({model: note});
      $(this.el).append(view.render().el);

      if('mobile' in $){
        $.mobile.initializePage();
      }
    },

    addAll: function(){
      $('div[id="note_"]').remove();
      this.collection.each(this.addOne);
    }
  });

  // Show Page
  var NoteDetailView = Backbone.View.extend({
    tagName: 'DIV',
    template: _.template($('#note-detail-template').html()),

    initialize: function(){
      _.bindAll(this, 'render');

      $(this.el).attr({
        'data-role': 'page',
        'id': "note_" + this.model.id
      });
      this.model.bind('change', this.render);
    },

    render: function(){
      $(this.el).html(this.template({note: this.model}));
      return this;
    }
  });

  window.Note = Note;

  App.collections.all_notes = new NoteList(null, {
    comparator: function(note){
      return (note.get('title') || "").toLowerCase();
    }
  });

  App.collections.notes_distance = new NoteList(null, {
    comparator: function(note){
      return note.distanceFromCurrent();
    }
  });

  App.views.new_form = new NewFormView({
    el: $('#new'),
  });

  App.views.list_alphabetical = new NoteListView({
    el: $('#all_notes'),
    collection: App.collections.all_notes
  });

  App.views.notes = new NoteDetailList({
    collection: App.collections.all_notes
  });

  App.views.list_distance = new NoteListView({
    el: $('#nearest_notes'),
    collection: App.collections.notes_distance
  });

  App.views.nearest_page = new NearestPageView({
    el: $('#nearest'),
    listView: App.views.list_distance
  });

  return App;
})();