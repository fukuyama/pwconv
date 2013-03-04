/*jslint indent: 4, maxerr: 50, browser: true, windows: true, regexp: true, unparam: true */
/*global $, jQuery, dataStorage, ZeroClipboard, jsSHA, dataStorageMulti */

var pwconv_version = '0.3.9',
	JsSHA = jsSHA;

// ドキュメント読み込み後の処理
$(document).ready(function () {
	'use strict';
	// オブジェクト
	var hashpass,           // ハッシュパスワードの管理オブジェクト
		clip,               // クリップボード(ZeroClipboard)のオブジェクト
		data_storage,       // オプションを保存するストレージ(key=_pwops)
		secret_key_storage, // シークレットキーを保存するストレージ(key=_pwskey)
		option,             // オプション管理オブジェクト
		query_param,

		// 関数
		show_message,
		get_hash,
		reset_form,
		reset_keyword_typeahead,
		keyword_change_handler,
		create_options_conf;

// オプションコントロール
	option = (function () {
		var that,
			controls,
			form_value_default = {
				options: {}
			},
			option_value_function = function (id) {
				return function () {
					return $(id + ' > button[class*="active"]').val();
				};
			},
			// 全てのオプションコントロールのメソッド呼び出し
			each_controls = function (name) {
				$.each(controls, function (k, o) { if (o[name]) { o[name](); } });
			},
			// オプション文字列からオプション情報を作成
			parse_options = function (options) {
				var pattern = {A: 'A', B: 'B', C: 'C', D: 'D', E: 'E'}[options.charAt(0)],
					letter = {b: 'both', u: 'upper', l: 'lower'}[options.charAt(1)],
					offset = options.substring(2, 8).split(/x/),
					secret = options.charAt(options.length - 1) === 's',
					i,
					l;
				if (pattern && letter && offset.length === 2) {
					i = parseInt(offset[0], 10);
					l = parseInt(offset[1], 10);
					return {pattern: pattern, letter: letter, offset: [i, l], secret_key: secret};
				}
				return false;
			};

		controls = {
			// ストレージオプション操作
			storage: {
				val: option_value_function('#storage'),
				reset: function () {
					$('#storage').button('reset');
					$('#storage > button').click(function () {
						$(this).button('toggle');
						data_storage.init(controls.storage.val());
						secret_key_storage.init(controls.storage.val());
					});
					$('#storage > button[value*=' + data_storage.name + ']').button('toggle');
				}
			},
			// レターオプション操作
			letter: {
				val: option_value_function('#letter'),
				init: function () {
					form_value_default.options.letter = 'both';
				},
				reset: function () {
					$('#letter').button('reset');
					$('#letter > button').click(function () {
						$(this).button('toggle');
						that.refresh_display();
						hashpass.generate();
					});
					if (!form_value_default.options.letter) {
						controls.letter.init();
					}
					$('#letter > button[value*=' + form_value_default.options.letter + ']').button('toggle');
					hashpass.generate();
				},
				random: function () {
					form_value_default.options.letter = ['both', 'upper', 'lower'][Math.floor(Math.random() * 3)];
				}
			},
			// パターンオプション操作
			pattern: {
				val: option_value_function('#pattern'),
				init: function () {
					form_value_default.options.pattern = 'A';
				},
				display: function () {
					$('#pattern_disp').text(controls.pattern.hash());
				},
				hash: function () {
					var pattern = '',
						hash = $('#password_hash_disp').text();
					if (hash !== '') {
						switch (controls.pattern.val()) {
						case 'A':
							pattern = hash.substring(0, 5);
							break;
						case 'B':
							pattern = hash.substring(5, 10);
							break;
						case 'C':
							pattern = hash.substring(10, 15);
							break;
						case 'D':
							pattern = hash.substring(15, 20);
							break;
						case 'E':
							pattern = hash.substring(20, 25);
							break;
						}
					}
					return pattern;
				},
				reset: function () {
					$('#pattern').button('reset');
					// リセットするとイベントも消されるから再設定
					$('#pattern > button').click(function () {
						$(this).button('toggle');
						controls.pattern.display();
						that.refresh_display();
						hashpass.generate();
					});
					$('#pattern_disp').empty();
					if (!form_value_default.options.pattern) {
						controls.pattern.init();
					}
					$('#pattern > button[value*=' + form_value_default.options.pattern + ']').button('toggle');
					controls.pattern.display();
					hashpass.generate();
				},
				random: function () {
					form_value_default.options.pattern = ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)];
				}
			},
			// オフセットオプション操作
			offset: {
				set: function (i, l) {
					$('#offset').slider('values', [i, l]);
				},
				display: function (i, l) {
					$('#offset_disp').text(i + ' - ' + l);
				},
				init: function () {
					form_value_default.options.offset = [0, 10];
				},
				reset: function () {
					if (!form_value_default.options.offset) {
						controls.offset.init();
					}
					var i = form_value_default.options.offset[0],
						l = form_value_default.options.offset[1];
					controls.offset.set(i, l);
					controls.offset.display(i, l);
					hashpass.refresh(i, l);
				},
				random: function () {
					var i = Math.floor(Math.random() * 12),
						l = Math.floor(Math.random() * 8 + 8);
					form_value_default.options.offset = [i, i + l];
				}
			},
			// シークレットキーオプション操作
			secret_key: {
				secret: function () {
					return $('#secret_key_checkbox:checked').val() === 'on';
				},
				val: function () {
					if (controls.secret_key.secret()) {
						return secret_key_storage.load().value || '';
					}
					return '';
				},
				setup: function () {
					$('#secret_key_checkbox').change(function () {
						that.refresh_display();
						hashpass.generate();
					});
					controls.secret_key.init();
				},
				init: function () {
					var v = secret_key_storage.load().value;
					if (v && v !== '') {
						form_value_default.options.secret_key = true;
					} else {
						form_value_default.options.secret_key = false;
					}
				},
				reset: function () {
					$('#secret_key_checkbox').val(form_value_default.options.secret_key ? ['on'] : []);
					hashpass.generate();
				}
			}
		};

		that = {
			// オプションのセットアップ
			setup: function () {
				each_controls('setup');
			},
			// オプションのリセット
			reset: function () {
				each_controls('reset');
				reset_keyword_typeahead();
				that.refresh_display();
			},
			// オプションをランダムに設定
			random: function () {
				each_controls('random');
				that.reset();
			},
			// オプションの初期化
			init: function () {
				each_controls('init');
				that.reset();
			},
			// オプションのロード
			load: function () {
				var data, op, keyword = $('#keyword').val();
				$('#keyword_control_group').removeClass('success');
				if (keyword !== '') {
					// keyword に入力された値が Storage にあれば、オプションを、その値に初期化する。
					data = data_storage.load();
					if (data[keyword]) {
						op = parse_options(data[keyword]);
						if (op) {
							form_value_default.options = op;
							$('#keyword_control_group').addClass('success');
						}
					}
				}
			},
			// オプション表示の更新
			refresh_display: function (pattern, letter, offset, secret_key) {
				// オプション情報からオプション文字列を作成
				pattern = pattern || option.controls.pattern.val();
				letter = letter || option.controls.letter.val();
				offset = offset || $('#offset').slider('values');
				secret_key = secret_key || ($('#secret_key_checkbox:checked').val() ? 's' : '');
				$('#options_disp').text(pattern + letter.charAt(0) + offset.join('x') + secret_key);
			}
		};
		that.controls = controls;
		return that;
	}());

	// メッセージ表示用
	show_message = function (msg) {
		$('#message').text(msg).show().fadeOut(3000);
	};

	// ハッシュ取得用
	get_hash = function (text) {
		return new JsSHA(text, 'TEXT').getHash('SHA-1', 'B64');
	};

	query_param = (function () {
		var q = {
			keyword: '',
			storage: 'auto'
		};
		if (document.location.search && document.location.search.length > 0) {
			$(document.location.search.split(/\?|\&/)).each(function (i, query) {
				var data = query.split(/\=/);
				switch (data[0]) {
				case 'k':
					q.keyword = decodeURIComponent(data[1]);
					break;
				case 's':
					switch (decodeURIComponent(data[1])) {
					case 'c':
						q.storage = 'cookie';
						break;
					case 'l':
						q.storage = 'localStorage';
						break;
					}
					break;
				}
			});
		}
		return q;
	}());

	data_storage = dataStorageMulti('_pwops', query_param.storage, function (o) { data_storage = o; });
	secret_key_storage = dataStorageMulti('_pwskey', data_storage.name, function (o) { secret_key_storage = o; });

	hashpass = (function () {
		var that,
			hash_password = '',
			// ハッシュパスワードの作成
			create_hashpass = function (key, pass, pattern, letter, secret_key) {
				if (key === '' || pass === '' || pattern === '' || letter === '') {
					return '';
				}
				var text = key + pass + pattern + secret_key,
					hash = get_hash(text);
				hash = hash.replace(/\+|\//g, pattern.charAt(0));
				switch (letter) {
				case 'upper':
					hash = hash.toUpperCase();
					break;
				case 'lower':
					hash = hash.toLowerCase();
					break;
				}
				return hash;
			};
		that = {
			// ハッシュパスワードの更新
			refresh: function (i, l) {
				var h = hash_password, values;
				if (h === '') {
					$('#hash').empty();
					return;
				}
				if (typeof i === 'undefined' && typeof l === 'undefined') {
					values = $('#offset').slider('values');
					i = values[0];
					l = values[1];
				}
				clip.setText(h.substring(i, l));
				if ($('#hash_show_button').text() === 'Show') {
					h = h.replace(/./g, '*');
				}
				$('#hash').empty()
					.append(h.substring(0, i))
					.append('<span class="hashpass">' + h.substring(i, l) + '</span>')
					.append(h.substring(l, 30));
				// TODO:: Auto は未実装
				//var auto = $('#auto_button').hasClass('active');
				//if (auto) {
				//}
			},
			// ハッシュパスワードの生成
			generate: function () {
				hash_password = create_hashpass(
					$('#keyword').val(),
					$('#password').val(),
					option.controls.pattern.hash(),
					option.controls.letter.val(),
					option.controls.secret_key.val()
				);
				that.refresh();
			}
		};
		return that;
	}());

	// フォームのリセット（全体）
	reset_form = function () {
		$('#pwconv_form').each(function () { this.reset(); });
		if (query_param.keyword) {
			$('#keyword').val(query_param.keyword);
		}
		if ($('#keyword').val() === '') {
			$('#open_save_dialog_button').attr('disabled', 'true');
			$('#keyword').focus();
		} else {
			$('#open_save_dialog_button').removeAttr('disabled');
			$('#password').focus();
		}
		$('#password_hash_disp').text('');
		// フォームのリセットの時だけ初期化する
		if ($('#keyword').val() === '') {
			option.init();
		}
		option.load();
		option.reset();
		hashpass.refresh();
	};

	// キーワード typeahead のリセット
	reset_keyword_typeahead = function () {
		var data = data_storage.load(),
			source = [];
		$.each(data, function (k, v) {
			source.push(k);
		});
		$('#keyword').typeahead({
			source: source
		});
	};

	// キーワード変更ハンドラ
	keyword_change_handler = function () {
		if ($(this).val() === '') {
			$('#open_save_dialog_button').attr('disabled', 'true');
		} else {
			$('#open_save_dialog_button').removeAttr('disabled');
		}
		option.load();
		option.reset();
		hashpass.generate();
	};

// ヘルプテキスト
	$('#keyword_help').popover({
		trigger: 'hover',
		html: true,
		title: 'Keyword Help',
		content: 'サイト固有のパスワードを生成するためのキーワード。通常は対象サイトのドメイン名やサービス名を入力してください。'
	});
	$('#password_help').popover({
		trigger: 'hover',
		html: true,
		title: 'Password Help',
		content: 'パスワード生成に使用するマスターパスワード。このパスワードを変更すると、全てのサイトのパスワードを生成しなおす必要があります。'
	});
	$('#pattern_help').popover({
		trigger: 'hover',
		html: true,
		title: 'Pattern Help',
		content: '生成パターンの選択。具体的にはハッシュ値を取得する時のキーとして使用され、サイト毎に複数のパスワードを生成します。<br/>通常は、どれか１つを選択し、サイトのパスワードを変更する場合に、生成パターンを変更してください。'
	});
	$('#pattern_help').hover(function () {
		$('#options').css('overflow', 'visible');
	}, function () {
		$('#options').css('overflow', 'hidden');
	});
	$('#offset_help').popover({
		trigger: 'hover',
		html: true,
		title: 'Offset Help',
		content: '生成されたパスワードを切り取る位置。サイトで使用可能なパスワードの長さによって調整してください。'
	});
	$('#letter_help').popover({
		trigger: 'hover',
		html: true,
		title: 'Letter Help',
		content: '使用するパスワード文字の選択。生成されたパスワードを、大文字のみや小文字のみにする場合に選択してください。'
	});
	$(('#secret_key_help')).popover({
		trigger: 'hover',
		html: true,
		title: 'Secret Key Help',
		content: 'パスワードを、マスターパスワードとシークレットキーを組み合わせて生成する場合に設定してください。<br/>シークレットキーを使う場合には、 保存する場所(Storage 設定)は、localStorage をおすすめします。'
	});
	$(('#storage_help')).popover({
		trigger: 'hover',
		html: true,
		title: 'Storage Help',
		content: 'オプションの設定を保存する場所を選択してください。'
	});

// イベント設定
	$('#keyword').change(keyword_change_handler);
	$('#keyword').keyup(keyword_change_handler);
	$('#password').keyup(function () {
		// パスワードのハッシュを取得
		var hash = '',
			text = $('#password').val();
		if (text !== '') {
			hash = get_hash(text);
		}
		$('#password_hash_disp').text(hash);
		option.controls.pattern.display();
		hashpass.generate();
	});
	$('#offset').slider({
		range: true,
		min: 0,
		max: 30,
		values: [0, 10],
		slide: function (ev, ui) {
			option.controls.offset.display(ui.values[0], ui.values[1]);
			hashpass.refresh(ui.values[0], ui.values[1]);
			option.refresh_display(option.controls.pattern.val(), option.controls.letter.val(), [ui.values[0], ui.values[1]]);
		}
	});
	$('#reset_button').click(reset_form);
	$('#hash_show_button').click(function () {
		switch ($(this).text()) {
		case 'Show':
			$(this).text('Hide');
			break;
		case 'Hide':
			$(this).text('Show');
			break;
		}
		hashpass.refresh();
	});

// オプション関連イベント
	$('#options').
		on('show', function () { $('#options_button').addClass('active'); }).
		on('hide', function () { $('#options_button').removeClass('active'); });

	$('#random_options_button').click(option.random);
	$('#init_options_button').click(option.init);

	$('#secret_key_dialog').on('shown', function () {
		var o = secret_key_storage.load();
		switch ($('#secret_key_hash_show_button').text()) {
		case 'Show':
			$('#secret_key_pass').val(o.value);
			$('#secret_key_pass').focus();
			break;
		case 'Hide':
			$('#secret_key').val(o.value);
			$('#secret_key').focus();
			break;
		}
	});
	$('#secret_key_ok_button').click(function () {
		var o = secret_key_storage.load();
		switch ($('#secret_key_hash_show_button').text()) {
		case 'Show':
			o.value = $('#secret_key_pass').val();
			break;
		case 'Hide':
			o.value = $('#secret_key').val();
			break;
		}
		secret_key_storage.save(o);
		$('#secret_key_dialog').modal('hide');
		$('#secret_key').val('');
		hashpass.generate();
	});
	$('#secret_key_hash_show_button').click(function () {
		switch ($(this).text()) {
		case 'Show':
			$(this).text('Hide');
			$('#secret_key').val($('#secret_key_pass').val());
			$('#secret_key_pass').hide();
			$('#secret_key').show();
			$('#secret_key').focus();
			break;
		case 'Hide':
			$(this).text('Show');
			$('#secret_key_pass').val($('#secret_key').val());
			$('#secret_key').hide();
			$('#secret_key_pass').show();
			$('#secret_key_pass').focus();
			break;
		}
	});
	$('#secret_key').hide();
	$('#secret_key_random_button').click(function () {
		var val = '', i = 0, key = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/*-+!?#$%&=._ ';
		for (i = 0; i < 124; i += 1) {
			val += key.charAt(Math.floor(Math.random() * key.length));
		}
		$('#secret_key').val(val);
		$('#secret_key_pass').val(val);
	});

	// オプション確認の表示データ作成
	create_options_conf = function (button, k, v) {
		var tr = $('<tr>').addClass('options_rows');
		switch (button) {
		case 'New':
			tr.append('<td class="col1"><button type="button" class="btn btn-mini disabled">New</button></td>');
			break;
		case 'Del':
			tr.append('<td class="col1"><button type="button" class="btn btn-mini" data-toggle="button">Del</button></td>');
			break;
		case 'Update':
			tr.append('<td class="col1"><button type="button" class="btn btn-mini disabled">Update</button></td>');
			break;
		}
		tr.append($('<td class="col2">').text(jQuery.trim(k))).append('<td class="col2">' + jQuery.trim(v) + '</td>');
		return tr;
	};

	$('#open_save_dialog_button').click(function () {
		var dialog = $('#options_dialog'),
			keyword = $('#keyword').val(),
			options = $('#options_disp').text(),
			conf = $('#options_conf_body').empty();
		$('#options_dialog_list_tab').tab('show');
		$('#options_edit_textarea').addClass('disabled');
		$('#options_edit_textarea').attr('disabled', 'true');
		$('.dialog_title', dialog).text('Save Options');
		$('.dialog_message', dialog).text('以下の設定を ' + data_storage.name + ' に保存します。');
		$('#options_conf_table').removeClass('scroll-frame');
		conf.append(create_options_conf('New', keyword, options));
	});

	$('#open_view_dialog_button').click(function () {
		var dialog = $('#options_dialog'),
			conf = $('#options_conf_body').empty(),
			data = data_storage.load();
		$('#options_dialog_edit_tab').text('Edit');
		$('#options_dialog_list_tab').tab('show');
		$('#options_edit_textarea').removeClass('disabled');
		$('#options_edit_textarea').removeAttr('disabled');
		$('.dialog_title', dialog).text('View Options');
		$('.dialog_message', dialog).text('以下の設定が ' + data_storage.name + ' に保存されています。');
		$('#options_conf_table').addClass('scroll-frame');
		$.each(data, function (k, v) {
			conf.append(create_options_conf('Del', k, v));
		});
	});

	$('#save_button').click(function () {
		var data = data_storage.load(),
			al;
		if ($('#options_dialog_edit_tab').text() === 'Edit*') {
			$('#options_dialog_list_tab').tab('show');
			data = {};
		}
		$('#options_conf_body tr').each(function () {
			var t = $('td', this),
				btn = $('button', t[0]),
				k = jQuery.trim($(t[1]).text()),
				v = jQuery.trim($(t[2]).text());
			switch (btn.text()) {
			case 'New':
			case 'Update':
				data[k] = v;
				break;
			case 'Del':
				if (btn.hasClass('active')) {
					delete data[k];
				}
				break;
			}
		});
		if (data_storage.name === 'cookie' && data_storage.checkLength(data)) {
			al = $('<div>').addClass('alert alert-block alert-error fade in').
				append('<a class="close" data-dismiss="alert" href="#">&times;</a>').
				append('<h4 class="alert-heading">Storage Size Error!</h4>').
				append('<p>保存しようとしているデータサイズが大きすぎます。</p>');
			$('#options_alert_container').append(al);
			return false;
		}
		data_storage.save(data);
		$('#options_dialog').modal('hide');
		reset_keyword_typeahead();
		$('#options_dialog_edit_tab').text('Edit');
		$('#options_edit_textarea').val('');
	});
	$('#options_edit_textarea').change(function (e) {
		$('#options_dialog_edit_tab').text('Edit*');
	});
	$('#options_dialog_tabs li').on('show', function (e) {
		var tab_name = $(e.target).text(),
			text = '',
			conf,
			cols;
		switch (tab_name) {
		case 'Edit*':
		case 'Edit':
			$('#options_conf_body tr').each(function () {
				var t = $('td', this),
					k = $(t[1]).text(),
					v = $(t[2]).text();
				text += k + ',' + v + '\n';
			});
			$('#options_edit_textarea').val(text);
			break;
		case 'List':
			if ($('#options_dialog_edit_tab').text() === 'Edit*') {
				conf = $('#options_conf_body').empty();
				$($('#options_edit_textarea').val().split('\n')).each(function (i, line) {
					cols = line.split(/,/);
					if (cols.length === 2) {
						// 入力チェック
						if (/^[ABCDE][bul][0-9]+x[0-9]+s?$/.test(cols[1])) {
							conf.append(create_options_conf('Update', cols[0], cols[1]));
						}
					}
				});
			}
			break;
		}
	});

// クリップボード関連イベント
	ZeroClipboard.setMoviePath('../assets/zeroclipboard/ZeroClipboard.swf');
	clip = new ZeroClipboard.Client();
	clip.addEventListener('complete', function (client, text) {
		if (text !== '') {
			show_message('クリップボードにコピーしました。');
		}
	});
	clip.addEventListener('mouseOver', function (client, text) {
		clip.reposition();
	});
	clip.glue('copy_button', 'copy_button_container');
	$('#copy_button').mouseover(function () {
		clip.reposition();
	});
	$(window).resize(function () {
		clip.reposition();
	});

// バージョン情報
	$('#pwconv_version').text(pwconv_version);

// ブックマークレットの作成
	$('#bookmarklet').attr('href', 'javascript:(function(){window.open(\'' + document.location.protocol + '//' + document.location.host + document.location.pathname + '?k=\'+document.location.hostname)})();');

// オプションを初期化
	option.setup();

// フォームをリセット（初期化）
	reset_form();
});
