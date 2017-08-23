/****************************************************************************
    leaflet-geojsonlayer-fwarn.js,

    (c) 2016, FCOO

    https://github.com/FCOO/leaflet-geojsonlayer-fwarn
    https://github.com/FCOO

****************************************************************************/

(function (L/*, window, document, undefined*/) {
    "use strict";

/*
TIME            Tid             Time
DETAILS         Detaljer        Details
PROHIBITION     Forbud          Prohibition
SIGNALS         Skydesignaler   Signals   
NOTE            Note            Note

*/

    /********************************************
    getContent( contentArray, language )
    contentArray = [] of { lang:STRING, id:content }
    Returns {id#1: content, id#2: content} 

    ********************************************/
    function getContent( contentArray, language ){
        var result = {};
        language = language || 'da';
        $.each( contentArray, function( index, langContent ){
            if (langContent.lang == language)
                $.each( langContent, function( id, value ){                              
                    result[id] = value;
                });
        });
        return result;
    }
    
    function getPart( message, type ){
        var parts = message ? message.parts : null,
            result = null;
        if (parts && $.isArray(parts))
            $.each( parts, function(index, part){
                if (part.type == type){
                    result = part;
                    return false;
                }
            });
        return result;                
    }

    var FwarnFeature = L.Class.extend({
        initialize: function (feature, geoJSON_Fwarn) {
            this.feature = feature;
            this.geoJSON_Fwarn = geoJSON_Fwarn;
        },

        updatePopup: function () {
            var options  = this.geoJSON_Fwarn.options,
                message  = this.feature.message,
                language = options.language || 'da',
                headers = {
                    TIME        : {da:'Tid',           en:'Time'},
                    DETAILS     : {da:'Detaljer',      en:'Details'},
                    PROHIBITION : {da:'Forbud',        en:'Prohibition'},
                    SIGNALS     : {da:'Skydesignaler', en:'Signals'},   
                    NOTE        : {da:'Note',          en:'Note'}
            },

            $content = $('<div/>').addClass('fwarn');

            //Append name of firing area
            $('<h4>' + getContent( message.areas[0].descs, language ).name + '</h4>').appendTo( $content );

            //Append content        
            $.each( headers, function( type, header ){
                $.each( message.parts, function( index, part ){
                    if (part.type == type)
                        $content.append(
                            $('<hr/>'),
                            $('<h4>' + header[language] + '</h4>'),
                            $('<p>' + getContent( part.descs, language ).details + '</p>')
                        );
                });
            });

            //Append source
            $content.append(
                $('<hr/>'),
                $('<p>' + 
                    (language == 'da' ?  
                        'Kilde: <a target="_new" href="http://www.soefartsstyrelsen.dk">Søfartsstyrelsen</a>' : 
                        'Source: <a target="_new" href="http://dma.dk">Danish Maritime Authority</a>' ) +                         
                  '</p>')
            );
            return $content[0];
        }
    });

  L.GeoJSON.Fwarn = L.GeoJSON.extend({
        options: {
            language: 'en',
            timezone: 'local',
            protocol: 'https:', 
            baseurl : '//niord.dma.dk/rest/public/v1/messages?dateFormat=UNIX_EPOCH&domain=niord-fe',//F_WARN

            style: {
                className  : 'path_fwarn'
            },

            filter: function(feature) {
                return feature.geometry.type == 'Polygon';
            }

        }, //end of options..

        initialize: function (options) {
            var _this = this;
            L.setOptions(this, options);
            this._layers = {};

            this.options.url = this.options.protocol  + this.options.baseurl;

            // jqxhr is a jQuery promise to get the requested JSON data
            this.jqxhr = $.getJSON(this.options.url);
            this.jqxhr.done(function (data) {

                var jsonData = {
                          "type"    : "FeatureCollection", 
                          "features": []
                    };
                $.each( data, function( index, message ){
                    var detailsPart = getPart( message, 'DETAILS' );
                    if (detailsPart && detailsPart.geometry){
                        //Save the message togheter with each feature
                        $.each( detailsPart.geometry.features, function(index, feature){
                            if (feature.geometry.type == 'Polygon'){
                                feature.message = message;
                                feature.msiOptions = _this.options;
                            }
                        });
                        jsonData.features.push(detailsPart.geometry);
                    }
                });

                //Very simple sortring jsonData after "size". Size = area of outer rectangle
                $.each( jsonData.features, function( index, featureCollection ){
                    var minLng = 999, maxLng = 999, minLat = 999, maxLat = -999;
                    featureCollection._size = 0;
                    $.each( featureCollection.features, function( index, feature ){
                        if (feature.geometry.type == 'Polygon'){
                            $.each( feature.geometry.coordinates, function( index, coordinat ){
                                $.each( coordinat, function( index, point ){
                                    minLng = Math.min( minLng, point[0] );
                                    maxLng = Math.max( maxLng, point[0] );
                                    minLat = Math.min( minLat, point[1] );
                                    maxLat = Math.max( maxLat, point[1] );
                                });
                            });
                        }
                    });
                    featureCollection._size = (maxLat - minLat) * (maxLng - minLng);
                });

                jsonData.features.sort( function( f1, f2 ){ return f2._size - f1._size; } );
                
                _this.addData(jsonData);
             });


            // Set method to perform on each feature
            var header = this.options.language == 'da' ? 'Skydevarsler' : 'Firing warnings';
              this.options.onEachFeature = function (feature, layer) {
                        var fwarnFeature = new FwarnFeature( feature, _this );
                        layer.bindPopup('', {
                            maxWidth  : 260, //320,
                            maxHeight : 260, //400,
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