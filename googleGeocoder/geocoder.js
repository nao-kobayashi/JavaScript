const KS_GEO_STATUS_OK = 1;
const KS_GEO_STATUS_NG_GOOGLE = 2;
const KS_GEO_STATUS_NG_KS = 3;

var GeocodeResult = function(location, status, error, dataType){
    //呼び出し元でnew演算子付け忘れ
    if (!(this instanceof GeocodeResult)) {
        return new GeocodeResult(location, status, error, dataType);
    }

    //プロパティセット
    this.location = location;
    this.status = status;
    this.error = error;
    this.rawData = '';
    this.dataType = dataType;
}


//デバッグ用メソッド定義
GeocodeResult.prototype.setRawData = function(raw) {
    this.rawData = raw;
}

GeocodeResult.prototype.getRawData = function() {
    return this.rawData;
}

//住所から緯度・経度を求める。
function getLocation(address, callback) {    
    //キャッシュサーバーに問い合わせ
    KsGeocoder(address, callback);
}

function KsGeocoder(address, callback) {
    var param = { addr: address };

    $.ajax({
        type: "POST",
        url: "http://localhost:63699/geocode.ashx",
        data: param,
        contenttype: "application/json; charset=utf-8",
        success: function(result) {
            if (result.Status == "NG") {
                console.log("ks geocoder not found");
                //キャッシュに見つからない場合googleに問い合わせ
                GoogleGeocoder(address, callback);
            } else {
                var latlng = ParseLocation(JSON.parse(result.Json));
                result = new GeocodeResult(latlng, KS_GEO_STATUS_OK, '', 'KS_CACHE');
                callback(result);
            }
        },
        error: function(request, textStatus, errorThrown) {
            console.log("ks geocoder error:" + request.status);
            console.log("textStatus:" + textStatus);
            console.log("errorThrown:" + errorThrown.message);
            //エラー時はGoogleを頼る。
            GoogleGeocoder(address, callback);
        }
    });
}


function GoogleGeocoder(address, callback) {
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'address': address }, function (results, status) {
        var result = null;
        if (status == google.maps.GeocoderStatus.OK) {
            var latlng = ParseLocation(results);
            result = new GeocodeResult(latlng, KS_GEO_STATUS_OK, '', 'google');
            result.setRawData(results);
        } else {
            result = new GeocodeResult(null, KS_GEO_STATUS_NG_GOOGLE, status, 'error');
        }
            
        //呼び出し元コールバック呼び出し
        callback(result);

        //googleから読んだ場合はその値をキャッシュに保存しておく
        saveGeocode(address, results);
    });
}

function saveGeocode(address, geocodeJson) {
    var cnvGeocode = JSON.stringify(geocodeJson);
    var param = { addr: address, json: cnvGeocode };
    
    $.ajax({
        type: "POST",
        url: "http://localhost:63699/geocodesave.ashx",
        data: param,
        contenttype: "application/json; charset=utf-8",
        success: function(result) {
            console.log("save success");
        },
        error: function(request, textStatus, errorThrown) {
            console.log("save error:" + request.status);
            console.log("textStatus:" + textStatus);
            console.log("errorThrown:" + errorThrown.message);
        }
    });
}



function ParseLocation(results) {
    var latlng;
    for (var i = 0; i < results.length; i++) {
        if (results[i].geometry) {
            latlng = results[i].geometry.location;
        }
    }
    return latlng;
}
