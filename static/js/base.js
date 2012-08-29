function fn_initSlider() {
    $("#locusSlider").slider({
        min: 0,
        max: 1439,
        values: [420, 1140],
        range: true,
        slide: function (event, ui) {
            var str_slideVal1 = fn_slideValToTimeVal(ui.values[0]);
            var str_slideVal2 = fn_slideValToTimeVal(ui.values[1]);
            $("#locusBeginSlider").val(str_slideVal1);
            $("#locusEndSlider").val(str_slideVal2);
        }
    });

    $("#locusBeginSlider").val("07:00");
    $("#locusEndSlider").val("19:00");
    $("#locusSlider").slider("option", "values", [420, 1140]);
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

function switch_map() {
    if (!window.location.origin) {
        window.location.origin = window.location.protocol + "//" + window.location.host;
    }

    if (getParameterByName("t") == "b") {
        window.location.href = window.location.origin;
    } else {
        window.location.href = window.location.origin + "/?t=b";
    }
}

var is_collecting = false;
var seq = 0;
var handler = null;

function periodical_query() {
    $.ajax({
        url: "/gpsdebug",
        type: "GET",
        data: {seq: seq, freq: $("#freq").val()},
        dataType: "json",
        success: function(data) {
            $.each(data.res, function(index, entry) {
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

function switch_collect() {
    is_collecting = !is_collecting

      if (is_collecting) {
          $("#startstop span").text("Stop!")
          seq = seq + 1;
          periodical_query();
      } else {
          $("#startstop span").text("Start!")
      }
}

function clean_log() {
    if (confirm("Clean all the logs?")) {
        $("#result tbody tr").not(":first").hide("slow", function (){
            $(this).remove();});
    }
}

function adjust_sizes() {
    var wh = $(window).height();
    var hh = $("#header").height();
    var mh = $("#map_canvas").height();
    var dh = $("#debug_info").height();
    var magic_delta = 34;

    $("#map_canvas").height(wh - hh - dh - magic_delta);
    $("#result").fixedHeaderTable("destroy");
    $("#result").fixedHeaderTable({height: 270});
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
    delta = $(this).find("td:nth-child(5)").text().split(",").map(parseFloat);

    if (!((0 < Math.abs(lon) && Math.abs(lon) < 180) &&
          (0 < Math.abs(lat) && Math.abs(lat) <  90))) {
        alert("Bad or Non-fixed point. Will not update the map." +
              "\nLon: " + lon + "\nLat: " + lat);
    } else {
        show_point(lat, lon, Math.max(delta[0], delta[1]), timestamp);
    }
});

$(function() {
    if (getParameterByName("t") == "b") {
        $("#mapswitcher").text("Switch to Google Map");
    } else {
	$("#mapswitcher").text("Switch to Baidu Map");
    }

    $("button").button();

    $("#result").fixedHeaderTable({height: 270});

    var is_debugging = true;
    $("#debug_pane legend").click(function (event) {
        if (is_debugging) {
          $("#helper").hide();
            $(this).parent().parent().height(20);
            adjust_sizes();
            $(this).html("Debug Info &#x25B2;");
        } else {
          $(this).parent().parent().height(300);
            $("#helper").show();
            adjust_sizes();
            $(this).html("Debug Info &#x25BC;");
        }
        is_debugging = !is_debugging;
    });

    adjust_sizes();
});
