(function(exports) {

/*
 * tile.stamen.js v1.3.0
 */

var SUBDOMAINS = "a. b. c. d.".split(" "),
    MAKE_PROVIDER = function(layer, type, minZoom, maxZoom) {
        return {
            "url":          ["http://{S}tile.stamen.com/", layer, "/{Z}/{X}/{Y}.", type].join(""),
            "type":         type,
            "subdomains":   SUBDOMAINS.slice(),
            "minZoom":      minZoom,
            "maxZoom":      maxZoom,
            "attribution":  [
                'Map tiles by <a href="http://stamen.com/">Stamen Design</a>, ',
                'under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ',
                'Data by <a href="http://openstreetmap.org/">OpenStreetMap</a>, ',
                'under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.'
            ].join("")
        };
    },
    PROVIDERS =  {
        "toner":        MAKE_PROVIDER("toner", "png", 0, 20),
        "terrain":      MAKE_PROVIDER("terrain", "jpg", 4, 18),
        "watercolor":   MAKE_PROVIDER("watercolor", "jpg", 1, 18),
        "trees-cabs-crime": {
            "url": "http://{S}.tiles.mapbox.com/v3/stamen.trees-cabs-crime/{Z}/{X}/{Y}.png",
            "type": "png",
            "subdomains": "a b c d".split(" "),
            "minZoom": 11,
            "maxZoom": 18,
            "extent": [
                {"lat": 37.853, "lon": -122.577},
                {"lat": 37.684, "lon": -122.313}
            ],
            "attribution": [
                'Design by Shawn Allen at <a href="http://stamen.com/">Stamen</a>.',
                'Data courtesy of <a href="http://fuf.net/">FuF</a>,',
                '<a href="http://www.yellowcabsf.com/">Yellow Cab</a>',
                '&amp; <a href="http://sf-police.org/">SFPD</a>.'
            ].join(" ")
        }
    };

// set up toner and terrain flavors
setupFlavors("toner", ["hybrid", "labels", "lines", "background", "lite"]);
setupFlavors("terrain", ["background"]);
setupFlavors("terrain", ["labels", "lines"], "png");

// toner 2010
deprecate("toner", ["2010"]);

// toner 2011 flavors
deprecate("toner", ["2011", "2011-lines", "2011-labels", "2011-lite"]);

var odbl = [
    "toner",
    "toner-hybrid",
    "toner-labels",
    "toner-lines",
    "toner-background",
    "toner-lite"
];

for (var i = 0; i < odbl.length; i++) {
    var key = odbl[i];

    PROVIDERS[key].retina = true;
    PROVIDERS[key].attribution = [
        'Map tiles by <a href="http://stamen.com/">Stamen Design</a>, ',
        'under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ',
        'Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, ',
        'under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
    ].join("");
}

/*
 * Export stamen.tile to the provided namespace.
 */
exports.stamen = exports.stamen || {};
exports.stamen.tile = exports.stamen.tile || {};
exports.stamen.tile.providers = PROVIDERS;
exports.stamen.tile.getProvider = getProvider;

function deprecate(base, flavors) {
    var provider = getProvider(base);

    for (var i = 0; i < flavors.length; i++) {
        var flavor = [base, flavors[i]].join("-");
        PROVIDERS[flavor] = MAKE_PROVIDER(flavor, provider.type, provider.minZoom, provider.maxZoom);
        PROVIDERS[flavor].deprecated = true;
    }
};

/*
 * A shortcut for specifying "flavors" of a style, which are assumed to have the
 * same type and zoom range.
 */
function setupFlavors(base, flavors, type) {
    var provider = getProvider(base);
    for (var i = 0; i < flavors.length; i++) {
        var flavor = [base, flavors[i]].join("-");
        PROVIDERS[flavor] = MAKE_PROVIDER(flavor, type || provider.type, provider.minZoom, provider.maxZoom);
    }
}

/*
 * Get the named provider, or throw an exception if it doesn't exist.
 */
function getProvider(name) {
    if (name in PROVIDERS) {
        var provider = PROVIDERS[name];

        if (provider.deprecated && console && console.warn) {
            console.warn(name + " is a deprecated style; it will be redirected to its replacement. For performance improvements, please change your reference.");
        }

        return provider;
    } else {
        throw 'No such provider (' + name + ')';
    }
}

/*
 * StamenTileLayer for modestmaps-js
 * <https://github.com/modestmaps/modestmaps-js/>
 *
 * Works with both 1.x and 2.x by checking for the existence of MM.Template.
 */
if (typeof MM === "object") {
    var ModestTemplate = (typeof MM.Template === "function")
        ? MM.Template
        : MM.TemplatedMapProvider;
    MM.StamenTileLayer = function(name) {
        var provider = getProvider(name);
        this._provider = provider;
        MM.Layer.call(this, new ModestTemplate(provider.url, provider.subdomains));
        this.provider.setZoomRange(provider.minZoom, provider.maxZoom);
        this.attribution = provider.attribution;
    };

    MM.StamenTileLayer.prototype = {
        setCoordLimits: function(map) {
            var provider = this._provider;
            if (provider.extent) {
                map.coordLimits = [
                    map.locationCoordinate(provider.extent[0]).zoomTo(provider.minZoom),
                    map.locationCoordinate(provider.extent[1]).zoomTo(provider.maxZoom)
                ];
                return true;
            } else {
                return false;
            }
        }
    };

    MM.extend(MM.StamenTileLayer, MM.Layer);
}

/*
 * StamenTileLayer for Leaflet
 * <http://leaflet.cloudmade.com/>
 *
 * Tested with version 0.3 and 0.4, but should work on all 0.x releases.
 */
if (typeof L === "object") {
    L.StamenTileLayer = L.TileLayer.extend({
        initialize: function(name, options) {
            var provider = getProvider(name),
                url = provider.url.replace(/({[A-Z]})/g, function(s) {
                    return s.toLowerCase();
                }),
                opts = L.Util.extend({}, options, {
                    "minZoom":      provider.minZoom,
                    "maxZoom":      provider.maxZoom,
                    "subdomains":   provider.subdomains,
                    "scheme":       "xyz",
                    "attribution":  provider.attribution,
                    sa_id:          name
                });
            L.TileLayer.prototype.initialize.call(this, url, opts);
        }
    });

    /*
     * Factory function for consistency with Leaflet conventions
     */
    L.stamenTileLayer = function (options, source) {
        return new L.StamenTileLayer(options, source);
    };
}

/*
 * StamenTileLayer for OpenLayers
 * <http://openlayers.org/>
 *
 * Tested with v2.1x.
 */
if (typeof OpenLayers === "object") {
    // make a tile URL template OpenLayers-compatible
    function openlayerize(url) {
        return url.replace(/({.})/g, function(v) {
            return "$" + v.toLowerCase();
        });
    }

    // based on http://www.bostongis.com/PrinterFriendly.aspx?content_name=using_custom_osm_tiles
    OpenLayers.Layer.Stamen = OpenLayers.Class(OpenLayers.Layer.OSM, {
        initialize: function(name, options) {
            var provider = getProvider(name),
                url = provider.url,
                subdomains = provider.subdomains,
                hosts = [];
            if (url.indexOf("{S}") > -1) {
                for (var i = 0; i < subdomains.length; i++) {
                    hosts.push(openlayerize(url.replace("{S}", subdomains[i])));
                }
            } else {
                hosts.push(openlayerize(url));
            }
            options = OpenLayers.Util.extend({
                "numZoomLevels":        provider.maxZoom,
                "buffer":               0,
                "transitionEffect":     "resize",
                // see: <http://dev.openlayers.org/apidocs/files/OpenLayers/Layer/OSM-js.html#OpenLayers.Layer.OSM.tileOptions>
                // and: <http://dev.openlayers.org/apidocs/files/OpenLayers/Tile/Image-js.html#OpenLayers.Tile.Image.crossOriginKeyword>
                "tileOptions": {
                    "crossOriginKeyword": null
                },
                "attribution": provider.attribution
            }, options);
            return OpenLayers.Layer.OSM.prototype.initialize.call(this, name, hosts, options);
        }
    });
}

/*
 * StamenMapType for Google Maps API V3
 * <https://developers.google.com/maps/documentation/javascript/>
 */
if (typeof google === "object" && typeof google.maps === "object") {

    // Extending Google class based on a post by Bogart Salzberg of Portland Webworks,
    // http://www.portlandwebworks.com/blog/extending-googlemapsmap-object
    google.maps.ImageMapType = (function(_constructor){
        var f = function() {
            if (!arguments.length) {
                return;
            }
            _constructor.apply(this, arguments);
        }
        f.prototype = _constructor.prototype;
        return f;
    })(google.maps.ImageMapType);


    google.maps.StamenMapType = function(name) {
        var provider = getProvider(name),
            subdomains = provider.subdomains;
        return google.maps.ImageMapType.call(this, {
            "getTileUrl": function(coord, zoom) {
                var numTiles = 1 << zoom,
                    wx = coord.x % numTiles,
                    x = (wx < 0) ? wx + numTiles : wx,
                    y = coord.y,
                    index = (zoom + x + y) % subdomains.length;
                return provider.url
                    .replace("{S}", subdomains[index])
                    .replace("{Z}", zoom)
                    .replace("{X}", x)
                    .replace("{Y}", y);
            },
            "tileSize": new google.maps.Size(256, 256),
            "name":     name,
            "minZoom":  provider.minZoom,
            "maxZoom":  provider.maxZoom
        });
    };

    // FIXME: is there a better way to extend classes in Google land?
    // Possibly fixed, see above ^^^ | SC
    google.maps.StamenMapType.prototype = new google.maps.ImageMapType;
}

})(typeof exports === "undefined" ? this : exports);


