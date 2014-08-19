/*!
  xiao D app web pages
  Author:: lijia
  Date:: 2014/5/22
 */
"use strict";
(function (win, doc) {
	var win = window;
	if (win['Mdict'] === undefined) win['Mdict'] = {};
	var Mdict = win['Mdict'];

	// Common
	Mdict.Common = {
		formartBR: function (str) {
			if (str) {
				str = str.replace(/\n/g, "<br>").replace(/\r\n/g, "<br>");
			}
			return str;
		},
		formartWord: function (str) {
			var m = /^[0-9\u4e00-\u9faf]+$/; //判断是英翻中才执行
			if (str && Request[0] == "en" && m.test(decodeURIComponent(Request[1]))) {
				str = str.replace(/\b[A-Za-z].+\b/g, '<a href="hjdict://searchword?word=$&">$&</a>').replace(/\n/g, "<br>").replace(/\r\n/g, "<br>");
			}
			else {
				str = str.replace(/\n/g, "<br>").replace(/\r\n/g, "<br>");
			}
			return str;
		},
		GetRequest: function () {
			var url = encodeURI(decodeURIComponent(location.href)),
				findex = url.indexOf("/em/ios/2.0/"),
				theRequest = new Object();
			if (findex != -1) {
				var str = url.slice(findex + ("/em/ios/2.0/").length),
					strs = str.split("/");
				for (var i = 0; i < strs.length; i++) {
					theRequest[i] = strs[i];
				}
			}
			return theRequest;
		},
		isChinese: function (temp) {
			var re = /.*[\u4e00-\u9fa5]+.*$/;
			if (re.test(temp)) return false;
			return true;
		},
		formartCY: function (str, wordList) {
			var regex, html;
			for (var i in wordList) {
				// regex = new RegExp("^" + wordList[i] + "@[a-z]*","m");
				str = str.replace("\r\n" + wordList[i], "<p/><p class='mt10'><a href='hjdict://searchword?word=" + wordList[i] + "' target='_blank' class='mr10'>" + wordList[i] + "</a>");
			}
			return str;
		}
	};

	var cssPrefix = $.browser.cssPrefix,
		vendorPrefix = $.browser.vendorPrefix,
		transform = cssPrefix + "transform",
		canTouch = "ontouchstart" in window,
		click = canTouch ? "tap" : "click",
		baseUrl = '/em/iOS/2.0/service',
		wsiteUrl = "http://api.site.hujiang.com/web/LinkDict.ashx?op=GetLinkDictByWord",
		Request = new Object(),
		Request = Mdict.Common.GetRequest();


	// AudioPlayer
	Mdict.AudioPlayer = {
		audioPlayer: ".audioPlayer",

		init: function () {
			$(this.audioPlayer).live(click, function (e) {
				var voiceurl = $(this).find("audio").attr("data-src");
				var $iconBtn = $(this).find(".icon-play");
				$iconBtn.addClass("icon-loading");
				Mdict.AudioPlayer.playSound($(this), voiceurl);
			});
		},
		playSound: function (obj, urlOrWords) {
			if (!urlOrWords) return;
			if (this.htmlAudio.canPlay && this.htmlAudio.mp3) {
				this.htmlAudio.audioPlayer = obj;
				this.htmlAudio.play(urlOrWords);
				return;
			}
		},
		_installSoundPlayer: function (container, id, vars) {
			container = container || document.body;
			id = id || "hjdext_sound_player";
			vars = vars || "";
			var file = "http://dict.hjenglish.com/flash/sound2.swf";

			var obj;
			//create flash object, use classid for IE only
			var isIE = navigator.userAgent.toLowerCase().indexOf("msie") != -1;
			if (isIE) {
				//prevent swf cache because it doesnt' play sound if the swf cached in IE
				file += "?r=" + Math.random();
				obj = "<object classid='clsid:d27cdb6e-ae6d-11cf-96b8-444553540000'";
			}
			else {
				obj = "<object type='application/x-shockwave-flash' data='" + file + "'";
			}
			obj += " width='1' height='1' id='" + id + "' name='" + id + "'>";

			if (isIE) obj += "<param name='movie' value='" + file + "' />";
			obj += "<param name='flashvars' value='" + vars + "' />";
			obj += "<param name='allowScriptAccess' value='always' />";
			obj += "<param name='wmode' value='transparent' />";
			obj += "</object>";

			var div = document.createElement("div");
			div.id = id + "_wrapper";
			div.style.cssText = "width:0;height:0;margin:0;padding:0;border:0;position:absolute;";
			div.innerHTML = obj;
			container.appendChild(div);
			return obj;
		},
		htmlAudio: (function () {
			var obj = {
				audioPlayer: null,
				play: function (url) {
					var elem = this._element || (this._element = document.createElement("audio"));
					elem.autoplay = "autoplay";
					elem.src = url;
					elem.load();
					$(elem).bind("canplaythrough", function () {
						elem.play();
						$(".audioPlayer .icon-play").attr("class", "icon-play");
						Mdict.AudioPlayer.htmlAudio.audioPlayer.find(".icon-play").addClass("icon-pause");
					});
					$(elem).bind("timeupdate", function () {
						var me = this;
						setTimeout(function () {
							if (me.ended) {
								Mdict.AudioPlayer.htmlAudio.audioPlayer.find(".icon-play").attr("class", "icon-play");
							}
						}, 300);
					});

					return this;
				},
				_element: null
			};

			//feature detection
			//see more: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/audio.js
			var elem = document.createElement("audio");
			if (obj.canPlay = !!elem.canPlayType) {
				obj.mp3 = elem.canPlayType('audio/mpeg;').replace(/^no$/, '');
			}

			return obj;
		})()
	};

	// WordInfo
	Mdict.WordInfo = {
		_templates: {},
		container: ".wordDetail-box",
		definitionBox: "#word-definition",
		navBar: "#navBar",
		navBtn: "#navBar li",
		navMark: "#navMark",
		sentenceList: "#word-example .sentence-list",
		wordData: null,
		articleData: null,

		getTemplate: function (obj, tmplId) {
			var templateFn = this._templates[tmplId];
			if (!templateFn) {
				var tmpl = doT.template($("#" + tmplId).html());
				templateFn = this._templates[tmplId] = tmpl;
			}
			var html = templateFn(obj);
			return html;
		},
		getWordData: function (lang, word, type, version) {
			var url = baseUrl + '/' + lang + '/' + word + '/' + type + '/' + version;
			this.addLoading();
			$.ajax({
				url: url,
				type: 'get',
				dataType: 'json',
				timeout: 10000,
				error: function (e) {
					Mdict.WordInfo.removeLoading();
					$(Mdict.WordInfo.container).html('<p class="txt_c" style="margin-top: 40px;">查询超时，请检查网络，或稍后重试。</p>');
				},
				success: function (data) {},
				complete: function (data) {
					if (data.statusText == "OK") {
						var json = JSON.parse(data.responseText);
						Mdict.WordInfo.wordData = json;
						Mdict.WordInfo.renderWord(json);
					}
				}
			});
		},
		getArticleData: function (lang, word) {
			var url = wsiteUrl + '&langs=' + lang + '&word=' + word;
			$.ajax({
				url: url,
				type: 'get',
				dataType: 'jsonp',
				timeout: 10000,
				success: function (data) {
					Mdict.WordInfo.renderArticle(data);
				}
			});
		},
		renderWord: function (json) {
			var html,
				type,
				definitionData = [],
				status = Request[2],
				recommendData = [];

			type = json.content.Type;
			definitionData = json.content.Definition;
			definitionData && (definitionData.word = decodeURIComponent(Request[1]));
			recommendData = json.content.RecommendList;

			if (type == 2) {
				html = Mdict.WordInfo.getTemplate(definitionData, "definition-tmpl");
				if (status == 1) {
					$(Mdict.WordInfo.navBar).show();
				}
				// 与app通信
				window.HJApp.didLoadFinish();
			}
			else if (type == 3 && status == 1) {
				html = Mdict.WordInfo.getTemplate(recommendData, "wordRecommend-tmpl");
				// 与app通信
				window.HJApp.didLoadFinish();
			}
			else {
				var lang = "";
				if (Request[0] == "en") {
					lang = '中英互译查询不到“' + decodeURIComponent(Request[1]) + '”';
				}
				else if (Request[0] == "cj") {
					lang = '中译日查询不到“' + decodeURIComponent(Request[1]) + '”，建议日译中查询';
				}
				else if (Request[0] == "jp") {
					lang = '日译中查询不到“' + decodeURIComponent(Request[1]) + '”，建议中译日查询';
				}
				else if (Request[0] == "kr") {
					lang = '中韩互译查询不到“' + decodeURIComponent(Request[1]) + '”';
				}
				else if (Request[0] == "fr") {
					lang = '中法互译查询不到“' + decodeURIComponent(Request[1]) + '”';
				}
				html = '<p class="txt_c" style="margin-top: 40px;">' + lang + '</p>';
			}

			Mdict.WordInfo.removeLoading();
			$(Mdict.WordInfo.container).html(html);


			Mdict.WordInfo.setCollins();
			Mdict.WordInfo.setPayloadDesc();
			if (type == 2 && status == 0) {
				var url = '/em/ios/2.0/' + Request[0] + '/' + Request[1] + '/1';
				$(this.definitionBox).append("<p class='mt10 txt_c'><a href='" + url + "' style='margin-top:10px;font-size: 1.2rem;border:1px solid #4688d8;border-radius: 3px;padding: 5px 14px;color:#4688d8;text-decoration: none;'>获取网络释义</a></p>");
			}
			Mdict.WordInfo.initTabButton();
			Mdict.AudioPlayer.init();
			Mdict.WordInfo.tabSwitchAction();
			Mdict.WordInfo.panelSwitchAction();
			this.setClient($("#word-definition"));
		},
		setClient: function (obj) {
			var $obj = obj;
			var screenHeight = window.screen.height;
			var bHeight = $("#wrapper").height();
			var defaultH = 160;
			if (!Request[3]) {
				defaultH = 194;
			}
			if (bHeight > (screenHeight - defaultH) && bHeight < 2 * (screenHeight - defaultH)) {
				$obj.css("min-height", 2 * (screenHeight - defaultH));
			}
		},
		setCollins: function () {
			var html,
				collins = [],
				$wordItem = $("#word-definition .word-item"),
				definition = this.wordData.content.Definition;

			collins.content = this.wordData.content.Collins;
			if (collins.content) {
				var src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAAaCAYAAAAUqxq7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2lpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDE0IDc5LjE1MTQ4MSwgMjAxMy8wMy8xMy0xMjowOToxNSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDozREQ1RTA5NkQ0QzZFMzExOTYyNEU5MTY4NzVCMjUzNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFOTdGMTkwN0VDNzgxMUUzOEU4QkE3RUE5NTk1NzhENyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFOTdGMTkwNkVDNzgxMUUzOEU4QkE3RUE5NTk1NzhENyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6OGJkMWVmNjAtMTM3Yy1kODQwLWJjYjEtMmI5NDA3YzAzOWRiIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjNERDVFMDk2RDRDNkUzMTE5NjI0RTkxNjg3NUIyNTM2Ii8+IDwvcmRmOkRlc2Ny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';
				var collinsTip = '' + '<p class="mt10 small txt_r collins_tip">' + '<i style="font-style: italic;">powered by </i>' + '<img src="' + src + '" height=13 style="vertical-align: -2px;" />' + '</p>';
				$("#word-definition").append(collinsTip);

				if (definition) {
					var simpleCommentList = definition.SimpleCommentList;
					for (var i = 0; i < simpleCommentList.length; i++) {
						var desc = simpleCommentList[i].Desc.replace(/\r/g, "");
						desc = desc.split("\n");
						for (var j = 0; j < desc.length; j++) {
							if (collins.content == desc[j]) {
								collins.isSame = true;
							}
						};
					};
				}
				html = Mdict.WordInfo.getTemplate(collins, "collins-tmpl");
				if ($wordItem.length) {
					$("#word-definition .word-item").eq(-1).find(".item-con").append(html);
				}
				else {
					$(".collins_tip").before(html);
				}
			}
		},
		setPayloadDesc: function () {
			var payloadDesc = this.wordData.content.PayloadDesc,
				html = '<p style="color:#68BF4A;" class="mt10">* ' + payloadDesc + '</p>';
			if (payloadDesc) {
				if ($(".collins_tip").length) {
					$(".collins_tip").before(html);
				}
				else {
					$("#word-definition").append(html);
				}
			}
		},
		addLoading: function () {
			var html = '<div class="loading-box"><img src="/services/client_v2/iOS/images/loading.gif" width="30" height="30"><div>';
			$("#wrapper").append(html);
		},
		removeLoading: function () {
			$(".loading-box").remove();
		},
		renderArticle: function (json) {
			var html;
			if (!json.Code) {
				html = Mdict.WordInfo.getTemplate(json.Value, "article-tmpl");
				$(Mdict.WordInfo.sentenceList) && $(Mdict.WordInfo.sentenceList).append(html);
			}
		},
		getTmplData: function (str) {
			var data,
				contentData = this.wordData.content;

			if (str == "definition") {
				data = contentData.Definition;
			}
			else if (str == "extension") {
				data = contentData.Extension;
			}
			else if (str == "example") {
				data = contentData.Example;
			}
			return data;
		},
		panelSwitchAction: function () {
			$(".item-title").live(click, function (e) {
				if ($(e.target).eq(0).parents(".audioPlayer").length || $(e.target).eq(0).is(".audioPlayer")) {
					return;
				}
				var $wordItem = $(this).parents(".word-item");
				$wordItem.find(".item-con").toggle();
				$wordItem.toggleClass("closed");
				var $wordPanel = $("#word-" + $("#navBar .active").attr("data-nav"));
				Mdict.WordInfo.setClient($wordPanel);
			});
		},
		tabSwitchAction: function () {
			$(this.navBar).find("li").bind(click, function () {
				var html,
					$that = $(this),
					dataNav = $that.attr("data-nav"),
					$panel = $("#word-" + dataNav),
					$container = $(Mdict.WordInfo.container),
					iconName = $that.find("i").attr("class");

				if (!$panel.length) {
					html = Mdict.WordInfo.getTemplate(Mdict.WordInfo.getTmplData(dataNav), dataNav + "-tmpl");
					$container.append(html);

					if ($that.attr("data-nav") === "example" && Mdict.Common.isChinese(decodeURI(location.href))) {
						Mdict.WordInfo.getArticleData(Request[0], Request[1]);
					}
				}

				$(Mdict.WordInfo.navBar).find("li").removeClass("active");
				$that.addClass("active");
				$(Mdict.WordInfo.navBar).find("i").each(function () {
					$(this).attr("class", "icon-" + $(this).parent("li").attr("data-nav"));
				});
				$that.find("i").attr("class", iconName + " " + iconName + "Active");

				Mdict.WordInfo.setNavMark($that.index());

				$container.children().hide();
				$("#word-" + dataNav).show();
				window.scrollTo(0, 0);
				setTimeout(function () {
					Mdict.WordInfo.setClient($("#word-" + dataNav));
				}, 300);
			});
		},
		setNavMark: function (index) {
			var $navMark = $(Mdict.WordInfo.navMark),
				$navBtn = $(Mdict.WordInfo.navBtn),
				markPosition = Math.round($navBtn.eq(index).offset().left),
				navWidth = $navBtn.width(),
				time = (navWidth - 300) * 0.3 + 250 >> 0;

			$navMark.css("width", navWidth + "px");
			Mdict.WordInfo.animateTransform($navMark.get(0), "translate(" + markPosition + "px, 0)", time);
			$navMark.css(transform, "translate(" + markPosition + "px, 0)");
		},
		initTabButton: function () {
			var i = 0,
				contentData = this.wordData.content,
				$navMark = $(Mdict.WordInfo.navMark),
				$navBar = $(Mdict.WordInfo.navBar);

			contentData.Definition && (contentData.Extension || contentData.Example) && $navBar.find(".definition").show() && i++;
			(!contentData.Extension && !contentData.Example) && $navBar.hide();
			contentData.Extension && $navBar.find(".extension").show() && i++;
			contentData.Example && $navBar.find(".example").show() && i++;
			$navBar.find("li").css("width", 100 / i + "%");
			$navMark.css("width", 100 / i + "%");
			if (i == 0) {
				$("#wrapper").css("padding-bottom", "0");
			}
		},
		render: function () {
			this.getWordData(Request[0], escape(Request[1]), Request[2], Request[3]);
		},
		animateTransform: function (elem, transforms, duration, ease, complete) {
			if (duration == 0) {
				elem.style[vendorPrefix + "Transform"] = transforms;
				return;
			}

			var css = elem.style;
			css[vendorPrefix + "TransitionProperty"] = "transform";
			css[vendorPrefix + "TransitionDuration"] = duration / 1000 + "s";
			css[vendorPrefix + "TransitionTimingFunction"] = ease || "linear";
			setTimeout(function () {
				css[vendorPrefix + "Transform"] = transforms;
			}, 100);
			if (complete) {
				var type = $.browser.vendorPrefix == "Moz" ? "transitionend" : vendorPrefix + "TransitionEnd";
				elem.addEventListener(type, function (e) {
					elem.removeEventListener(e.type, arguments.callee);
					complete.call(elem);
				});
			}
		}
	}
})(window, document);
(function () {
	var callbacksCount = 1
	var callbacks = {}

	window.HJApp = {
		send_message: function (method, args, callback) {
			var hasCallback = callback && typeof callback == 'function'
			var callbackId = hasCallback ? callbacksCount++ : 0
			if (hasCallback) callbacks[callbackId] = callback

			if (args)
				args['callbackId'] = callbackId
			args = (typeof args === 'object') ? JSON.stringify(args) : args + ''
			var href = 'hjjs://_?method=' + method + '&args=' + encodeURIComponent(args) + '&callbackId=' + callbackId
			var iframe = document.createElement("IFRAME")
			iframe.setAttribute('src', href)
			iframe.setAttribute("height", "1px")
			iframe.setAttribute("width", "1px")
			document.documentElement.appendChild(iframe)
			iframe.parentNode.removeChild(iframe)
			iframe = null
		},

		callback: function (callbackId, retValue) {
			try {
				var callback = callbacks[callbackId]
				if (!callback) return
				callback.apply(null, [retValue])
			}
			catch (e) {
				alert(e)
			}
		},
		didLoadFinish: function () {
			this.send_message('didLoadFinish', null, null);
		}
	}
})();