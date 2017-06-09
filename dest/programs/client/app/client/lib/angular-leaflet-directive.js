(function(){var leafletDirective = angular.module("leaflet-directive", []);

leafletDirective.directive("leaflet", ["$http", "$log", "$parse", "$compile", "$http", "$templateCache",
function ($http, $log, $parse, $compile, $http, $templateCache) {

    var defaults = {
        maxZoom: 20,
        tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        tileLayerOptions: {
        },
        icon: {
            url: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-icon.png',
            retinaUrl: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-icon@2x.png',
            size: [25, 41],
            anchor: [12, 40],
            popup: [0, -40],
            shadow: {
                url: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-shadow.png',
                retinaUrl: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-shadow.png',
                size: [41, 41],
                anchor: [12, 40]
            }
        },
        path: {
            weight: 10,
            opacity: 1,
            color: '#0000ff'
        }
    };

    return {
        restrict: "E",
        replace: true,
        transclude: true,
        scope: {
            center: '=center',
            maxBounds: '=maxbounds',
            markers: '=markers',
            marker_template: '=markerTemplate',
            cluster: '=cluster',
            defaults: '=defaults',
            paths: '=paths'
        },
        template: '<div class="angular-leaflet-map"></div>',
        link: function ($scope, element, attrs /*, ctrl */) {
            $scope.leaflet = {};
            $scope.leaflet.maxZoom = !!(attrs.defaults && $scope.defaults && $scope.defaults.maxZoom) ? parseInt($scope.defaults.maxZoom, 10) : defaults.maxZoom;

            var map = new L.Map(element[0], {
                maxZoom: $scope.leaflet.maxZoom});
            map.setView([0, 0], 1);
            var markergroup = new L.MarkerClusterGroup();
            map.addLayer(markergroup)

            $scope.leaflet.tileLayer = !!(attrs.defaults && $scope.defaults && $scope.defaults.tileLayer) ? $scope.defaults.tileLayer : defaults.tileLayer;
            $scope.leaflet.map = !!attrs.testing ? map : 'Add testing="testing" to <leaflet> tag to inspect this object';

            // build custom options for tileLayer
            if ($scope.defaults && $scope.defaults.tileLayerOptions) {
                for (var key in $scope.defaults.tileLayerOptions) {
                    defaults.tileLayerOptions[key] = $scope.defaults.tileLayerOptions[key];
                }
            }
            var tileLayerObj = L.tileLayer(
                    $scope.leaflet.tileLayer, defaults.tileLayerOptions);
            tileLayerObj.addTo(map);
            $scope.leaflet.tileLayerObj = !!attrs.testing ?
                tileLayerObj : 'Add testing="testing" to <leaflet> tag to inspect this object';

            setupCenter();
            setupMaxBounds();
            setupPaths();
            var compiled_template
            //console.log('$scope.marker_template=',$scope.marker_template)
            if($scope.marker_template){
                $http.get($scope.marker_template,{cache:$templateCache}).success(function(template){
                    compiled_template = template ? $compile(template)($scope).get(0) : undefined
                    //console.log('tmpl',compiled_template)
                    setupMarkers(map,'markers');//markers on the map
                    setupMarkers(markergroup,'cluster');//markers on the cluster
                    map.on('popupopen',function(e){
                        //console.log(e.popup)
                        //$scope.current_marker = e.popup.current_marker
                        $scope.$broadcast('popup',e.popup.current_marker)
                        if(!$scope.$$phase&&!$scope.$root.$$phase)
                            $scope.$apply()
                    })
                })
            }else{
                console.log('specified marker-template if you need to format markers')
            }
            
            function setupMaxBounds() {
                if (!$scope.maxBounds) {
                    return;
                }
                if ($scope.maxBounds && $scope.maxBounds.southWest && $scope.maxBounds.southWest.lat && $scope.maxBounds.southWest.lng && $scope.maxBounds.northEast && $scope.maxBounds.northEast.lat && $scope.maxBounds.northEast.lng ) {
                    map.setMaxBounds(
                        new L.LatLngBounds(
                            new L.LatLng($scope.maxBounds.southWest.lat, $scope.maxBounds.southWest.lng),
                            new L.LatLng($scope.maxBounds.northEast.lat, $scope.maxBounds.northEast.lng)
                        )
                    );

                    $scope.$watch("maxBounds", function (maxBounds /*, oldValue */) {
                        if (maxBounds.southWest && maxBounds.northEast && maxBounds.southWest.lat && maxBounds.southWest.lng && maxBounds.northEast.lat && maxBounds.northEast.lng) {
                            map.setMaxBounds(
                                new L.LatLngBounds(
                                    new L.LatLng(maxBounds.southWest.lat, maxBounds.southWest.lng),
                                    new L.LatLng(maxBounds.northEast.lat, maxBounds.northEast.lng)
                                )
                            );
                        }
                    });
                }
            }

            var centerModel = {
                lat:$parse("center.lat"),
                lng:$parse("center.lng"),
                zoom:$parse("center.zoom")
            };
        
            function setupCenter() {
                $scope.$watch("center", function (center /*, oldValue */) {
                    if (!center) {
                        $log.warn("[AngularJS - Leaflet] 'center' is undefined in the current scope, did you forget to initialize it?");
                        return;
                    }
                    if (center.lat && center.lng && center.zoom) {
                        map.setView([center.lat, center.lng], center.zoom);
                    } else if (center.autoDiscover === true) {
                        map.locate({ setView: true, maxZoom: $scope.leaflet.maxZoom });
                    }
                }, true);

                map.on("dragend", function (/* event */) {
                    $scope.$apply(function (scope) {
                        centerModel.lat.assign(scope, map.getCenter().lat);
                        centerModel.lng.assign(scope, map.getCenter().lng);
                    });
                });

                map.on("zoomend", function (/* event */) {
                    if(angular.isUndefined($scope.center)){
                        $log.warn("[AngularJS - Leaflet] 'center' is undefined in the current scope, did you forget to initialize it?");
                    }
                    if (angular.isUndefined($scope.center) || $scope.center.zoom !== map.getZoom()) {
                        $scope.$apply(function (s) {
                            centerModel.zoom.assign(s,map.getZoom());
                            centerModel.lat.assign(s,map.getCenter().lat);
                            centerModel.lng.assign(s,map.getCenter().lng);
                        });
                    }
                });
            }

            function setupMarkers(layer,model_name) {
                var markers = {};
                var model = $scope.$eval(model_name)
                $scope.leaflet[model_name] = !!attrs.testing ? markers : 'Add testing="testing" to <leaflet> tag to inspect this object';

                if (!model) {
                    return;
                }

                for (var name in model) {
                    markers[name] = createMarker(name, model, model_name, layer);
                }

                $scope.$watch(model_name, function (newMarkers /*, oldMarkers*/) {
                    var l = layer
                    for (var new_name in newMarkers) {
                        if (markers[new_name] === undefined) {
                            markers[new_name] = createMarker(new_name, newMarkers, model_name, l);
                        }
                    }

                    // Delete markers from the array
                    for (var name in markers) {
                        if (newMarkers[name] === undefined) {
                            delete markers[name];
                        }
                    }

                }, true);
            }

            function createMarker(name, model, model_name, map) {
                // console.log('createMarker',name,model,model_name,map)
                var scopeMarker = model[name]
                var marker = buildMarker(scopeMarker);
                map.addLayer(marker);

                if (scopeMarker.focus === true) {
                    marker.openPopup();
                }

                marker.on("dragend", function () {
                    $scope.$apply(function (scope) {
                        scopeMarker.lat = marker.getLatLng().lat;
                        scopeMarker.lng = marker.getLatLng().lng;
                    });
                    if (scopeMarker.message) {
                        marker.openPopup();
                    }
                });

                var unreg = $scope.$watch(model_name+'.'+name, function (data, oldData) {
                    if (!data) {
                        //console.log(model_name+'.'+name,'unreg')
                        map.removeLayer(marker);
                        marker.unbindPopup()
                        marker = null
                        map = null
                        unreg()
                        return;
                    }

                    if (oldData) {
                        if (data.draggable !== undefined && data.draggable !== oldData.draggable) {
                            if (data.draggable === true) {
                                marker.dragging.enable();
                            } else {
                                marker.dragging.disable();
                            }
                        }

                        if (data.focus !== undefined && data.focus !== oldData.focus) {
                            if (data.focus === true) {
                                marker.openPopup();
                            } else {
                                marker.closePopup();
                            }
                        }

                        if (data.message !== undefined && data.message !== oldData.message) {
                            marker.bindPopup(data.message);
                        }

                        if (data.lat !== oldData.lat || data.lng !== oldData.lng) {
                            marker.setLatLng(new L.LatLng(data.lat, data.lng));
                        }
                    }
                }, true);
                return marker;
            }

            function buildMarker(data) {
                var marker = new L.marker(data,
                        {
                            icon: buildIcon(),
                            draggable: data.draggable ? true : false
                        }
                );
                if (compiled_template) {
                    var pp = L.popup()
                    pp.setContent(compiled_template)
                    pp.current_marker = data
                    marker.bindPopup(pp)
                } else if (data.message) {
                    marker.bindPopup(data.message)
                }
                return marker;
            }

            function buildIcon() {
                return L.icon({
                    iconUrl: defaults.icon.url,
                    iconRetinaUrl: defaults.icon.retinaUrl,
                    iconSize: defaults.icon.size,
                    iconAnchor: defaults.icon.anchor,
                    popupAnchor: defaults.icon.popup,
                    shadowUrl: defaults.icon.shadow.url,
                    shadowRetinaUrl: defaults.icon.shadow.retinaUrl,
                    shadowSize: defaults.icon.shadow.size,
                    shadowAnchor: defaults.icon.shadow.anchor
                });
            }

            function setupPaths() {
                var paths = {};
                $scope.leaflet.paths = !!attrs.testing ? paths : 'Add testing="testing" to <leaflet> tag to inspect this object';

                if (!$scope.paths) {
                    return;
                }

                $log.warn("[AngularJS - Leaflet] Creating polylines and adding them to the map will break the directive's scope's inspection in AngularJS Batarang");
                var lazy_create_path = _.debounce(createPath,500)
                for (var name in $scope.paths) {
                    paths[name] = lazy_create_path(name, $scope.paths[name], map);
                }

                $scope.$watch("paths", function (newPaths) {
                    for (var new_name in newPaths) {
                        if (paths[new_name] === undefined) {
                            paths[new_name] = lazy_create_path(new_name, newPaths[new_name], map);
                        }
                    }
                    // Delete paths from the array
                    for (var name in paths) {
                        if (newPaths[name] === undefined) {
                            delete paths[name];
                        }
                    }

                }, true);
            }

            function createPath(name, scopePath, map) {
                var polyline = new L.Polyline([], { weight: defaults.path.weight, color: defaults.path.color, opacity: defaults.path.opacity });

                if (scopePath.latlngs !== undefined) {
                    var latlngs = convertToLeafletLatLngs(scopePath.latlngs);
                    polyline.setLatLngs(latlngs);
                }

                if (scopePath.weight !== undefined) {
                    polyline.setStyle({ weight: scopePath.weight });
                }

                if (scopePath.color !== undefined) {
                    polyline.setStyle({ color: scopePath.color });
                }

                if (scopePath.opacity !== undefined) {
                    polyline.setStyle({ opacity: scopePath.opacity });
                }

                map.addLayer(polyline);

                var unreg = $scope.$watch('paths.' + name, function (data, oldData) {
                    if (!data) {
                        //console.log('paths.'+name,'unreg')
                        map.removeLayer(polyline);
                        polyline = null
                        map = null
                        unreg()
                        return;
                    }

                    if (oldData) {
                        if (data.latlngs !== undefined && data.latlngs !== oldData.latlngs) {
                            var latlngs = convertToLeafletLatLngs(data.latlngs);
                            polyline.setLatLngs(latlngs);
                            var bounds = new L.LatLngBounds(latlngs)
                            // if(bounds._northEast&&bounds._southWest)
                            //     setTimeout(function(){map.fitBounds(bounds)},10);//no trigger the $scope.$apply() of current turn
                        }

                        if (data.weight !== undefined && data.weight !== oldData.weight) {
                            polyline.setStyle({ weight: data.weight });
                        }

                        if (data.color !== undefined && data.color !== oldData.color) {
                            polyline.setStyle({ color: data.color });
                        }

                        if (data.opacity !== undefined && data.opacity !== oldData.opacity) {
                            polyline.setStyle({ opacity: data.opacity });
                        }
                    }
                }, true);
                return polyline;
            }

            function convertToLeafletLatLngs(latlngs) {
                var leafletLatLngs = latlngs
                    .filter(function (latlng) {
                        return !!latlng.lat && !!latlng.lng;
                    })
                    .map(function (latlng) {
                        return new L.LatLng(latlng.lat, latlng.lng);
                    });
                return leafletLatLngs;
            }
        }
    };
}]);

})();