var map = new L.Map('map').setView([42,-93],7);
var layer = new L.StamenTileLayer('toner-background');
	map.addLayer(layer);

var allHighChartData = [];
setup();
function setup() {
	var features = allCounties["features"];
	for (var i = 0; i < features.length; i++) {
		var feature = features[i];
		var properties = feature["properties"];
		var countyName = properties["name"].split(",")[0];
		allHighChartData.push(getCountyData(countyName));
		properties["NumEpisodes"] = 0
		for (var j = 0; j < dataSets.length; j++) {
			var data = dataSets[j];
			if (data["County"] == countyName && data["Year"] != "NA" && data["State"] == "Iowa") {
				properties["NumEpisodes"] = (parseInt(properties["NumEpisodes"]) + parseInt(data["NumEpisodes"])).toString();
			}
		}
		features["properties"] = properties;
	}
	allCounties["features"] = features
}
var highchart
highChart(allHighChartData, "Iowa")

function getCountyData(county) {
	var numbers = [];
	for (var i = 0; i < dataSets.length; i++) {
		var data = dataSets[i];
		if (data["Year"] != "NA" && data["State"] == "Iowa" && data["County"] == county) {
			numbers.push(parseInt(data["NumEpisodes"]));
		}
	}
	if (numbers.length < 20) {
		for (var i = 0; i < 20 - numbers.length; i++) {
			numbers.push(null);
		}
	}
	else {
		for (var i = 0; i < numbers.length - 20; i++) {
			numbers.pop();
		}
	}
	return {name:county, data: numbers};
}

