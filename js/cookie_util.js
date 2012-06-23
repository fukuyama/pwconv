var CookieUtil = function(name) {
	this.cookie_name = name;
};
CookieUtil.prototype = {
	load: function() {
		var r = {};
		var c = $.cookie(this.cookie_name);
		if (c){
			$(c.split(/,/)).each(function(i,s){
				var d = s.split(/=/)
				r[decodeURIComponent(d[0])] = decodeURIComponent(d[1]);
			});
		}
		return r;
	},
	save: function(data) {
		var s = [];
		$.each(data,function(k,v){
			s.push(encodeURIComponent(k)+'='+encodeURIComponent(v));
		});
		$.cookie(this.cookie_name,s.join(','),{expires: 1024});
	},
	checkLength: function(data) {
		var s = [];
		$.each(data,function(k,v){
			s.push(encodeURIComponent(k)+'='+encodeURIComponent(v));
		});
		var len = encodeURIComponent(s.join(',')).length;
		return len >= 3952;
	},
	put: function(key,val) {
		var data = this.load();
		data[key] = val;
		this.save(data);
	},
	remove: function(key) {
		var data = this.load();
		delete data[key];
		this.save(data);
	}
};
