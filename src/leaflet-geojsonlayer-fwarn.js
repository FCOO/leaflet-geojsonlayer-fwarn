/****************************************************************************
    leaflet-geojsonlayer-fwarn.js,

    (c) 2016, FCOO

    https://github.com/FCOO/leaflet-geojsonlayer-fwarn
    https://github.com/FCOO

****************************************************************************/

(function (L/*, window, document, undefined*/) {
    "use strict";

  var dateAsHTML = function( date, language, tz ){
    var dateFormat = 'DD-MMM-YY HH:mm',
        m = moment.utc(date),
        localTxt = language == 'da' ? 'lokal' : 'local',
        result;
    if (tz == 'local') {
        result = m.local().format(dateFormat)+ '&nbsp;('+localTxt+')';
    } else {
        result = m.utc().format(dateFormat) + '&nbsp;(UTC)';
    }
    return result;
  };

  var replaceWithDateAsHTML = function(str, search, date, language, tz ){
    return str.replace(search, dateAsHTML( date, language, tz ));
  };

    var FwarnFeature = L.Class.extend({
    initialize: function (feature, geoJSON_Fwarn) {
            this.feature = feature;
      this.geoJSON_Fwarn = geoJSON_Fwarn;
    },

        updatePopup: function ( popup ) {
            var options  = this.geoJSON_Fwarn.options,
                feature  = this.feature,
                template = options.template,
                content  = template.popup,
                text     = options.text,//[ options.language ] || options.text['da'],
                language = options.language || 'da',
                i,
                latlng   = popup.getLatLng(),
                point    = {
                    type: 'Point',
                    coordinates: [latlng.lng, latlng.lat]
                },
                coordinates = feature.geometry.coordinates,
                areasHTML = '',
                areasHTMLFallback = '';
    
            //**************************************************************
            function boundingBoxAroundPolyCoords (coords) {
                var xAll = [], yAll = [];
                for (var i = 0; i < coords[0].length; i++) {
                    xAll.push(coords[0][i][1]);
                    yAll.push(coords[0][i][0]);
                }
                xAll = xAll.sort(function (a,b) { return a - b; });
                yAll = yAll.sort(function (a,b) { return a - b; });
                return [ [xAll[0], yAll[0]], [xAll[xAll.length - 1], yAll[yAll.length - 1]] ];
            }
            //**************************************************************
            function translate( text ){
                var result = {};
                for (var id in text)
                    result[id] = text[id][language];
                return result;
            }
            
            //**************************************************************
            function insertInContent( text ){
                for (var id in text)
                content = content.replace(new RegExp('{'+id+'}', 'g'), text[id]);
            }
            //**************************************************************

            for (i in coordinates) {
                if (Object.prototype.toString.call(coordinates[i]) === '[object Array]' ) {
                    var k,
                        polygon = {
                            type: 'Polygon',
                            coordinates: coordinates[i]
                        },
                        inPolygon = window.gju.pointInPolygon(point, polygon),
                        bbox = boundingBoxAroundPolyCoords(polygon.coordinates),
                        inBox = window.gju.pointInBoundingBox(point, bbox);

                    if (inPolygon || inBox) {
                        //Get the data and create the innerHTML (areaHTML) for the layer
                        var properties = feature.properties,
                            name = properties.name[i],
                            areaHTML = template.area.replace('{name}', name),
                            periodsHTML = '';

                        //Append all the warning/periods
                        var periods = 0;
                        for (k in properties.warnings[i]) {
                            periods++;
                            var warningObj = properties.warnings[i][k];

                            periodsHTML += template.period;
                            periodsHTML = replaceWithDateAsHTML(periodsHTML, '{warningStartTime}', warningObj.warningStartTime, language, options.timezone);
                            periodsHTML = replaceWithDateAsHTML(periodsHTML, '{warningEndTime}', warningObj.warningEndTime, language, options.timezone);
                        }
                        areaHTML = areaHTML.replace('{periods}', periodsHTML);
                        if (periods > 1)
                          text.header_period = text.header_periods;

                        //Append all information
                        var infoHTML = '';
                        for (k in properties.textInfo[i]) {
                            var info = properties.textInfo[i][k];
                            infoHTML += '<div class="detail"><strong>' + info.header + '</strong><br>'+ info.body +'</div>';
                        }
                        areaHTML = areaHTML.replace('{informations}', infoHTML || 'NO INFO');
                        if (inPolygon)
                            areasHTML += areaHTML;
                        else 
                            if (inBox)
                                areasHTMLFallback += areaHTML;
                    } //end of if (inPolygon || inBox)...
                }
            } //end of for (i in coordinates)...

            // If we did not find any points in polygon we use the bbox fallback
            if (areasHTML === '') 
                areasHTML = areasHTMLFallback;

            insertInContent({ areas: areasHTML });

            // Translate headers etc.
            insertInContent( translate(text) );

            // Add onClick to headers
            insertInContent( {'click': 'onClick="this.className = this.className==\'open\'?\'closed\':\'open\';"'} );

        return content;
    }

    });

  L.GeoJSON.Fwarn = L.GeoJSON.extend({
        options: {
            language: 'en',
            timezone: 'local',
            protocol: window.location.protocol,
            baseurl: '//app.fcoo.dk/warnings/fwarn/fwarn_{language}.json',
            style: {
                weight     : 2,
                color      : "#e2007a",
                opacity    : 1,
                fillColor  : "#e2007a",
                fillOpacity: 0.2,
                fillRule   : 'nonzero'
            },
            template: {
                popup    :  '<div class="fwarn">' +
//                                '<h1>{header}</h1>'+
                                '<div class="container">' + '{areas}'+ '</div>'+
                                '<hr>'+
                                '<p>{source}</p>'+
                            '</div>',
              area      :   '<h2 class="open" {click}>{name}</h2>'+
                            '<div class="area">' +
                                '<h3 class="open" {click}>{header_period}</h3>'+
                                '<div class="inner">{periods}</div>'+
                                '<h3 class="closed" {click}>{header_information}</h3>'+
                                '<div class="inner">{informations}</div>'+
                            '</div>',
                period  :   '<div class="detail period">' +
                                '<strong>{from}</strong> {warningStartTime}<br><strong>{to}</strong> {warningEndTime}'+
                            '</div>',
            },

            text: {
                'header'            : { da:'Skydevarsler', 
                                        en:'Firing warnings'},
                'source'            : { da:'Kilde: <a target="_new" href="http://www.soefartsstyrelsen.dk">Søfartsstyrelsen</a>', 
                                        en:'Source: <a target="_new" href="http://dma.dk">Danish Maritime Authority</a>'},
                'header_information': { da:'Yderligere information', 
                                        en:'Further information (in Danish)'},
                'local'             : { da:'lokal', 
                                        en:'local'},
                'header_period'     : { da:'Periode', 
                                        en:'Period'},
                'header_periods'    : { da:'Perioder', 
                                        en:'Periods'},
                'from'              : { da:'Fra', 
                                        en:'From'},
                'to'                : { da:'Til', 
                                        en:'To&nbsp;&nbsp;'}
            }
        }, //end of options..

        initialize: function (options) {
            var _this = this;
            L.setOptions(this, options);
            this._layers = {};
            // TODO: The 'en' firing warnings are in an unknown timezone
            // so for now we use the times provided by the danish firing
            // warnings.
            this.options.url = this.options.protocol  + this.options.baseurl.replace('{language}', 'da'/*this.options.language*/);

            // jqxhr is a jQuery promise to get the requested JSON data
            this.jqxhr = $.getJSON(this.options.url);
            this.jqxhr.done(function (data) {
                _this.addData(data);
             });


      // Set method to perform on each feature
      var header = this.options.text['header'][this.options.language];
      this.options.onEachFeature = function (feature, layer) {
                var fwarnFeature = new FwarnFeature( feature, _this );
                layer.bindPopup('', {
                    maxWidth  : 320,
                    maxHeight : 400,
                    header    : header,
                    getContent: fwarnFeature.updatePopup,
                    context   : fwarnFeature
                });
      };

        },

        onAdd: function (map) {
            var _this = this;
            this.jqxhr.done(function (/*data*/) {
                L.GeoJSON.prototype.onAdd.call(_this, map);
            });

            // Whenever the timezone is changed we will change the internal timezone
            map.on("timezonechange", function(data) {
                _this.options.timezone = data.timezone;
            });
        },
  });//end of L.GeoJSON.Fwarn

  return L.GeoJSON.Fwarn;

}(L, this, document));