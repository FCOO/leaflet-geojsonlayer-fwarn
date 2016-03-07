# leaflet-geojsonlayer-fwarn
>


## Description
Leaflet control for Danish Firing Warning notices. The notices are provided by the Danish Maritime Authority but this layer uses a proxy service provided by the Danish Defence Centre for Operational Oceanography.


## Installation
### bower
`bower install https://github.com/FCOO/leaflet-geojsonlayer-fwarn.git --save`

## Demo
http://FCOO.github.io/leaflet-geojsonlayer-fwarn/demo/ 

## Usage

	var fwarn = new L.GeoJSON.Fwarn({language: 'en', protocol:'https:'});
	map.addLayer(fwarn);


### options
| Id | Type | Default | Description |
| :--: | :--: | :-----: | --- |
language | string | "en" | Language code |
timezone | string | "local" | Time-zone |
style | [leaflet path](http://leafletjs.com/reference.html#path-options) | | Default: See `src\leaflet-geojsonlayer-fwarn.js `

### Methods


## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/leaflet-geojsonlayer-fwarn/LICENSE).

Copyright (c) 2015 [FCOO](https://github.com/FCOO)

## Contact information

Jesper Larsen jla@fcoo.dk


## Credits and acknowledgements


## Known bugs

## Troubleshooting

## Changelog



