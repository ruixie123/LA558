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


