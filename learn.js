// トークン (抽象クラスとして扱う。以下のタイプ付きトークンの雛形)
var Token = function (line) {
	this.lineNumber = line;
};

Token.prototype.getLineNumber = function () { return this.lineNumber; };
Token.prototype.isIdentifier = function () { return false; };
Token.prototype.isNumber = function () { return false; };
Token.prototype.isString = function () { return false; };

Token.prototype.getNumber = function () {
	throw new Error('not number token');
};
Token.prototype.getText = function () {
	return '';
};
Token.prototype.toString = function () {
	return this.getText();
};

Token.EOF = new Token(-1);
Token.EOL = '\\n';


// 数字のトークン
var NumToken = function (line, number) {
	this.lineNumber = line;
	this.value = number|0;
};
NumToken.prototype = new Token();
NumToken.prototype.isNumber = function () {
	return true;
};
NumToken.prototype.getText = function () {
	return this.value + '';
};
NumToken.prototype.getNumber = function () {
	return this.value;
};


// 識別子のトークン
var IdToken = function (line, id) {
	this.lineNumber = line;
	this.text = id;
};
IdToken.prototype = new Token();
IdToken.prototype.isIdentifier = function () {
	return true;
};
IdToken.prototype.getText = function () {
	return this.text;
};


// 文字列のトークン
var StrToken = function (line, str) {
	this.lineNumber = line;
	this.literal = str
		.replace(/^"|"$/g, '')
		.replace(/\\"/g, '"');
};
StrToken.prototype = new Token();
StrToken.prototype.isString = function () {
	return true;
};
StrToken.prototype.getText = function () {
	return this.literal;
};


// sourcecodeをtokenに分割するクラス
var Lexer = function (sourcecode) {
	this.sourcecode = sourcecode.split(/\n/); //ソースコードを１行ずつ配列に入れる

	this.hasMore = true;	//初期設定
	this.queue = [];		//初期設定
	this.lineNo = 0;		//初期設定

	this.tokenTypes = [{
		tokenClass: NumToken,
		pattern: /[\d]+/
	}, {
		tokenClass: IdToken,
		pattern: /[A-Z_a-z][A-Z_a-z0-9]*|==|<=|>=|&&|\\|\||{|}|\+|-|\*|=|<|>/
	}, {
		tokenClass: StrToken,
		pattern: /"(\\"|\\\\|\\n|[^"])*"/
	}];
//トークンのタイプを判別するためにパターンを設定
	this.pattern = generateTokensPattern(this.tokenTypes);//上で設定したパターンから実際に使うパターンへ変換？内容は155行目参照
};

// 実際にtokenに分割して、配列にして返す
Lexer.prototype.read = function () {
	if (this.fillQueue(0)) {//queueの中身がある場合
		return this.queue.shift();	//queueの配列の頭の値を取得し配列から消去する
	} else {
		return Token.EOF;
	}
};

// インデックスiのtokenを取得
Lexer.prototype.peek = function (i) {
	if (this.fillQueue(i)) {//this.queue[i]が存在するまで読み込んだ場合のthis.queue[0]はi番目ののtokenになる
		return this.queue[0];
	} else {
		return Token.EOF;
	}
};

// tokenを読み込んでqueueにためる
Lexer.prototype.fillQueue = function (i) {
	// iを指定して、「this.queue[i]が存在する」ようになるまで読み込み
	// (つまりiは、「先読みしておくインデックス数」という感じ)

	while (i >= this.queue.length) {
		if (this.hasMore) {			//readLineが読むものがある限り
			this.readLine();		//readLineを実行
		} else {
			return false;
		}
	}
	return true;
};

Lexer.prototype.readLine = function () {
	var line = this.sourcecode.shift(); //ソースコードの配列の頭の値を取得（１行）し配列から消す
	if (typeof line == 'undefined') {	//lineの関数が実行されない場合=underfinedの場合
		this.hasMore = false;			//hasmoreをfalse=queueへの追加を終わらせる
		return;
	}

	this.lineNo++;						//lineNoをカウント
	var lineNo = this.lineNo;			

	var matcher;
	while (matcher = line.match(this.pattern)) {	//取得した配列の中からパターンにマッチするものがある限り
		this.addToken(lineNo, matcher);				//addTokenを実行（行番号とマッチした中身）を代入
		line = line.slice(matcher.index + matcher[0].length);	//lineの中身をmatcherで抜き出した部分以降から読むようにする（抜き出した部分を消去）
	}
	this.queue.push(new IdToken(lineNo, Token.EOL));//改行を識別子のトークンとしてqueueに追加
};

Lexer.prototype.addToken = function (lineNo, matcher) {
	for (var i = 0; i < this.tokenTypes.length; i++) { //tokenTypesの長さ３回繰り返す
		if (matcher[i + 1]) {							
			this.queue.push(
				new this.tokenTypes[i].tokenClass(lineNo, matcher[0])//マッチしたタイプのトークンを追加
			);
		}
	}
};

var generateTokensPattern = function (tokenTypes) {
	var exps = [];

	tokenTypes.forEach(function (tokenType) {
		exps.push(							//パターンを繋げるためにパターンの両端の正規表現を表す記号を（）にかえる
			(tokenType.pattern + '')
				.replace(/^\//, '(')
				.replace(/\/$/, ')')
		);
	});

	return new RegExp(exps.join('|'));//|でつないで実際に使うためのパターンにする
};