var pwconv_version = '0.3.6'; 
 
// ドキュメント読み込み後の処理
$(document).ready(function(){ 
	 
// 初期化 ---------------------------- 

	// バージョン情報
	$('#pwconv_version').text(pwconv_version);

	// Cookie操作用
	var cookie_util = new CookieUtil('_pwops');

	// クリップボード用
	ZeroClipboard.setMoviePath('../assets/zeroclipboard/ZeroClipboard.swf');
	var clip = new ZeroClipboard.Client();

	// ブックマークレットの作成
	$('#bookmarklet').attr('href','javascript:(function(){window.open(\'' + document.location.protocol + '//' + document.location.host + document.location.pathname + '?k=\'+document.location.hostname)})();');
 	
// ファンクション ---------------------------- 

	// メッセージ表示用
	var show_message = function(msg) {
		$('#message').text(msg).show().fadeOut(3000);
	};

	// ハッシュパスワードの生成
	var generate_hashpass = function() {
		var key = $('#keyword').val();
		var pass = $('#password').val();
		var pattern = get_pattern();
		var letter = get_letter();
		if (key == '' || pass == '' || pattern == '' || letter == '') {
			reset_hash_text();
		} else {
			var text = key + pass + pattern;
			var hash = new jsSHA(text, 'ASCII').getHash('SHA-1', 'B64');
			hash = hash.replace(/\+|\//g,pattern.charAt(0))
			switch (letter) {
			case 'upper':
				hash = hash.toUpperCase();
				break;
			case 'lower':
				hash = hash.toLowerCase();
				break;
			}
			$('#hash').text(hash);
			var values = $('#offset').slider('values');
			set_hashpass(values[0],values[1]);
		}
	};

	// ハッシュパスワードの設定
	var set_hashpass = function(i,l) {
		var hashpass = $('#hash').text();
		$('#hash').empty()
			.append(hashpass.substring(0,i))
			.append('<span class="hashpass">' + hashpass.substring(i,l) + '</span>')
			.append(hashpass.substring(l,30));
		clip.setText(hashpass.substring(i,l));
		var auto = $('#auto_button').hasClass('active');
		if (auto) {
			// Auto は未実装
		}
	};

	// オフセットの設定
	var set_offset = function(i,l) {
		$('#offset').slider('values',[i,l]);
	};

	// オフセットの表示を設定
	var set_offset_display = function(i,l) {
		$('#offset_disp').text(i + ' - ' + l);
	};

	// レターの取得
	var get_letter = function() {
		var letter = '';
		$('#letter > button[class*="active"]').each(function(){
			letter = $(this).val();
		});
		return letter;
	};

	// パスワードのハッシュを取得
	var get_password_hash = function() {
		var text = $('#password').val();
		if (text == '') {
			return '';
		}
		return new jsSHA(text, 'ASCII').getHash('SHA-1', 'B64');
	};

	// パターンの取得
	var get_pattern = function() {
		var pattern = '';
		$('#pattern > button[class*="active"]').each(function(){
			var hash = get_password_hash();
			if (hash != '') {
				switch($(this).val()) {
				case 'A': pattern = hash.substring(0, 5); break;
				case 'B': pattern = hash.substring(5, 10); break;
				case 'C': pattern = hash.substring(10,15); break;
				case 'D': pattern = hash.substring(15,20); break;
				case 'E': pattern = hash.substring(20,25); break;
				}
			}
		});
		return pattern;
	};
	// パターンの値を取得
	var get_pattern_val = function() {
		return $('#pattern > button[class*="active"]').val();
	};

	// パターンの更新
	var refresh_pattern_display = function() {
		$('#pattern_disp').text(get_pattern());
	};

	// フォームのリセット（全体）
	var reset_form = function() {
		$('#pwconv_form').each(function(){this.reset()});
		if (document.location.search && document.location.search.length > 0) {
			$(document.location.search.split(/\?|\&/)).each(function(i,query){
				var data = query.split(/=/);
				if (data[0] == 'k') {
					$('#keyword').val(decodeURIComponent(data[1]));
				}
			});
		}
		if ($('#keyword').val() == ''){
			$('#open_save_dialog_button').attr('disabled','true');
			$('#keyword').focus();
		} else {
			$('#open_save_dialog_button').removeAttr('disabled');
			$('#password').focus();
		}
		reset_pattern();
		reset_letter();
		reset_offset();
		reset_hash_text();
		reset_keyword_typeahead();
		$('#password_hash_disp').text('');

		load_cookie_options();
	};

	// オフセットのリセット
	var reset_offset = function() {
		var i = 0, l = 10;
		set_offset(i,l);
		set_offset_display(i,l);
		set_hashpass(i,l);
	};

	// パターンのリセット
	var reset_pattern = function() {
		$('#pattern').button('reset');
		// リセットするとイベントも消されるから再設定
		$('#pattern > button').click(function(){
			$(this).button('toggle');
			refresh_pattern_display();
			generate_hashpass();
		});
		$('#pattern_disp').empty();
	};

	// レターのリセット
	var reset_letter = function() {
		$('#letter').button('reset');
		// リセットするとイベントも消されるから再設定
		$('#letter > button').click(function(){
			$(this).button('toggle')
			generate_hashpass();
		});
	};

	// ハッシュパスワードのリセット
	var reset_hash_text = function() {
		$('#hash').empty();
	};

	// キーワード typeahead のリセット
	var reset_keyword_typeahead = function() {
		var data = cookie_util.load();
		var source = [];
		$.each(data,function(k,v){
			source.push(k);
		});
		$('#keyword').typeahead({
			source: source
		});
	};
	
	// オプションのロード
	var load_cookie_options = function() {
		$('#keyword_control_group').removeClass('success');
		// keyword に入力された値が Cookie にあれば、オプションを、その値に初期化する。
		var keyword = $('#keyword').val();
		if (keyword != '') {
			var data = cookie_util.load();
			// 旧バージョンのCookieを変換
			var flag = false;
			$.each(data,function(k,v){
				var op = v.split(/,/);
				if (op.length == 4) {
					v = op[0]+op[1]+[op[2],op[3]].join('x');
					data[k] = v;
					flag = true;
				}
			});
			if (flag) {
				cookie_util.save(data);
			}
			if (data[keyword]) {
				var op = parse_options(data[keyword]);
				if (op) {
					var i = op.offset[0];
					var l = op.offset[1];
					$('#pattern > button[value*='+op.pattern+']').button('toggle');
					$('#letter > button[value*='+op.letter+']').button('toggle');
					set_offset(i,l);
					set_offset_display(i,l);
					set_hashpass(i,l);
					$('#keyword_control_group').addClass('success');
				}
			}
		}
	};
	
	// オプション文字列からオプション情報を作成
	var parse_options = function(options) {
		var pattern = {A:'A',B:'B',C:'C',D:'D',E:'E'}[options.charAt(0)];
		var letter = {b:'both',u:'upper',l:'lower'}[options.charAt(1)];
		var s = options.substring(2,8).split(/x/);
		if (pattern && letter && s.length == 2) {
			var i = parseInt(s[0]);
			var l = parseInt(s[1]);
			return {pattern: pattern, letter: letter, offset: [i,l]};
		}
		return false;
	};
	
	// オプション情報からオプション文字列を作成
	var create_options_string = function(pattern,letter,offset) {
		return pattern + letter.charAt(0) + offset.join('x');
	};

	// キーワード変更ハンドラ
	var keyword_change_handler = function() {
		if($(this).val() == '') {
			$('#open_save_dialog_button').attr('disabled','true');
		} else {
			$('#open_save_dialog_button').removeAttr('disabled');
		}
		load_cookie_options();
		generate_hashpass();
	};

 
// ヘルプテキスト ---------------------------- 
	$('#keyword_help').popover({
		title: 'Keyword Help',
		content: 'サイト固有のパスワードを生成するためのキーワード。通常は対象サイトのドメイン名を入力してください。'
	});
	$('#password_help').popover({
		title: 'Password Help',
		content: 'パスワード生成に使用するマスターパスワード。このパスワードを変更すると、全てのサイトのパスワードを生成しなおす必要があります。'
	});
	$('#pattern_help').popover({
		title: 'Pattern Help',
		content: '生成パターンの選択。具体的にはハッシュ値を取得する時のキーとして使用され、サイト毎に複数のパスワードを生成します。<br>通常は、どれか１つを選択し、サイトのパスワードを変更する場合に、生成パターンを変更してください。'
	});
	$('#offset_help').popover({
		title: 'Offset Help',
		content: '生成されたパスワードを切り取る位置。'
	});
	$('#letter_help').popover({
		title: 'Letter Help',
		content: '使用するパスワード文字の選択。生成されたパスワードを、大文字のみや小文字のみにする場合に選択する。'
	});
 
// イベント設定 ------------------------------------ 
	$('#keyword').change(keyword_change_handler);
	$('#keyword').keyup(keyword_change_handler);
	$('#password').keyup(function() {
		$('#password_hash_disp').text(get_password_hash());
		refresh_pattern_display();
		generate_hashpass();
	});
	$('#offset').slider({
		range: true,
		min: 0,
		max: 30,
		values: [0,10],
		slide: function(ev,ui) {
			set_offset_display(ui.values[0],ui.values[1]);
			set_hashpass(ui.values[0],ui.values[1]);
		}
	});
	$('#reset_button').click(reset_form);
 
// オプション関連イベント ---------------------------- 
	$('#options').
	on('show',function(){$('#options_button').addClass('active');}).
	on('hide',function(){$('#options_button').removeClass('active');});

	var create_options_conf = function(button,k,v){
		var tr = $('<tr>').addClass('options_rows');
		switch(button){
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
		tr.append('<td class="col2">'+jQuery.trim(k)+'</td>').append('<td class="col2">'+jQuery.trim(v)+'</td>');
		return tr;
	};

	$('#open_save_dialog_button').click(function(){
		$('#options_dialog_list_tab').tab('show');
		$('#options_edit_textarea').addClass('disabled');
		$('#options_edit_textarea').attr('disabled','true');
		var dialog = $('#options_dialog');
		$('.dialog_title',dialog).text('Save Options');
		$('.dialog_message',dialog).text('以下の設定を Cookie に保存します。');
		$('#options_conf_table').removeClass('scroll-frame');
		var keyword = $('#keyword').val();
		var options = create_options_string(get_pattern_val(),get_letter(),$('#offset').slider('values'));
		var conf = $('#options_conf_body').empty();
		var tr = create_options_conf('New',keyword,options);
		conf.append(tr);
	});
	
	$('#open_view_dialog_button').click(function(){
		$('#options_dialog_list_tab').tab('show');
		$('#options_edit_textarea').removeClass('disabled');
		$('#options_edit_textarea').removeAttr('disabled');
		var dialog = $('#options_dialog');
		$('.dialog_title',dialog).text('View Options');
		$('.dialog_message',dialog).text('以下の設定が Cookie に保存されています。');
		$('#options_conf_table').addClass('scroll-frame');
		var conf = $('#options_conf_body').empty();
		var data = cookie_util.load();
		$.each(data,function(k,v){
			var tr = create_options_conf('Del',k,v);
			conf.append(tr);
		});
	});

	$('#save_button').click(function(){
		var data = cookie_util.load();
		if ($('#options_dialog_edit_tab').text() == 'Edit*') {
			$('#options_dialog_list_tab').tab('show');
			data = {};
		}
		$('#options_conf_body tr').each(function(){
			var t = $('td',this);
			var btn = $('button',t[0]);
			var k = jQuery.trim($(t[1]).text());
			var v = jQuery.trim($(t[2]).text());
			switch(btn.text()){
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
		if (cookie_util.checkLength(data)) {
			var al = $('<div>').addClass('alert alert-block alert-error fade in')
				.append('<a class="close" data-dismiss="alert" href="#">&times;</a>')
				.append('<h4 class="alert-heading">Cookie Size Error!</h4>')
				.append('<p>保存しようとしている Cookie のサイズが大きすぎます。</p>');
			$('#options_alert_container').append(al);
			return false;
		}
		cookie_util.save(data);
		$('#options_dialog').modal('hide');
		reset_keyword_typeahead();
		$('#options_dialog_edit_tab').text('Edit');
		$('#options_edit_textarea').val('');
	});
	$('#options_edit_textarea').change(function(e){
		$('#options_dialog_edit_tab').text('Edit*');
	});
	$('#options_dialog_tabs li').on('show',function(e){
		var tab_name = $(e.target).text();
		switch(tab_name) {
		case 'Edit*':
		case 'Edit':
			var text = '';
			$('#options_conf_body tr').each(function(){
				var t = $('td',this);
				var k = $(t[1]).text();
				var v = $(t[2]).text();
				text += k + ',' + v + '\n';
			});
			$('#options_edit_textarea').val(text);
			break;
		case 'List':
			if ($('#options_dialog_edit_tab').text() == 'Edit*') {
				var conf = $('#options_conf_body').empty();
				$($('#options_edit_textarea').val().split('\n')).each(function(i,line){
					var cols = line.split(/,/);
					if (cols.length == 2) {
						var tr = create_options_conf('Update',cols[0],cols[1]);
						conf.append(tr);
					}
				});
			}
			break;
		}
	});
 
// クリップボード関連イベント ---------------------------- 
	clip.addEventListener('complete', function (client, text) {
		if (text != '') {
			show_message('クリップボードにコピーしました。');
		}
	});
	clip.addEventListener('mouseOver', function (client, text) {
		clip.reposition();
	});
	clip.glue('copy_button', 'copy_button_container');
	$('#copy_button').mouseover(function(){
		clip.reposition();
	});
	$(window).resize(function(){
		clip.reposition();
	});
 
// フォームをリセット（初期化）---------------------------- 
	reset_form();
  
}); 
 
