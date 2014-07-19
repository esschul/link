var Route = new Meteor.Collection("route");

if (Meteor.isClient) {
  var infowindow; 
  var time;
  var route;
  var idx;
  var map;
  var rendererOptions = {draggable: true};
  var directionsDisplay;
  var directionsService
  var directionsChanged = false;

  var pos;

  var addressLineIdGrabber = function(){
    var array = window.location.href.split("/");
    console.log(array[3].length)
    if(array.length === 4 && array[3].length === 13){
      return array[3];
    } else return undefined;
  }

  var resolveAppState = function(){
      time = addressLineIdGrabber();
      console.log(time);
      if(time !== undefined){
          console.log(Route.find().count());
          route = Route.findOne({timeFld:time});
          if(route === undefined){
            console.log("Could not find route. Inserting a new. " + time )
            Route.insert({timeFld:time});
          } else {
            console.log("Route found. Set as globalvar")
          }
      } else {
        window.location.href+=new Date().getTime();
      }
  }



  var showPositionOnMap = function(){
   if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        pos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        console.log("Current position is latitude: " +position.coords.latitude + " and longitude" + position.coords.longitude);

        infowindow = new google.maps.InfoWindow({
          map: map,
          position: pos,
          content: 'Du er her.'
        });
        route = Route.findOne({timeFld:time});
        if(route.p1 === undefined){
          route.p1 = pos;
        } else if (route.p1 !== undefined && route.p2 === undefined && pos !== route.p1) {
          route.p2 = pos;
          //route.p2s.push()  SHould be able to add several subscribers to point.
        }
        Route.update({_id:route._id},route);

        map.setCenter(pos);
        map.setZoom(15);
        
      });
    } else {
      console.log("No position!");
    }
  }



  var drawDirectionsOnMap = function(p1,p2,travelMode){
      if(directionsDisplay.getMap() === null){
        directionsService = new google.maps.DirectionsService();
        directionsDisplay.setMap(map);  

      }

      if(travelMode === undefined){travelMode = google.maps.TravelMode.WALKING;}

      var request = {
      origin: p1,
      destination: p2,
      travelMode: travelMode
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

var distanceToAnyPointAsTheCrowFlies = function(p1,p2){//lat1,lon1,lat2,lon2
    var lat1=p1.B;
    var lon1=p1.k;

    var lat2=p2.B;
    var lon2=p2.k;

    var R = 6371; // km
    var φ1 = lat1.toRad();
    var φ2 = lat2.toRad();
    var Δφ = (lat2-lat1).toRad();
    var Δλ = (lon2-lon1).toRad();
    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;

    return d * 1000 // 1km = 1000m;
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
    showPositionOnMap();
  });


  var resolveTravelMode = function(distance){
    if(distance === undefined || distance < 2000) return google.maps.TravelMode.WALKING;
    if(distance > 2000) return google.maps.TravelMode.DRIVING;
  }

  var directionsUpdate = function(){
    route = Route.findOne({timeFld:time});
    console.log(route);
    if(route !== undefined && route.p1!==undefined && route.p2 != undefined){
      console.log(route);
      var p1k = route.p1.k;
      var p1B = route.p1.B;
      var p2k = route.p2.k;
      var p2B = route.p2.B;

      //var travelMode = resolveTravelMode(distanceToAnyPointAsTheCrowFlies(route.p1,route.p2));
      var travelMode;
      drawDirectionsOnMap(
        new google.maps.LatLng(p1k, p1B),
        new google.maps.LatLng(p2k, p2B),travelMode)
    }
  }

  var updateThisPosition = function(){
    console.log("updating position - start");
      if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var newPos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        console.log("Current position is latitude: " +position.coords.latitude + " and longitude" + position.coords.longitude);

        if(pos === undefined){  pos = newPos;  }

        if(pos !== newPos) {
          time = addressLineIdGrabber();
          route = Route.findOne({timeFld:time});
          if(route!==undefined){
            if(route.p1 === undefined ||  route.p1 === pos) {
              route.p1 = newPos;
            } else if(route.p1 !==  undefined && route.p2 === undefined || route.p2 === pos) {
              if(route.p1 !== newPos){
                
                route.p2 = newPos;
                console.log("Setting the route.p2: " + route.p2);
                console.log("And this is route.p1: " + route.p1);
              }
            }
            Route.update({_id:route._id},route);        
          } else {
           console.log("Route not found.") 
          }
          pos = newPos;
        }
      });
      console.log("updating position - stop")
    }
  }

  Meteor.setInterval(updateThisPosition, 10000);
  Meteor.setInterval(directionsUpdate, 10000); 
  Meteor.setTimeout(resolveAppState, 5000);
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}