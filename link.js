var Route = new Meteor.Collection("route");

if (Meteor.isClient) {
  
  var routeId;
  var route;
  var idx;
  var map;
  var rendererOptions = {draggable: true};
  var directionsDisplay;
  var directionsService
  var directionsChanged = false;


  var addressLineIdGrabber = function(){
    return window.location.href.substr(window.location.href.indexOf("id=")).replace("id=","");
  }

  var addressLineContains = function(text){
    return window.location.href.indexOf(text) !== -1;
  }

  var resolveAppState = function(){
      if(addressLineContains("id=")){
        console.log("Id found. Fetching route.")
        routeId = addressLineIdGrabber();
        route = Route.find({_id:routeId})
      } else {
        routeId = Route.insert({points:[]})
        window.location.href="id="+routeId;
        console.log("No id found. Creating route.")
      }
  }


  var showPositionOnMap = function(){
   if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        pos = new google.maps.LatLng(position.coords.latitude,
                                         position.coords.longitude);
        console.log("Current position is latitude:" +position.coords.latitude + " and longitude" + position.coords.longitude);

        var infowindow = new google.maps.InfoWindow({
          map: map,
          position: pos,
          content: 'Du er her.'
        });

        route.points.push(pos); 
        Route.update({_id:route._id},route);

        map.setCenter(pos);
        map.setZoom(15);
        
      });
    } else {
      console.log("No position!");
    }
  }



  Template.menu.events({
    'click #show-me-on-the-map' : function (event) {
        console.log("Show me on the map.");
        document.getElementById("menu").className="hidden";
        showPositionOnMap();
    }
  } );


  Meteor.startup(function () {

    drawMap();
    // code to run on client at startup
    // if id is present in window.location.href
    // find points with id
    // render splash screen with participant count + show your own location.
    resolveAppState();


    // ask to share location
    // if no id is present in window.location.href
    // render splashscreen with "Start link"
    // Steps. 1. Register on map 2. Share link to friends.


  });



  var drawDirectionsOnMap = function(){
      if(directionsDisplay.getMap() === null){
        directionsDisplay.setMap(map);      
      }

        p1 = origin;
        p2 = destination;

      var request = {
        origin: p1,
        destination: p2,
        travelMode: google.maps.TravelMode.WALKING
      };

      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          lastRoute = response.routes[0].overview_path  
          directionsDisplay.setDirections(response);
        } else {
          console.log(response);
        }
      });
  }


  var drawMap = function(){
    directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
    directionsService = new google.maps.DirectionsService();

     var mapOptions = {
        zoom: 10,
        center: new google.maps.LatLng(59.8, 10.6),
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        },
        zoomControl: true,
        zoomControlOptions: {
          style: google.maps.ZoomControlStyle.SMALL
        } 
      }
      map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
      directionsDisplay.setMap(map);


    google.maps.event.addListener(directionsDisplay, 'directions_changed', function() {
      console.log("Directions changed");
      directionsChanged = true;
    });

    google.maps.event.addListener(map, 'click', function(event) {});
  }










}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
