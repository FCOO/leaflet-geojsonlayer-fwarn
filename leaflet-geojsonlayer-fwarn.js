(function () {
    /* global L */
    'use strict';
    L.GeoJSON.Fwarn = L.GeoJSON.extend({
        options: {
            language: 'en',
            baseurl: location.protocol + '//app.fcoo.dk/warnings/fwarn/fwarn_{language}.json',
            onEachFeature: function (feature, layer) {
                // Bind click
                layer.on({
                    click: function (evt) {
                        if (feature.properties.language === 'da') {
                            var popup_template = '<div class="fwarn"><h3>Skydevarsler</h3>{warnings}<p>Kilde: <a href="http://www.soefartsstyrelsen.dk">Søfartsstyrelsen</a></p><hr/><p>{body}</p></div>';
                            var warning_template = '<p>Varsel starttid: {warningStartTime} UTC</p><p>Varsel sluttid: {warningEndTime} UTC</p><p>Publikationstid: {publicationTime} UTC</p><hr/>';
                            var body = '<h4>Yderligere information</h4>';
                        } else {
                            var popup_template = '<div class="fwarn"><h3>Firing warnings</h3>{warnings}<p>Source: <a href="http://dma.dk">Danish Maritime Authority</a></p><hr/><p>{body}</p></div>';
                            var warning_template = '<p>Warning start time: {warningStartTime} UTC</p><p>Warning end time: {warningEndTime} UTC</p><p>Publication time: {publicationTime} UTC</p><hr/>';
                            var body = '<h4>Further information (in Danish)</h4>';
                        }
                        var latlng = evt.latlng;
                        var point = {
                            type: 'Point',
                            coordinates: [latlng.lng, latlng.lat]
                        }
                        var coordinates = layer.feature.geometry.coordinates;
                        var area_template = '<h5>{name}</h5>';
                        var innerhtml = popup_template;
                        var all_warnings = '';
                        for (var i in coordinates) {
                            var polygon = {
                                type: 'Polygon',
                                coordinates: coordinates[i]
                            }
                            var inPolygon = gju.pointInPolygon(point, polygon);

                            if (inPolygon) {
                                var properties = layer.feature.properties;
                                var name = properties.name[i];
                                var area = area_template.replace('{name}', name);
                                all_warnings += area;
                                for (var k in properties.warnings[i]) {
                                    var warnings = warning_template;
                                    warnings = warnings.replace('{publicationTime}', properties.warnings[i][k].publicationTime);
                                    warnings = warnings.replace('{warningStartTime}', properties.warnings[i][k].warningStartTime);
                                    warnings = warnings.replace('{warningEndTime}', properties.warnings[i][k].warningEndTime);
                                    all_warnings += warnings;
                                }

                                var myBody = area_template.replace('{name}', properties.name[i]);
                                for (var k in properties.textInfo[i]) {
                                    var text = properties.textInfo[i][k];
                                    myBody += '<h5>' + text.header + '</h5>';
                                    myBody += '<p>' + text.body + '</p>';
                                } 
                                body += myBody + '<hr/>';
                            } 
                        }
                        innerhtml = innerhtml.replace('{warnings}', all_warnings);
                        innerhtml = innerhtml.replace('{body}', body);
                        layer._map.openPopup(innerhtml, latlng, {maxWidth: 300, maxHeight: 400});
                    }
                });
            },
            "style": {
                weight: 2,
                color: "#e2007a",
                opacity: 1,
                fillColor: "#e2007a",
                fillOpacity: 0.2,
                fillRule: 'nonzero'
            }
        },

        initialize: function (options) {
            var that = this;
            L.setOptions(this, options);
            this._layers = {};
            //this.options.url = this.options.baseurl.replace('{language}', this.options.language);
            // TODO: The 'en' firing warnings are in an unknown timezone
            // so for now we use the times provided by the danish firing
            // warnings.
            this.options.url = this.options.baseurl.replace('{language}', 'da');
        },

        onAdd: function (map) {
            var that = this;
            $.getJSON(this.options.url, function (data) {
                that.addData(data);
                L.GeoJSON.prototype.onAdd.call(that, map);
            });
        },
  });

  return L.GeoJSON.Fwarn;

}());


