function fn_initSlider() {
    $("#locusSlider").slider({
        min: 0,
        max: 1439,
        values: [0, 1439],
        range: true,
        slide: function (event, ui) {
            var str_slideVal1 = fn_slideValToTimeVal(ui.values[0]);
            var str_slideVal2 = fn_slideValToTimeVal(ui.values[1]);
            $("#locusBeginSlider").val(str_slideVal1);
            $("#locusEndSlider").val(str_slideVal2);
        }
    });

    $("#locusBeginSlider").val("00:00");
    $("#locusEndSlider").val("23:59");
}

function fn_slideValToTimeVal(n_slideVal) {
    var n_hour = Math.floor(n_slideVal / 60);
    var n_minute = n_slideVal % 60;
    n_hour = n_hour < 10 ? "0"+ n_hour : n_hour;
    n_minute = n_minute < 10 ? "0"+ n_minute : n_minute;
    return n_hour + ":" + n_minute;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    if (results == null)
        return "";
    else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function gen_info(title, address, fix) {
    var $s = $("<h4/>").text(title);
    var $info = $("<ul/>");
    if (address == null) {
	address = "Geocode failed.";
    }
    $info.append($("<li/>").text("Address: " + address));
    $info.append($("<li/>").text("Lon: " + fix[2]));
    $info.append($("<li/>").text("Lat: " + fix[1]));
    $info.append($("<li/>").text("Alt: " + fix[3]));
    $info.append($("<li/>").html("&sigma; (lon, lat, alt): " +
				 [fix[5], fix[4], fix[6]].join(", ")));
    $info.append($("<li/>").text("RMS: " + fix[7]));
    $info.append($("<li/>").text("Satellites: " + fix[9]));
    $info.append($("<li/>").text("Misc: " + fix[10]));
    $info.append($("<li/>").text("Time: " + fix[8]));

    function gen_html ($obj) {
	return $('<div>').append($obj).remove().html();
    }

    return gen_html($s) + gen_html($info);
}

var is_gps_type_changed = false;
var is_collecting = false;
var seq = 0;

function periodical_query() {
    var data = {seq: seq, freq: $("#freq").val()};

    if (is_gps_type_changed) {
	data["start"] = $("#gpstype").val();
    }

    $.ajax({
        url: "/gpsdebug",
        type: "GET",
        data: data,
        dataType: "json",
        success: function(data) {
	    if ((typeof data.start != "undefined") && (data.start)) {
		is_gps_type_changed = false;
		$("#gpsinfo").text($("#gpstype option:selected").text() + " Done").removeClass("dark-info");
	    }

            $.each(data.fixes, function(index, entry) {
                $s = $("<tr/>")
                var segs =[[entry.timestamp],
                           [entry.lon],
                           [entry.lat],
                           [entry.alt],
                           [entry.std_lon, entry.std_lat, entry.std_alt],
                           [entry.range_rms],
                           [entry.satellites.replace(/,/g, ", ")],
                           [entry.misc]];
                for (i in segs) {
                    $s.append($("<td/>").text(segs[i].join(", ")));
                }
                var ow = $("#result").width();
                $s.appendTo("#result tbody");
                if ($("#result").width() > ow) {
                    adjust_sizes();
                }
                if ($("#scrollinfo").is(":checked")) {
                    var last_row = $("#result tbody tr").last();
                    $(".fht-tbody").animate({scrollTop:
                      $(".fht-tbody").scrollTop() + last_row.position().top});
                }
            });
        },
        complete: function(a, b) {
            if (is_collecting) {
                // query more frequently than the terminal reports
                setTimeout(periodical_query, parseInt($("#freq").val()) * 500);
            }
        }
    });
}

function adjust_sizes() {
    var wh = $(window).height();
    var hh = $("#header").height();
    var mh = $("#map_canvas").height();
    var dh = $("#debug_info").height();
    var $log = $("#log");
    var $helper = $("#helper");
    // TODO: I do not know why we need the magic, perhaps it comes
    // from hidden paddings and margins.
    var magic = 14;

    $helper.height(dh - 20); // TODO: magic
    $log.width($helper.width() - $("#leftcontroller").width() -
	       25); // TODO: magic, need revise
    $log.height($helper.height() + Math.abs(parseInt($log.css('margin-top'))));

    $("#map_canvas").height(wh - hh - dh - magic);
    $("#result").fixedHeaderTable("destroy");
    $("#result").fixedHeaderTable({height: $log.height()});
}

$(window).resize(adjust_sizes);

var light = null;
$("#result tbody tr").live("click", function(){
    if ($("#result tbody tr").index(this) == 0) {
        return;
    }
    if (light) {
        light.children().removeClass("selected");
    }
    light = $(this);
    $(this).children().addClass("selected");

    timestamp = $(this).find("td:nth-child(1)").text();
    lon = parseFloat($(this).find("td:nth-child(2)").text());
    lat = parseFloat($(this).find("td:nth-child(3)").text());
    alt = parseFloat($(this).find("td:nth-child(4)").text());
    delta = $(this).find("td:nth-child(5)").text().split(",").map(parseFloat);
    rms = $(this).find("td:nth-child(6)").text();
    satellites = $(this).find("td:nth-child(7)").text();
    misc = $(this).find("td:nth-child(8)").text();

    if (!((0 < Math.abs(lon) && Math.abs(lon) < 180) &&
          (0 < Math.abs(lat) && Math.abs(lat) <  90))) {
        alert("Bad or Non-fixed point. Will not update the map." +
              "\nLon: " + lon + "\nLat: " + lat);
    } else {
        show_point([0, // NOTE: mobile is useless now
		    lat, lon, alt,
		    delta[0], delta[1], delta[2], // std_lat, lon, alt
		    rms,
		    timestamp,
		    satellites,
		    misc]);
    }
});

$(function() {
    initMap();

    $("button").button();

    if (getParameterByName("t") == "b") {
        $("#mapswitcher span").text("Switch to Google Map");
    } else {
        $("#mapswitcher span").text("Switch to Baidu Map");
    }

    $("#mapswitcher").click(function (event) {
	if (!window.location.origin) {
            window.location.origin = window.location.protocol + "//" + window.location.host;
	}

	if (getParameterByName("t") == "b") {
            window.location.href = window.location.origin;
	} else {
            window.location.href = window.location.origin + "/?t=b";
	}
    });

    $("#locusConfirm").click(function (event) {
	fn_locusConfirm();
    });

    $("#locusDate").datepicker({changeMonth: true,
                                changeYear: true,
                                yearRange: "2000:2100",
                                dateFormat: "yy-mm-dd",
                                showButtonPanel: true});
    $("#locusDate").datepicker("setDate", new Date());

    fn_initSlider();

    $("#debug_info").resizable({handles: "n",
                                ghost: true,
                                minHeight: 200,
                                resize: function (event, ui) {
                                    var $map = $("#map_canvas");
                                    $map.height($map.height() -
                                     (ui.size.height - ui.originalSize.height));
                                },
                                stop: function (event, ui) {
                                    adjust_sizes();
                                }});

    var is_debugging = true;
    var debug_info_height = 0;
    $("#debug_pane legend").click(function (event) {
        var $debug_info = $("#debug_info");
        var $helper = $("#helper");
        if (is_debugging) {
            $helper.hide();
            debug_info_height = $debug_info.height();
            $debug_info.height(26);
            $(this).html("Debug Info &#x25B2;");
        } else {
            $debug_info.height(debug_info_height);
            $helper.show();
            $(this).html("Debug Info &#x25BC;");
        }
        adjust_sizes();
        is_debugging = !is_debugging;
    });

    $("#gpscontroller").click(function (event) {
	is_gps_type_changed = true;
	$("#gpsinfo").text($("#gpstype option:selected").text() + "ing...").addClass("dark-info");
    });

    $("#startstop").click(function (event) {
	is_collecting = !is_collecting

	if (is_collecting) {
            $("#startstop span").text("Stop Log!");
	    $("#loginfo").text("Logging...");
            seq = seq + 1;
            periodical_query();
	} else {
	    $("#loginfo").empty();
	    $("#gpsinfo").empty();
            $("#startstop span").text("Start Log!")
	}
    });

    $("#cleanlog").click(function (event) {
	if (confirm("Clean all the logs?")) {
            $("#result tbody tr").not(":first").hide("slow", function (){
		$(this).remove();});
	}
    });

    adjust_sizes();
    $("#locusConfirm").trigger("click");
});
