(function () {
  /* global L */
  'use strict';

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

  var replaceAll = function(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
  };

  var translate = [
    {search: '{HEADER}',      da:'Skydevarsler', en:'Firing warnings'},
    {search: '{SOURCE}',      da:'Kilde: <a target="_new" href="http://www.soefartsstyrelsen.dk">Søfartsstyrelsen</a>', en:'Source: <a target="_new" href="http://dma.dk">Danish Maritime Authority</a>'},
    {search: '{INFORMATION}', da:'Yderligere information', en:'Further information (in Danish)'},
    {search: '{LOCAL}',       da:'lokal', en:'local'},
    {search: '{PERIOD}',      da:'Period(er)', en:'Period(s)'},
    {search: '{FROM}',        da:'Fra', en:'From'},
    {search: '{TO}',          da:'Til', en:'To&nbsp;&nbsp;'},
  ];

  var template = {
    popup       : '<div class="fwarn">' +
                    '<h1>{HEADER}</h1>'+
                    '<div class="container">' +
                      '{areas}'+
                    '</div>'+
                    '<hr>'+
                    '<p>{SOURCE}</p>'+
                  '</div>',
    area        : '<h2 class="open" {CLICK}>{name}</h2>'+
                  '<div class="area">' +
                    '<h3 class="open" {CLICK}>{PERIOD}</h3>'+
                    '<div class="inner">{periods}</div>'+
                    '<h3 class="closed" {CLICK}>{INFORMATION}</h3>'+
                    '<div class="inner">{informations}</div>'+
                  '</div>',
    period      : '<div class="detail period">' +
                    '<strong>{FROM}</strong> {warningStartTime}<br><strong>{TO}</strong> {warningEndTime}'+
                  '</div>', 
  };

  function boundingBoxAroundPolyCoords (coords) {
    var xAll = [], yAll = []

    for (var i = 0; i < coords[0].length; i++) {
      xAll.push(coords[0][i][1])
      yAll.push(coords[0][i][0])
    }

    xAll = xAll.sort(function (a,b) { return a - b })
    yAll = yAll.sort(function (a,b) { return a - b })

    return [ [xAll[0], yAll[0]], [xAll[xAll.length - 1], yAll[yAll.length - 1]] ]
  };

    
  L.GeoJSON.Fwarn = L.GeoJSON.extend({
      options: {
          language: 'en',
          timezone: 'local',
          protocol: location.protocol,
          baseurl: '//app.fcoo.dk/warnings/fwarn/fwarn_{language}.json',
          style: {
              weight: 2,
              color: "#e2007a",
              opacity: 1,
              fillColor: "#e2007a",
              fillOpacity: 0.2,
              fillRule: 'nonzero'
          }
      }, //end of options..

      initialize: function (options) {
          var that = this;
          L.setOptions(this, options);
          this._layers = {};
          // TODO: The 'en' firing warnings are in an unknown timezone
          // so for now we use the times provided by the danish firing
          // warnings.
          this.options.url = this.options.protocol  + this.options.baseurl.replace('{language}', 'da'/*this.options.language*/);

          // jqxhr is a jQuery promise to get the requested JSON data
          this.jqxhr = $.getJSON(this.options.url);
          this.jqxhr.done(function (data) {
              that.addData(data);
          });

          this.options.onEachFeature = function (feature, layer) {
              // Bind click
              layer.on({
                  click: function (evt) {
                    var body = template.body,
                        latlng = evt.latlng,
                        point = {
                          type: 'Point',
                          coordinates: [latlng.lng, latlng.lat]
                        },
                        coordinates = layer.feature.geometry.coordinates,
                        popupHTML = template.popup,
                        areasHTML = '',
                        areasHTMLFallback = '';
    
                    for (var i in coordinates) {
                      if(Object.prototype.toString.call(coordinates[i]) === '[object Array]' ) {
                        var polygon = {
                              type: 'Polygon',
                              coordinates: coordinates[i]
                            },
                            inPolygon = gju.pointInPolygon(point, polygon),
                            bbox = boundingBoxAroundPolyCoords(polygon.coordinates),
                            inBox = gju.pointInBoundingBox(point, bbox);
        
                        if (inPolygon || inBox) {
                          //Get the data and create the innerHTML (areaHTML) for the layer
                          var properties = layer.feature.properties,
                              name = properties.name[i],
                              areaHTML = template.area.replace('{name}', name);
        
                          //Append all the warning/periods
                          var periodsHTML = '';
                          for (var k in properties.warnings[i]) {
                            var warningObj = properties.warnings[i][k];
          
                            periodsHTML += template.period;
                            //periodsHTML = replaceWithDateAsHTML(periodsHTML, '{publicationTime}', warningObj.publicationTime);
                            periodsHTML = replaceWithDateAsHTML(periodsHTML, '{warningStartTime}', warningObj.warningStartTime,
                                                                that.options.language, that.options.timezone);
                            periodsHTML = replaceWithDateAsHTML(periodsHTML, '{warningEndTime}', warningObj.warningEndTime,
                                                                that.options.language, that.options.timezone);
                          }
                          areaHTML = areaHTML.replace('{periods}', periodsHTML);
        
                          //Append all information
                          var infoHTML = '';
                          for (var k in properties.textInfo[i]) {
                            var text = properties.textInfo[i][k];
                            infoHTML += '<div class="detail"><strong>' + text.header + '</strong><br>'+ text.body +'</div>';
                          } 
                          areaHTML = areaHTML.replace('{informations}', infoHTML || 'NO INFO');
              
                          if (inPolygon) {
                              areasHTML += areaHTML;
                          } else if (inBox) {
                              areasHTMLFallback += areaHTML;
                          }
            
                        } //end of if (inPolygon)..
                      }
                    }

                    // If we did not find any points in polygon we use the 
                    // bbox fallback
                    if (areasHTML == '') {
                        areasHTML = areasHTMLFallback;
                    }
                    popupHTML = popupHTML.replace('{areas}', areasHTML);
    
                    // Translate headers etc.
                    for (var i=0; i<translate.length; i++ ) {
                      var search = $(translate[i]).attr('search');
                      if (typeof search !== typeof undefined && search !== false) {
                        popupHTML = replaceAll( popupHTML, translate[i].search, translate[i][that.options.language] );
                      }
                    }
                            
                    // Add onClick to headers
                    popupHTML = replaceAll( popupHTML, '{CLICK}', 'onClick="this.className = this.className==\'open\'?\'closed\':\'open\';"' );
        
                    layer._map.openPopup(popupHTML, latlng, {maxWidth: 300, maxHeight: 240});
                  }
              }); //end of layer.on({...
          }; //end of onEachFeature..
      },

      onAdd: function (map) {
        var that = this;
        this.jqxhr.done(function (data) {
             L.GeoJSON.prototype.onAdd.call(that, map);
        });

        // Whenever the timezone is changed we will change the internal timezone
        map.on("timezonechange", function(data) {
            that.options.timezone = data.timezone;
        });
      },
  });//end of L.GeoJSON.Fwarn

  return L.GeoJSON.Fwarn;

}());


