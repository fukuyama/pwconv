(function(){

console.log('load');

// パターンの取得
var get_pattern = function(pass,pattern) {
	var hash = new jsSHA(pass, 'ASCII').getHash('B64');;
	if (hash != '') {
		switch(pattern) {
		case 'A': pattern = hash.substring(0, 5); break;
		case 'B': pattern = hash.substring(5, 10); break;
		case 'C': pattern = hash.substring(10,15); break;
		case 'D': pattern = hash.substring(15,20); break;
		case 'E': pattern = hash.substring(20,25); break;
		}
	}
	return pattern;
};
// ハッシュパスワードの作成
var create_hash_password = function(key,pass,pattern,letter,offset) {
	if (key == '' || pass == '' || pattern == '' || letter == '') {
		return '';
	}
	var text = key + pass + get_pattern(pass,pattern);
	var hash = new jsSHA(text, 'ASCII').getHash('B64');
	hash = hash.replace(/\+|\//g,pattern.charAt(0));
	switch (letter) {
	case 'upper':
		hash = hash.toUpperCase();
		break;
	case 'lower':
		hash = hash.toLowerCase();
		break;
	}
	return hash.substring(offset[0],offset[1]);
};

// ダイアログ
var dialog = $('<div>').css({padding:'10px'}).html('<div style="text-align:center">Password Converter</div>');

var keyword = $('<input type="text" pwcvid="_key">');
var password = $('<input type="password" pwcvid="_pas">');

var pattern = $('<select pwcvid="_pat">');
$('ABCDE'.split('')).each(function(){
	pattern.append($('<option>').text(this));
});
var letter = $('<select pwcvid="_let">');
$(['-','upper','lower']).each(function(){
	letter.append($('<option>').text(this));
});
var offset1 = $('<select pwcvid="_os1">');
var offset2 = $('<select pwcvid="_os2">');
for(i=0;i<=30;i++){
	offset1.append($('<option>').text(i));
	offset2.append($('<option>').text(i));
}

// フォーム
var form = $('<form>')
.append(keyword)
.append($('<br/>'))
.append(password)
.append($('<br/>'))
.append($('<button type="button">').text('OK').click(function(){
	var hash = create_hash_password(
		keyword.val(),
		password.val(),
		pattern.val(),
		letter.val(),
		[offset1.val(),offset2.val()]
	);
	$('input[type=password][pwcvat!=_pas]').val(hash);
	$('#_bmldlg').remove();
}))
.append($('<button type="button">').text('CANCEL').click(function(){
	$('#_bmldlg').remove();
}))
.append($('<br/>'))
.append(pattern)
.append(letter)
.append(offset1)
.append(offset2)
.appendTo(dialog);

$('<div>')
.css({
	position: 'fixed',
	top: '10%',
	left: '30%',
	overflow: 'auto',
	backgroundColor: '#fff',
	color: '#000',
	border: '1px solid #999',
	'*border': '1px solid #999',
	'-webkit-border-radius':'6px',
	'-moz-border-radius':'6px',
	'border-radius': '6px',
	'-webkit-box-shadow': '0 3px 7px rgba(0, 0, 0, 0.3)',
	'-moz-box-shadow': '0 3px 7px rgba(0, 0, 0, 0.3)',
	'box-shadow': '0 3px 7px rgba(0, 0, 0, 0.3)',
	'-webkit-background-clip': 'padding-box',
	'-moz-background-clip': 'padding-box',
	'background-clip': 'padding-box'
}).append(dialog).appendTo('#_bmldlg');

// 初期化
keyword.val(document.location.host)
pattern.val('A');
letter.val('-');
offset1.val(0);
offset2.val(10);
password.focus();

})();
