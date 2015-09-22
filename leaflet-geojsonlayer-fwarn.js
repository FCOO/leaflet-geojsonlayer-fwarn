(function () {
	/* global L */
	'use strict';

	var dateAsHTML = function( date ){
		var dateFormat = 'DD-MMM-YY HH:mm',
				m = moment.utc(date);
		return m.local().format(dateFormat) + '&nbsp;/&nbsp;' + '<em>' + m.utc().format(dateFormat) + '</em>';
	};

	var replaceWithDateAsHTML = function(str, search, date ){
		return str.replace(search, dateAsHTML( date ));
	};

	var replaceAll = function(str, find, replace) {
		return str.replace(new RegExp(find, 'g'), replace);
	};

	var translate = [
		{search: '{HEADER}',			da:'Skydevarsler', en:'Firing warnings'},
		{search: '{SOURCE}',			da:'Kilde: <a target="_new" href="http://www.soefartsstyrelsen.dk">Søfartsstyrelsen</a>', en:'Source: <a target="_new" href="http://dma.dk">Danish Maritime Authority</a>'},
		{search: '{INFORMATION}', da:'Yderligere information', en:'Further information (in Danish)'},
		{search: '{LOCAL}',				da:'lokal', en:'local'},
		{search: '{PERIOD}',			da:'Period(er) (Lokal/<em>UTC</em>)', en:'Period(s) (Locale/<em>UTC</em>)'},
		{search: '{FROM}',				da:'Fra', en:'From'},
		{search: '{TO}',					da:'Til', en:'To&nbsp;&nbsp;'},
	];

	var template = {
		popup				: '<div class="fwarn">' +
										'<h1>{HEADER}</h1>'+
										'<div class="container">' +
											'{areas}'+
										'</div>'+
										'<hr>'+
										'<p>{SOURCE}</p>'+
									'</div>',
		area				: '<h2 class="open" {CLICK}>{name}</h2>'+
									'<div class="area">' +
										'<h3 class="open" {CLICK}>{PERIOD}</h3>'+
										'<div class="inner">{periods}</div>'+
										'<h3 class="closed" {CLICK}>{INFORMATION}</h3>'+
										'<div class="inner">{informations}</div>'+
									'</div>',
		period			: '<div class="detail period">' +
										'<strong>{FROM}</strong> {warningStartTime}<br><strong>{TO}</strong> {warningEndTime}'+
									'</div>',	
	};
		
		
	L.GeoJSON.Fwarn = L.GeoJSON.extend({
		options: {
			language: 'en',
			protocol: location.protocol,
       baseurl: '//app.fcoo.dk/warnings/fwarn/fwarn_{language}.json',
       onEachFeature: function (feature, layer) {
				// Bind click
         layer.on({
					click: function (evt) { console.log(evt.target); //this.options.language
						var body = template.body,
								latlng = evt.latlng,
								point = {
									type: 'Point',
									coordinates: [latlng.lng, latlng.lat]
								},
								coordinates = layer.feature.geometry.coordinates,
								popupHTML = template.popup,
								areasHTML = '';

						for (var i in coordinates) {
							var polygon = {
										type: 'Polygon',
										coordinates: coordinates[i]
									},
									inPolygon = gju.pointInPolygon(point, polygon);

							if (inPolygon) {
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
									periodsHTML = replaceWithDateAsHTML(periodsHTML, '{warningStartTime}', warningObj.warningStartTime);
									periodsHTML = replaceWithDateAsHTML(periodsHTML, '{warningEndTime}', warningObj.warningEndTime);
								}
								areaHTML = areaHTML.replace('{periods}', periodsHTML);

								//Append all information
								var infoHTML = '';
								for (var k in properties.textInfo[i]) {
									var text = properties.textInfo[i][k];
									infoHTML += '<div class="detail"><strong>' + text.header + '</strong><br>'+ text.body +'</div>';
								} 
								areaHTML = areaHTML.replace('{informations}', infoHTML || 'NO INFO');

								areasHTML += areaHTML;

							} //end of if (inPolygon)..
						}
						popupHTML = popupHTML.replace('{areas}', areasHTML);

						//Translate headers etc.
						for (var i=0; i<translate.length; i++ )
							popupHTML = replaceAll( popupHTML, translate[i].search, translate[i][evt.target._options.language] );
										
						//Add onClick to headers
						popupHTML = replaceAll( popupHTML, '{CLICK}', 'onClick="this.className = this.className==\'open\'?\'closed\':\'open\';"' );

						layer._map.openPopup(popupHTML, latlng, {maxWidth: 700, maxHeight: 240});
					}
				}); //end of layer.on({...
			}, //end of onEachFeature..

			"style": {
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
		},

		onAdd: function (map) {
			var that = this;
			$.getJSON(this.options.url, function (data) {
				that.addData(data);
				L.GeoJSON.prototype.onAdd.call(that, map);
			});
		},
	});//end of L.GeoJSON.Fwarn

	return L.GeoJSON.Fwarn;

}());


