dojo.require("esri.map");
dojo.require("esri.config");
dojo.require("esri.tasks.query");
//dojo.require("esri.tasks.QueryTask");
dojo.require("esri.tasks.StatisticDefinition");
dojo.require("esri.toolbars.draw");
dojo.require("esri.graphic");
dojo.require("esri.TimeExtent");
dojo.require("esri.Color");
dojo.require("esri.symbols.SimpleMarkerSymbol");
dojo.require("esri.symbols.SimpleLineSymbol");
dojo.require("esri.symbols.SimpleFillSymbol");
dojo.require("esri.symbols.PictureFillSymbol");
dojo.require("esri.symbols.CartographicLineSymbol");
dojo.require("esri.arcgis.utils");
dojo.require("dojo.ready");
dojo.require("dojo._base.declare");
dojo.require("dojo._base.lang");
dojo.require("dojo.dom");
dojo.require("dojo.dom-class");
dojo.require("dojo.on");
dojo.require("dijit.Dialog");

//For the legacy method, we define all the variables we need in multiple places as globals, cause... why not?
var map;
var mapid="c7e89b6d46404021be0e362fd8ea3465";
var searchGraphic, askBtn, polyBtn, queryBtn, toolbar;
var precipURL = "http://tmservices1.esri.com/arcgis/rest/services/LiveFeeds/NDFD_Precipitation/MapServer/2";
function init() {
  var mapDeferred = esri.arcgis.utils.createMap(mapid, "mapDiv", {
    mapOptions: {
      slider: true,
      nav:false
    }
  });
  mapDeferred.then(function (response) {
    map = response.map;
    var precipQueryTask = new esri.tasks.QueryTask(precipURL);
    toolbar = new esri.toolbars.Draw(map);
    var askHTML = '<div>1) Choose an area for the question: <button data-dojo-type="dijit/form/Button" id="polyBtn">Freehand Polygon</button>'+
      '</br>'+
      '</br>2) Show me <select id="maxmin">'+
      '    <option value="max" selected="true">Max</option>'+
      '    <option value="min">Min</option>'+
      '    <option value="sum">Sum</option>'+
      '</select> Precipitation for the next '+
      '<select id="hrs">'+
      '   <option value="6" selected="true">6</option>'+
      '   <option value="12">12</option>'+
      '    <option value="18">18</option>'+
      '    <option value="24">24</option>'+
      '    <option value="48">48</option>'+
      '    <option value="72">72</option>'+
      '</select> hours.'+
      '</br>'+
      '</br>'+
      '<button data-dojo-type="dijit/form/Button" type="button" id="queryBtn" text="submit"> Ask </button>'+
      '</div>';
    var askDialogObj = dojo.query('#askDialog');
    this.askMapDialog = new dijit.Dialog({
      content: askHTML,
      title: "Ask",
      style: "max-width: 660px;",
      class: "nonModal",
      id: "askMapDialog"
    });
    askBtn = dojo.byId("askMap");
    polyBtn = dojo.byId("polyBtn");
    queryBtn = dojo.byId("queryBtn");
    dojo.on(askBtn, "click", function (event) {
        map.graphics.clear();
        if (event.type === 'click' || (event.type === 'keyup' && event.keyCode === 13)) {
          askMapDialog.show();
        }
        if (map.infoWindow){
          map.infoWindow.hide();
        }
    });
    dojo.on(polyBtn, "click", function(){
      drawPoly();
    });
    dojo.on(queryBtn, "click", function(){
      askMe();
    });
    toolbar.on("draw-end", function(feature){
      addToMap(feature, false);
    });
  }, function (error) {
    console.log("Error: ", error.code, " Message: ", error.message);
    deferred.cancel();
  });
  
}

function askMe(){
  // use new 10.1 query statistic definition to find max, min, etc.
  var precipQueryTask = new esri.tasks.QueryTask(precipURL);
  var TE = new esri.TimeExtent();
  var precipQuery = new esri.tasks.Query();
  var statDef = new esri.tasks.StatisticDefinition();
  var precipFields = ["category", "fromdate", "todate", "label"];
  //Time Extent calculations
  var curTime = new Date();
  var startTimeMS = curTime.getTime();  //milliseconds
  var selTime = dojo.byId('hrs').value;
  var selTimeMS = selTime * 3600000;    //milliseconds
  var futTime = new Date();
  var futTimeMS = futTime.getTime();
  var endTime = new Date(futTimeMS + selTimeMS);
  var endTimeMS = endTime.getTime();
  var s = new Date(startTimeMS);  //convert to Date format for JSAPI
  var e = new Date(endTimeMS);    //convert to Date format for JSAPI
  TE.startTime = s;
  TE.endTime = e;
  //Set up the Query
  var statsDD = dojo.byId("maxmin").value;
  statDef.statisticType = statsDD;
  statDef.onStatisticField = "category";
  statDef.outStatisticFieldName = "statsPrecip";
  precipQuery.returnGeometry = true;
  precipQuery.timeExtent = TE;
  precipQuery.outFields = precipFields;
  precipQuery.outStatistics = [statDef];
  precipQuery.geometry = this.searchGraphic.geometry;
  precipQueryTask.execute(precipQuery, handlePrecipQuery);
  
}

function handlePrecipQuery(evt){
  this.askMapDialog.hide();
  console.log('precip query...', evt);
  var feat = evt.features[0];
  var statsPrecip = feat.attributes.statsPrecip;
  this.map.graphics.clear();
  this.askMapDialog.hide();
  this.toolbar.deactivate();
  alert('Query Done!!!' + dojo.byId("maxmin").value + ' Precip value = ' + statsPrecip);
}
function drawPoly(){
  map.graphics.clear();
  askMapDialog.hide();
  toolbar.activate(esri.toolbars.Draw.FREEHAND_POLYGON);
}
function addToMap(feature, isResult) {
  var symbol;
  map.graphics.clear();
  switch (feature.geometry.type) {
    case "point":
    case "multipoint":
     if(isResult){
        symbol = new esri.symbol.SimpleMarkerSymbol();
      }
      else{
        symbol = new esri.symbol.SimpleMarkerSymbol();
      }
      break;
    case "polyline":
      if(isResult){
        symbol = new esri.symbol.SimpleLineSymbol(esri.symbols.SimpleLineSymbol.STYLE_DASHDOT,
          new esri.Color([255,0,0]), 2);
      }
      else{
        symbol = new esri.symbol.SimpleLineSymbol();
      }
      break;
    default:
      if(isResult){
        symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
          new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT,
          new esri.Color([255,0,0]), 2),new esri.Color([255,255,0,0.25]));
      }
      else{
        symbol = new esri.symbol.SimpleFillSymbol();
      }
      break;
  }
  searchGraphic = new esri.Graphic(feature.geometry, symbol);
  map.graphics.add(searchGraphic);
  toolbar.deactivate();
  askMapDialog.show();
}

dojo.ready(init);