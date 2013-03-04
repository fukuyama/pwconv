/*jslint indent: 4, maxerr: 50, browser: true, windows: true, unparam: true */
/*global $*/

var dataStorage = function (data_name, storage_type) {
		'use strict';
		var put, get;
		storage_type = storage_type || 'cookie';
		switch (storage_type) {
		case 'localStorage':
			put = function (key, val) {
				return window.localStorage.setItem(key, val);
			};
			get = function (key) {
				return window.localStorage.getItem(key);
			};
			break;
		default:
			put = function (key, val) {
				return $.cookie(key, val, {expires: 1024});
			};
			get = function (key) {
				return $.cookie(key);
			};
			break;
		}
		return {
			data_size: function () {
				var c = get(data_name);
				if (c) {
					return c.length;
				}
				return 0;
			},
			load: function () {
				var r = {},
					c = get(data_name);
				if (c) {
					$(c.split(/,/)).each(function (i, s) {
						var d = s.split(/\=/);
						r[decodeURIComponent(d[0])] = decodeURIComponent(d[1]);
					});
				}
				return r;
			},
			save: function (data) {
				var s = [];
				$.each(data, function (k, v) {
					s.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
				});
				put(data_name, s.join(','));
			},
			checkLength: function (data) {
				var s = [];
				$.each(data, function (k, v) {
					s.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
				});
				return encodeURIComponent(s.join(',')).length >= 3952;
			},
			put: function (key, val) {
				var data = this.load();
				data[key] = val;
				this.save(data);
			},
			remove: function (key) {
				var data = this.load();
				delete data[key];
				this.save(data);
			}
		};
	},
	dataStorageMulti = function (data_key, name, setter) {
		'use strict';
		var that,
			current,
			storage = (function () {
				var target = {
					cookie: dataStorage(data_key, 'cookie'),
					localStorage: dataStorage(data_key, 'localStorage')
				};
				return function (name) {
					if (name === 'auto') {
						if (target.cookie.data_size() > target.localStorage.data_size()) {
							name = 'cookie';
						} else {
							name = 'localStorage';
						}
					}
					current = name;
					return target[name];
				};
			}()),
			init = function (name) {
				var F = function () {};
				F.prototype = storage(name);
				that = new F();
				that.init = init;
				that.name = current;
				setter(that);
				return that;
			};
		return init(name);
	};
