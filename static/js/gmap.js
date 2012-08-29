var map = null;
var polyline = null;
var fixes = [];
var markers = [];
var mc = null;

function initMap() {
    var clientloc = google.loader.ClientLocation;
    if (!clientloc) {
        clientloc = {latitude: 39.9100, longitude: 116.4000};
    }
    var myOptions = {
        zoom: 13,
        center: (fixes.length > 0) ? fixes[0] : (new google.maps.LatLng(clientloc.latitude, clientloc.longitude)),
        scaleControl: true,
        overviewMapControl: true,
        overviewMapControlOptions: {opened: true},
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById("map_canvas"),
                              myOptions);
    var mcOptions = {maxZoom: 20,
                     averageCenter: true};
    mc = new MarkerClusterer(map, [], mcOptions);
}

function show_point(lat, lon, sigma, markertime) {
    if (polyline) {
        polyline.setMap(null);
    }
    for (i in markers) {
        markers[i].setMap(null);
    }
    markers.length = 0;

    var fix = new google.maps.LatLng(lat, lon);
    var marker = new google.maps.Marker({
        position: fix,
        title: "Current Fix",
        map: map});

    markers.push(marker);
    fn_clickMarker(marker, markertime);

    var circle = new google.maps.Circle({
        map: map,
        radius: sigma,
        fillColor: '#AA0000',
        fillOpacity: 0.5,
        strokeOpacity: 0.6,
        strokeWeight: 1,
        strokeColor: "red"});

    circle.bindTo('center', marker, 'position');
    markers.push(circle);

    map.setCenter(fix);
}

function fn_drawLine() {
    if (polyline) {
        polyline.setMap(null);
    }
        polyline = new google.maps.Polyline({
            path: fixes,
            strokeColor: "#FF0000",
            strokeOpacity: 0.5,
            strokeWeight: 2});

    polyline.setMap(map);
}

var infowindow = new google.maps.InfoWindow();
function fn_clickMarker(mPoint, tempDate) {
    google.maps.event.addListener(mPoint, "click", function() {
        var geocoder = new google.maps.Geocoder();
        //TODO: cache in title
        geocoder.geocode({"latLng": mPoint.getPosition()}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[0]) {
                    var str = mPoint.getTitle()
                        +"<ul><li>Address: "+results[0].formatted_address+"</li>"
                        +"<li>Lon: "+mPoint.getPosition().lng()+"</li>"
                        +"<li>Lat: "+mPoint.getPosition().lat()+"</li>"
                        +"<li>Time: "+tempDate+"</li></ul>";
                    infowindow.setContent(str);
                    infowindow.open(map, mPoint);
                }
            } else {
                alert("Geocode error: " + status);
            }
        });
    });
}

function fn_locusConfirm() {
    var tempDate = $("#locusDate").val().replace(/-/g, "");
    var str_begin = $("#locusBeginSlider").val().replace(/:/g, "") + "00";
    var str_end = $("#locusEndSlider").val().replace(/:/g, "") + "00";
    var str_locusDate = "/track/".concat(tempDate, str_begin) + "/".concat(tempDate, str_end);

    $.get(str_locusDate, "", function(data) {
        fixes = [];
        mc.clearMarkers();
        $("#fixnum").text(data.fixes.length);
        if (markers) {
            for (i in markers) {
                markers[i].setMap(null);
            }
            markers.length = 0;
        }

        if (data.fixes.length > 0) {
            for (var i in data.fixes) {
                fixes[i] = new google.maps.LatLng(data.fixes[i][1], data.fixes[i][2]);
                var marker = new google.maps.Marker({
                    position: fixes[i],
                    title: "Point " + i,
                    map: map});
                markers.push(marker);
                fn_clickMarker(marker, data.fixes[i][8]);
            }
            mc.addMarkers(markers);
            map.setCenter(fixes[0]);
        }
        fn_drawLine();
    }, "json");
}
