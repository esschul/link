  var Route = new Meteor.Collection("route");

  if (Meteor.isClient) {

    var linkEstablished = false;

    var time;
    var ip;

    var map;
    var rendererOptions = {draggable: true};
    var directionsDisplay;
    var directionsService

    var sistPosisjon;
    var nyPosisjon;

    var hentIdFraAdresseLinje = function(){
      var array = window.location.href.split("/");
      console.log(array[3].length)
      if(array.length === 4 && array[3].length === 13){
        return array[3];
      } else return undefined;
    }

    var lagUnikIdForKart = function(){
        time = hentIdFraAdresseLinje();
        console.log(time);
        if(time !== undefined){
            var count = Route.find({time:time}).count();
            if(count === 0){
              console.log("Could not find route. Inserting a new. " + time + " : " +ip )
              Route.insert({time:time,ip:ip});
            } else {
              console.log("Route found. Set as globalvar")
            }
        } else {
          window.location.href+=new Date().getTime();
        }
    }


    var drawDirectionsOnMap = function(pos1,pos2,travelMode){
        console.log("drawDirectionsOnMap: start");
        if(directionsDisplay.getMap() === null){
          directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
          directionsService = new google.maps.DirectionsService();
          directionsDisplay.setMap(map);  
        }

        var request = {
          origin: pos1,
          destination: pos2,
          travelMode: travelMode
        };
        
        console.log("Request is:");
        console.log(request);

        directionsService.route(request, function(response, status) {
          if (status == google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(response);
          } else {
            console.log(request);
            console.log(status);
            console.log(response);
          }
        });
        console.log("drawDirectionsOnMap: stopp");
    }




  // Used to resolve travel mode
  var avstand = function(p1,p2){//lat1,lon1,lat2,lon2
      console.log("Calculating distance");
      console.log(p1);
      console.log(p2);

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
    var resolveTravelMode = function(distance){
      console.log("Resolving distance " + distance);
      if(distance === undefined || distance < 2000) {
        console.log("google.maps.TravelMode.WALKING");
        return google.maps.TravelMode.WALKING;
      }
        
      if(distance > 2000){
        console.log("google.maps.TravelMode.TRANSIT");
        return google.maps.TravelMode.TRANSIT
      }
    }


    var tegnOppKart = function(){
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
    }


    Meteor.startup(function () {
      Meteor.http.get("http://ip-api.com/json", function(err, result) {
          if(result.content !==undefined){
            var json = JSON.parse(result.content);
            ip = json.query;
          }
      });
      tegnOppKart();
    });

    
    var registrerPosisjon = function(){
      console.log("registrerPosisjon : start" );
      if(ip !== undefined && navigator.geolocation) {
          console.log(ip);
          navigator.geolocation.getCurrentPosition(function(position) {
            nyPosisjon = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
            if(nyPosisjon !== sistPosisjon){
              if(sistPosisjon === undefined || avstand(nyPosisjon,sistPosisjon) > 15){
                console.log("registrerPosisjon : Ny posisjon mer enn 15 meter");
                sistPosisjon=nyPosisjon;  
                var route = Route.findOne({time:time,ip:ip});
                if(route!==undefined){
                    console.log("registrerPosisjon : Oppdatert time+ip");
                    route.pos = nyPosisjon;
                    Route.update({_id:route._id},route);                
                } else {
                    console.log("registrerPosisjon : Ny posisjon for time+ip");
                    Route.insert({time:time,ip:ip,pos:nyPosisjon});  
                }
              } else {
                console.log("registrerPosisjon : Ny posisjon mindre enn 15 meter");
              }
            }
          });
      }
      console.log("registrerPosisjon : stopp" );
    }


    var oppdaterRute = function(){
        console.log("oppdaterRute : start" );
        var points = Route.find({time:time});
        console.log("Fant " + points.count() + " punkter");
        if(points.count() > 1){
          var pArray = [];
          console.log("Points:");
          points.forEach(function(point){
            console.log(point);
            pArray.push(point);
          });        

          var pos1 = pArray[0].pos;
          var pos2 = pArray[1].pos;
          var travelMode = resolveTravelMode(avstand(pos1, pos2));
          drawDirectionsOnMap(pos1, pos2, travelMode);
        }
        console.log("oppdaterRute : stopp" );
    }


  if (typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function() {
      return this * Math.PI / 180;
    }
  }

    Meteor.setInterval(registrerPosisjon, 10000);
    Meteor.setInterval(oppdaterRute, 10000); 
    // lets do that when everything is loaded.
    Meteor.setTimeout(lagUnikIdForKart, 5000);
  }

  if (Meteor.isServer) {
    Meteor.startup(function () {
      // code to run on server at startup
    });
  }