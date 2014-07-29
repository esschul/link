  var Route = new Meteor.Collection("route");

  if (Meteor.isClient) {

    var time;
    var ip;

    var map;
    var rendererOptions = {draggable: true, preserveViewport:true, suppressMarkers: true};
    var directionsDisplayArray = [];
    var directionsService;
    var infowindow;
    var markers = [];


    var sistPosisjon;
    var nyPosisjon;





    var hentIdFraAdresseLinje = function(){
      var array = window.location.href.split("/");
      if(array.length === 4 && array[3].length === 13){
        return array[3];
      } else return undefined;
    }

    var lagUnikIdForKart = function(){
        time = hentIdFraAdresseLinje();
        if(time !== undefined){
              registrerPosisjon();
        } else {
          window.location.href+=new Date().getTime();
        }
    }


    var tegnRutePaaKartet = function(pos1,pos2,travelMode, nickOrigin, nickDestination){
        console.log("tegnRutePaaKartet: start");
        var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
        directionsDisplay.setMap(map);

        if(nickOrigin === undefined || nickOrigin.trim() ===''){ nickOrigin = 'Anonym'; }
        if(nickDestination === undefined || nickDestination.trim() ===''){ nickDestination = 'Anonym'; }

        var originLatLon = new google.maps.LatLng(pos1.k, pos1.B);
        var destinationLatLon = new google.maps.LatLng(pos2.k, pos2.B);
        
        var request = {
          origin: originLatLon,
          destination: destinationLatLon,
          travelMode: travelMode
        };

        var originMarker = new google.maps.InfoWindow({
            map: map,
            position: originLatLon,
            content: nickOrigin,
            disableAutoPan: true

        });

        var destinationMarker = new google.maps.InfoWindow({
            map: map,
            position:destinationLatLon,
            content: nickDestination,
            disableAutoPan: true
        });


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
        markers.push(originMarker);
        markers.push(destinationMarker);
        directionsDisplayArray.push(directionsDisplay)

        console.log("tegnRutePaaKartet: stopp");
    }




  // Used to resolve travel mode
  var avstand = function(p1,p2){//lat1,lon1,lat2,lon2
      if(p1===undefined || p2 ===undefined ) return 0;

      console.log("Maaler avstand mellom punktene");
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
    var hvordanSkalViReiseBasertPaa = function(avstand){
      console.log("Avstanden er paa " + avstand + " meter");
      if(avstand === undefined || avstand < 2000) {
        console.log("google.maps.TravelMode.WALKING");
        return google.maps.TravelMode.WALKING;
      }
        
      if(avstand > 35000){
        console.log("google.maps.TravelMode.TRANSIT");
        return google.maps.TravelMode.TRANSIT;
      }


      if(avstand > 2000){
        console.log("google.maps.TravelMode.DRIVING");
        return google.maps.TravelMode.DRIVING;
      }
    }


    var tegnOppKart = function(){
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


    var tegnEtPunkt = function(){
          console.log("Tegne opp et punkt");
          var destination = Route.find({time:time,main:true});
          if(destination !== undefined && origins.count() === 0){
            var latlon = new google.maps.LatLng(destination.pos.k, destination.pos.B);
            console.log("oppdaterRute : Bare et punkt. Viser det frem." );
            if(infowindow !==undefined){
              infowindow.setMap(null);  
            }
            
            infowindow = new google.maps.InfoWindow({
            map: map,
            position:latlon,
            disableAutoPan: true,
            content: 'Du er her.'
            });
            map.setCenter(latlon);
          }
    }

    
    var registrerPosisjon = function(){
      var mainNotRegistered = Route.find({time:time,main:true}).count() === 0;
      console.log(Route.find({time:time,main:true}).count());  
      console.log(mainNotRegistered);  
      var now = Date.parse(new Date());
      console.log("registrerPosisjon : start" );
      if(ip !== undefined && navigator.geolocation) {
          console.log(ip);

          var options = {
            enableHighAccuracy: true
          };

          var success = function(position) {
            console.log(position);
            nyPosisjon = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
            if(mainNotRegistered){
              console.log("registrerPosisjon : Destinasjon er ikke registrert")  
              var nick=prompt('Nick',' ');
              Route.insert({time:time,ip:ip,pos:nyPosisjon,main:mainNotRegistered,updated:now,nick:nick});  
              tegnEtPunkt();
            } else if(nyPosisjon !== sistPosisjon){
              console.log("registrerPosisjon : nyPosisjon !== sistPosisjon");
              var avs = avstand(nyPosisjon,sistPosisjon);

              if(sistPosisjon === undefined || avs > 15){
                console.log("registrerPosisjon : Ny posisjon er "+ avs + " meter unna.");
                var route = Route.findOne({time:time,ip:ip});
                if(route!==undefined){
                    console.log("registrerPosisjon : Oppdatert time+ip");
                    route.pos = nyPosisjon;
                    route.updated=now;
                    Route.update({_id:route._id},route);                

                } else {
                    console.log("registrerPosisjon : Ny deltaker!");
                    var nick=prompt('Nick',' ');
                    Route.insert({time:time,ip:ip,pos:nyPosisjon,main:mainNotRegistered,updated:now,nick:nick});  
                    console.log("registrerPosisjon: Forventer at den oppdaterer ruten.");
                }
              }
            } else {
                console.log("registrerPosisjon : Ikke oppdatert. Ny posisjon er "+ avs + " meter unna.");
            }
          }


          function error(err) {
            console.warn('ERROR(' + err.code + '): ' + err.message);
          };


          navigator.geolocation.getCurrentPosition(success, error, options);


      }
      console.log("registrerPosisjon : stopp" );
    }

    var nullstillView = function(){
      for (var i = 0; i < directionsDisplayArray.length; i++) {
        directionsDisplayArray[i].setMap(null);
      };
      for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
      };

      markers = [];
      directionsDisplayArray = [];
    }


  if (typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function() {
      return this * Math.PI / 180;
    }
  }

    Deps.autorun(function () {
        console.log("oppdaterRute : start" );

        console.log(new Date((Date.parse(new Date()))));
        console.log(new Date((Date.parse(new Date()) - 40000)));

          var destination = Route.findOne({time:time,main:true});
          var origins = Route.find({time:time,main:false});


          console.log("Destination set: ")
          console.log(destination !== undefined);
          console.log("Fant " + origins.count() + " som skal til destinasjonen");
          if(destination !== undefined && destination.pos !== undefined && origins.count() > 0){
            console.log("destination");
            console.log(destination);

            if(infowindow !== undefined){
              infowindow.setMap(null);  
            }

            var originArray = [];
            console.log("Points:");
            origins.forEach(function(origin){
              console.log(origin);
              originArray.push(origin);
            });        

            nullstillView();

            for (var i = 0; i < originArray.length; i++) {
              var pos1 = originArray[i].pos;
              var pos2 = destination.pos;
              var nickOrigin  = originArray[i].nick;
              var nickDestination  = destination.nick;
              var travelMode = hvordanSkalViReiseBasertPaa(avstand(pos1, pos2));
              tegnRutePaaKartet(pos1, pos2, travelMode, nickOrigin, nickDestination);
            };
          }

          console.log("oppdaterRute : stopp" );
        
    });


    Meteor.setInterval(registrerPosisjon, 10000);
    Meteor.setTimeout(lagUnikIdForKart, 2000);
  }

  if (Meteor.isServer) {
    Meteor.startup(function () {
      // code to run on server at startup
    });
  }