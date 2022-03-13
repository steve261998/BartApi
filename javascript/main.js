$(document).ready(function () {
    let timesVisited = localStorage.getItem('timesVisited');
    timesVisited = timesVisited === undefined ? 0 : Number(timesVisited);

    if (timesVisited > 0) {
        $("#visitNum").html(timesVisited);
        $("#visitAlert").show();
    }

    localStorage.setItem('timesVisited', timesVisited + 1);
    // console.log('Times visited');
    // console.log(timesVisited);
});

let map;
var directionsService;
var directionsDisplay;

function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    var scu = new google.maps.LatLng(37.349646, -121.9411762);
    var mapRequest = {
        zoom: 8,
        center: scu
    }

    var map = new google.maps.Map(document.getElementById('map'), mapRequest);
    directionsRenderer.setMap(map);
}

// WARM
// 37.5015843
// -121.93905

// Embarcadero
// 37.7929017
// -122.399199

function calcRoute(orginLat, originLng, destinationLat, destinationLng) {
    var request = {
        origin: { lat: orginLat, lng: originLng },
        destination: { lat: destinationLat, lng: destinationLng },
        travelMode: 'TRANSIT'
    };
    directionsService.route(request, function (result, status) {
        if (status == 'OK') {
            directionsRenderer.setDirections(result);
        } else {
            window.alert('Errors with maps ' + status);
        }
    });
}