window.onload = function () {
    select = document.getElementById("selector");
    var option = document.createElement("option");
        option.value = "Iowa";
        option.textContent = "Select County";
        select.appendChild(option);
    for (var i = 0; i < allHighChartData.length; i++) {
    	var countyData = allHighChartData[i];
    	var name = countyData["name"]; 
        var option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    };
};

document.getElementById("selector").addEventListener("change", change);

var geojsonLayer = null;
function change() {
	var countyName = document.getElementById("selector").value;
    for (var i = 0; i < allHighChartData.length; i++) {
    	var data = allHighChartData[i];
    	if (data["name"] == countyName) {
    		highChart([data], countyName);
    		break;
    	}
    	else if (countyName == "Iowa") {
    		highChart(allHighChartData, "Iowa");
    		break;
    	}
    }

    var features = allCounties["features"];
	for (var i = 0; i < features.length; i++) {
		var feature = features[i];
		var properties = feature["properties"];
		var name = properties["name"].split(",")[0];
		if (name == countyName) {
			geojsonLayer = L.geoJson(feature, {
				style: {
        				weight: 5,
        				color: '#808080',
        				dashArray: '',
        				fillOpacity: 0.7
    				}
				}).addTo(map);
    		info.update(properties);
		}
	}
}


function setColor(NumEpisodes) {
	var num = parseInt(NumEpisodes)

	if (num >= 35) {
		return '#1C00D6';
	} 
	else if (num >= 20) {
		return '#3369D6';
	} 
	else if (num >= 10) {
		return '#7BE1FF';
	} 
	else if (num >= 1) {
		return '#FBF2F6';
	}
	else {
		return '#FFFFFF';
	}
}

function setStyle(feature) {
	return {
		weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
		fillColor: setColor(feature.properties.NumEpisodes)
	}
}

L.geoJson(allCounties, {
	style: setStyle
}).addTo(map);

var geojson;

function highlightFeature(e) {
	if (geojsonLayer != null) {
		map.removeLayer(geojsonLayer);
	}
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#808080',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    info.update(layer.feature.properties);
}

function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update();
}

function changeChart(e) {
    var layer = e.target;
    var countyName = layer.feature.properties["name"].split(",")[0];
    for (var i = 0; i < allHighChartData.length; i++) {
    	var data = allHighChartData[i];
    	if (data["name"] == countyName) {
    		highChart([data], countyName);
    		break;
    	}
    }
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: changeChart
    });
}

geojson = L.geoJson(allCounties, {
    style: setStyle,
    onEachFeature: onEachFeature
}).addTo(map);

var info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (props) {
    this._div.innerHTML = '<h4>Number of Flood Impacts In Iowa (1996 - 2016)</h4>' +  (props ?
        '<b>' + props.name + '</b><br />' + props.NumEpisodes + ' Flooding Events'
        : 'Hover over a county');
};

info.addTo(map);

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend'),
        grades = [1, 10, 20, 35],
        labels = [];

    // loop through our density intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + setColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }

    return div;
};

legend.addTo(map);

function highChart(data, county){
	highchart = Highcharts.chart('highchart', {

    title: {
        text: 'Number of Flood Impacts in ' + county + ' 1996 - 2016'
    },

    subtitle: {
        text: 'Source: fema.gov'
    },

    yAxis: {
        title: {
            text: 'Number of Flooding Events'
        }
    },
    xAxis: {
        title: {
            text: 'Years'
        }
    },
    legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle'
    },

    plotOptions: {
        series: {
            label: {
                connectorAllowed: false
            },
            pointStart: 1996
        }
    },

    series: data,

    responsive: {
        rules: [{
            condition: {
                maxWidth: 900
            },
            chartOptions: {
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom'
                }
            }
        }]
    }

});
}


