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

function adjust_log_size() {
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
    initMap();

    if (getParameterByName("t") == "b") {
        $("#mapswitcher").text("Switch to Google Map");
    } else {
        $("#mapswitcher").text("Switch to Baidu Map");
    }

    $("button").button();

    $("#locusDate").datepicker({changeMonth: true,
                                changeYear: true,
                                dateFormat: "yy-mm-dd",
                                showButtonPanel: true});
    $("#locusDate").datepicker("setDate", new Date());

    fn_initSlider();

    $("#debug_info").resizable({handles: "n",
                                ghost: true,
                                minHeight: 180,
                                resize: function (event, ui) {
                                    var $map = $("#map_canvas");
                                    $map.height($map.height() -
                                     (ui.size.height - ui.originalSize.height));
                                },
                                stop: function (event, ui) {
                                    adjust_sizes();
                                }});

    adjust_sizes();

    var is_debugging = true;
    var debug_info_height = 0;
    $("#debug_pane legend").click(function (event) {
        var $debug_info = $("#debug_info");
        var $helper = $("#helper");
        if (is_debugging) {
            $helper.hide();
            debug_info_height = $debug_info.height();
            $debug_info.height(25);
            $(this).html("Debug Info &#x25B2;");
        } else {
            $debug_info.height(debug_info_height);
            $helper.show();
            $(this).html("Debug Info &#x25BC;");
        }
        adjust_sizes();
        is_debugging = !is_debugging;
    });

    $("#locusConfirm").trigger("click");
});
