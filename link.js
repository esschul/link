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


  var pos;

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
        route = Route.findOne({_id:routeId});
        console.log(route);
      } else {
        routeId = Route.insert({'p1':undefined, 'p2':undefined})
        window.location.href="id="+routeId;
        console.log("No id found. Creating route.")
      }
  }



  var showPositionOnMap = function(){
   if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        pos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        console.log("Current position is latitude: " +position.coords.latitude + " and longitude" + position.coords.longitude);

        var infowindow = new google.maps.InfoWindow({
          map: map,
          position: pos,
          content: 'Du er her.'
        });
        route = Route.findOne({_id:routeId});
        if(route.p1 === undefined){
          route.p1 = pos;
        } else if (route.p2 === undefined ) {
          route.p2 = pos;
        }
        Route.update({_id:route._id},route);

        map.setCenter(pos);
        map.setZoom(15);
        
      });
    } else {
      console.log("No position!");
    }
  }



  var drawDirectionsOnMap = function(p1,p2){
      if(directionsDisplay.getMap() === null){
        directionsService = new google.maps.DirectionsService();
        directionsDisplay.setMap(map);  

      }

      var request = {
        origin: p1,
        destination: p2      
      };

      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          lastRoute = response.routes[0].overview_path  
          directionsDisplay.setDirections(response);
        } else {
          console.log(request);
          console.log(status);
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



  Template.menu.events({
    'click #show-me-on-the-map' : function (event) {
        console.log("Show me on the map.");
        document.getElementById("menu").className="hidden";
        showPositionOnMap();
    }
  } );


  Meteor.startup(function () {
    drawMap();
    resolveAppState();
  });


  var directionsUpdate = function(){
    route = Route.findOne({_id:routeId});
    if(route !== undefined && route.p1!==undefined && route.p2 != undefined){
      console.log(route);
      var p1k = route.p1.k;
      var p1B = route.p1.B;
      var p2k = route.p1.k;
      var p2B = route.p1.B;


      drawDirectionsOnMap(
        new google.maps.LatLng(p1k, p1B),
        new google.maps.LatLng(p2k, p2B))
    }
  }

  var updateThisPosition = function(){
    console.log("updating position - start")
      navigator.geolocation.getCurrentPosition(function(position) {
        var newPos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        console.log("Current position is latitude: " +position.coords.latitude + " and longitude" + position.coords.longitude);

        if(pos === undefined){pos = newPos}

        if(pos !== newPos) {
          route = Route.findOne({_id:routeId});
          if(route.p1 === undefined || route.p1 === pos) {
            route.p1 = newPos;
          } else if(route.p2 === newPos) {
            route.p2 = newPos;
          }
          pos = newPos;
          Route.update({_id:route._id},route);        
        }
      });
      console.log("updating position - stop")
  }


  Meteor.setInterval(updateThisPosition,10000);
  Meteor.setInterval(directionsUpdate, 10000); 







}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
