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
    var mcOptions = {maxZoom: 19,
                     averageCenter: true};
    mc = new MarkerClusterer(map, [], mcOptions);
}

function show_point(current_fix) {
    if (polyline) {
        polyline.setMap(null);
    }

    mc.clearMarkers();

    for (i in markers) {
        markers[i].setMap(null);
    }
    markers.length = 0;

    var fix = new google.maps.LatLng(current_fix[1], current_fix[2]);
    var marker = new google.maps.Marker({
        position: fix,
        title: "Current Fix",
        map: map});

    markers.push(marker);
    fn_clickMarker(marker, current_fix);

    var circle = new google.maps.Circle({
        map: map,
        radius: Math.max(current_fix[4], current_fix[5]),
        fillColor: '#AA0000',
        fillOpacity: 0.3,
        strokeOpacity: 0.5,
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
function fn_clickMarker(mPoint, fix) {
    google.maps.event.addListener(mPoint, "click", function() {
        var geocoder = new google.maps.Geocoder();
        //TODO: cache in title
        geocoder.geocode({"latLng": mPoint.getPosition()}, function(results, status) {
	    var address = null;
	    if (status == google.maps.GeocoderStatus.OK) {
		if (results[0]) {
		    address = results[0].formatted_address;
		}
	    }

	    var info = gen_info(mPoint.getTitle(), address, fix);
            infowindow.setContent(info);
            infowindow.open(map, mPoint);
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
                fn_clickMarker(marker, data.fixes[i]);
            }
            mc.addMarkers(markers);
            map.setCenter(fixes[0]);
        }
        fn_drawLine();
    }, "json");
}
