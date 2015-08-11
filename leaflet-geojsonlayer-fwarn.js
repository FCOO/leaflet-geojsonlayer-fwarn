(function () {
    /* global L */
    'use strict';
    L.GeoJSON.Fwarn = L.GeoJSON.extend({
        options: {
            language: 'en',
            soap: {
                url: location.protocol + '//api.fcoo.dk/ws_fwarn/services/DamsaFwarn',
                appendMethodToURL: false,
                soap12: false,
                SOAPAction: "",
                noPrefix: false,
                namespaceQualifier: 'fwar',
                namespaceURL: 'http://frv.dk/dataexchange/damsa/fwarn/', 
            }
        },

        initialize: function (options) {
            L.setOptions(this, options);
            this._layers = {};
        },

        onAdd: function (map) {
            var that = this;
            var success_activeareas = function (soapResponse) {
                var jsonResponse = soapResponse.toJSON();
                if (jsonResponse.hasOwnProperty('soap:Body')) {
                    // IE9
                    jsonResponse = jsonResponse['soap:Body']['ActiveAreasResponse']['area'];
                } else {
                    jsonResponse = jsonResponse['Body']['ActiveAreasResponse']['area'];
                }
                if (jsonResponse.constructor !== Array) {
                    jsonResponse = [jsonResponse];
                }
                // We handle warnings per area
                var activeAreasDict = {};
                for (var k in jsonResponse) {
                    if (! activeAreasDict.hasOwnProperty(jsonResponse[k].areaId)) {
                        activeAreasDict[jsonResponse[k].areaId] = [];
                    }
                    activeAreasDict[jsonResponse[k].areaId].push(jsonResponse[k]);
                }
                var activeAreas = [];
                for (var k in activeAreasDict) {
                    activeAreas.push(activeAreasDict[k]);
                }
                var geojson = {};
                geojson.type = 'FeatureCollection';
                geojson.features = [];
                var lgeojson;
                // For each active area we ask for static area information
                activeAreas.forEach(function(activeArea) {
                    var success_staticareainfo = function (soapResponse) {
                        var areaInfo = soapResponse.toJSON();
                        if (areaInfo.hasOwnProperty('soap:Body')) {
                            // IE9
                            areaInfo = areaInfo['soap:Body']['StaticAreaInfoResponse']['areaInfo'];
                        } else {
                            areaInfo = areaInfo['Body']['StaticAreaInfoResponse']['areaInfo'];
                        }
                        var newFeature = {
                            "type": "Feature",
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [[]]
                            },
                            "properties": {
                                "areaId": activeArea[0].areaId,
                                "name": activeArea[0].name,
                                "staticInfoLastModified": activeArea[0].staticInfoLastModified,
                                "textInfo": areaInfo.info.textInfo,
                            }
                        }
                        var geoPoints = areaInfo.polygon.geoPoint;
                        geoPoints.sort(function(a, b){
                            var keyA = parseInt(a.sortIndex),
                                keyB = parseInt(b.sortIndex);
                            // Compare the 2 objects
                            if (keyA < keyB) return -1;
                            if (keyA > keyB) return 1;
                            return 0;
                        }); 
                        for (var k in geoPoints) {
                            var point = geoPoints[k];
                            var coords = [parseFloat(point.lon),
                                          parseFloat(point.lat)]
                            newFeature.geometry.coordinates[0].push(coords);
                        }
                        newFeature.properties.warnings = [];
                        for (var k in activeArea) {
                            newFeature.properties.warnings.push(activeArea[k].warnings);
                        }
                        lgeojson.addData(newFeature);
                    };

                    var soapOptions = {
                        method: 'StaticAreaInfo',
                        data: {
                            language: 'danish',
                            areaId: activeArea[0].areaId
                        },
                    }
                    $.extend(soapOptions, that.options.soap);
                    soapOptions.success = success_staticareainfo;
                    soapOptions.error = function (soapResponse) {
                        // show error
                        console.log(soapResponse.toJSON());
                    };
                    $.soap(soapOptions);
                });
                if (that.options.language === 'da') {
                    var popup_template = '<div class="fwarn"><h3>Skydevarsler</h3>{warnings}<p>{body}</p></div>';
                } else {
                    var popup_template = '<div class="fwarn"><h3>Firing warnings</h3>{warnings}<p>{body}</p></div>';
                }
                lgeojson = L.geoJson(geojson, {
                    onEachFeature: function (feature, layer) {
                        // Bind click
                        layer.on({
                            click: function (evt) {
                                var layers = lgeojson.getLayers();
                                var latlng = evt.latlng;
                                var activeAreasAtPoint = leafletPip.pointInLayer(latlng, lgeojson);
                                var area_template = '<h5>{name}</h5>';
                                if (that.options.language === 'da') {
                                    var warning_template = '<p>Varsel starttid: {warningStartTime} UTC</p><p>Varsel sluttid: {warningEndTime} UTC</p><p>Publikationstid: {publicationTime} UTC</p><hr/>';
                                    var body = '<h4>Yderligere information</h4>';
                                } else {
                                    var warning_template = '<p>Warning start time: {warningStartTime} UTC</p><p>Warning end time: {warningEndTime} UTC</p><p>Publication time: {publicationTime} UTC</p><hr/>';
                                    var body = '<h4>Further information (in Danish)</h4>';
                                }
                                var innerhtml = popup_template;
                                var all_warnings = '';
                                for (var k in activeAreasAtPoint) {
                                    var myFeature = activeAreasAtPoint[k].feature;
                                    var area = area_template.replace('{name}', myFeature.properties.name);
                                    for (var k in myFeature.properties.warnings) {
                                        var warnings = warning_template;
                                        warnings = warnings.replace('{publicationTime}', myFeature.properties.warnings[k].publicationTime);
                                        warnings = warnings.replace('{warningStartTime}', myFeature.properties.warnings[k].warningStartTime);
                                        warnings = warnings.replace('{warningEndTime}', myFeature.properties.warnings[k].warningEndTime);
                                    }
                                    all_warnings += area + warnings;
                                }
                                innerhtml = innerhtml.replace('{warnings}', all_warnings);
                                for (var k in activeAreasAtPoint) {
                                    var myFeature = activeAreasAtPoint[k].feature;
                                    var myBody = area_template.replace('{name}', myFeature.properties.name);
                                    for (var kk in myFeature.properties.textInfo) {
                                        var text = myFeature.properties.textInfo[kk];
                                        myBody += '<h5>' + text.header + '</h5>';
                                        for (var ii in text.text) {
                                            var txt = text.text[ii];
                                            if (txt.length != 0) {
                                                myBody += '<p>' + txt + '</p>';
                                            }
                                        }
                                    } 
                                    body += myBody + '<hr/>';
                                }
                                innerhtml = innerhtml.replace('{body}', body);
                                map.openPopup(innerhtml, latlng, {maxWidth: 350, maxHeight: 300});
                            }
                        });
                    },
                    "style": {
                        weight: 2,
                        color: "#e2007a",
                        opacity: 1,
                        fillColor: "#e2007a",
                        fillOpacity: 0.2
                    }
                });
                map.addLayer(lgeojson);
            };

            // Make SOAP request
            var language = 'english';
            if (this.options.language === 'da') {
                var language = 'danish';
            };
            var soapOptions = {
                method: 'ActiveAreas',
                data: {
                    language: language
                },
            }
            $.extend(soapOptions, this.options.soap);
            soapOptions.success = success_activeareas;
            soapOptions.error = function (soapResponse) {
                // show error
                console.log(soapResponse.toJSON());
            };
            $.soap(soapOptions);

        },

  });

  return L.GeoJSON.Fwarn;

}());


