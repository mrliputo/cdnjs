(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.outdatedBrowserRework = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* Highly dumbed down version of https://github.com/unclechu/node-deep-extend */

/**
 * Extening object that entered in first argument.
 *
 * Returns extended object or false if have no target object or incorrect type.
 *
 * If you wish to clone source object (without modify it), just use empty new
 * object as first argument, like this:
 *   deepExtend({}, yourObj_1, [yourObj_N]);
 */
module.exports = function deepExtend(/*obj_1, [obj_2], [obj_N]*/) {
	if (arguments.length < 1 || typeof arguments[0] !== "object") {
		return false
	}

	if (arguments.length < 2) {
		return arguments[0]
	}

	var target = arguments[0]

	for (var i = 1; i < arguments.length; i++) {
		var obj = arguments[i]

		for (var key in obj) {
			var src = target[key]
			var val = obj[key]

			if (typeof val !== "object" || val === null) {
				target[key] = val

				// just clone arrays (and recursive clone objects inside)
			} else if (typeof src !== "object" || src === null) {
				target[key] = deepExtend({}, val)

				// source value and new value is objects both, extending...
			} else {
				target[key] = deepExtend(src, val)
			}
		}
	}

	return target
}

},{}],2:[function(require,module,exports){
var UserAgentParser = require("ua-parser-js")
var languageMessages = require("./languages.json")
var deepExtend = require("./extend")

var DEFAULTS = {
	Chrome: 57, // Includes Chrome for mobile devices
	Edge: 39,
	Safari: 10,
	"Mobile Safari": 10,
	Opera: 50,
	Firefox: 50,
	Vivaldi: 1,
	IE: false
}

var EDGEHTML_VS_EDGE_VERSIONS = {
	12: 0.1,
	13: 21,
	14: 31,
	15: 39,
	16: 41,
	17: 42
}

var COLORS = {
	salmon: "#f25648",
	white: "white"
}

var updateDefaults = function(defaults, updatedValues) {
	for (var key in updatedValues) {
		if (defaults.hasOwnProperty(key)) {
			defaults[key] = updatedValues[key]
		}
	}

	return defaults
}

module.exports = function(options) {
	var main = function() {
		// Despite the docs, UA needs to be provided to constructor explicitly:
		// https://github.com/faisalman/ua-parser-js/issues/90
		var parsedUserAgent = new UserAgentParser(window.navigator.userAgent).getResult()

		// Variable definition (before ajax)
		var outdatedUI = document.getElementById("outdated")

		options = options || {}

		var browserLocale = window.navigator.language || window.navigator.userLanguage // Everyone else, IE

		// Set default options
		var browserSupport = options.browserSupport ? updateDefaults(DEFAULTS, options.browserSupport) : DEFAULTS
		// CSS property to check for. You may also like 'borderSpacing', 'boxShadow', 'transform', 'borderImage';
		var requiredCssProperty = options.requiredCssProperty || false
		var backgroundColor = options.backgroundColor || COLORS.salmon
		var textColor = options.textColor || COLORS.white
		var fullscreen = options.fullscreen || false
		var language = options.language || browserLocale.slice(0, 2) // Language code

		var updateSource = "web" // Other possible values are 'googlePlay' or 'appStore'. Determines where we tell users to go for upgrades.

		// Chrome mobile is still Chrome (unlike Safari which is 'Mobile Safari')
		var isAndroid = parsedUserAgent.os.name === "Android"
		if (isAndroid) {
			updateSource = "googlePlay"
		}

		var isAndroidButNotChrome
		if (options.requireChromeOnAndroid) {
			isAndroidButNotChrome = isAndroid && parsedUserAgent.browser.name !== "Chrome"
		}

		if (parsedUserAgent.os.name === "iOS") {
			updateSource = "appStore"
		}

		var done = true

		var changeOpacity = function(opacityValue) {
			outdatedUI.style.opacity = opacityValue / 100
			outdatedUI.style.filter = "alpha(opacity=" + opacityValue + ")"
		}

		var fadeIn = function(opacityValue) {
			changeOpacity(opacityValue)
			if (opacityValue === 1) {
				outdatedUI.style.display = "table"
			}
			if (opacityValue === 100) {
				done = true
			}
		}

		var isBrowserOutOfDate = function() {
			var browserName = parsedUserAgent.browser.name
			var browserMajorVersion = parsedUserAgent.browser.major
			if (browserName === "Edge") {
				browserMajorVersion = EDGEHTML_VS_EDGE_VERSIONS[browserMajorVersion]
			}
			var isOutOfDate = false
			if (!(browserName in browserSupport)) {
				if (!options.isUnknownBrowserOK) {
					isOutOfDate = true
				}
			} else if (!browserSupport[browserName]) {
				isOutOfDate = true
			} else if (browserMajorVersion < browserSupport[browserName]) {
				isOutOfDate = true
			}
			return isOutOfDate
		}

		// Returns true if a browser supports a css3 property
		var isPropertySupported = function(property) {
			if (!property) {
				return true
			}
			var div = document.createElement("div")
			var vendorPrefixes = ["khtml", "ms", "o", "moz", "webkit"]
			var count = vendorPrefixes.length

			// Note: HTMLElement.style.hasOwnProperty seems broken in Edge
			if (property in div.style) {
				return true
			}

			property = property.replace(/^[a-z]/, function(val) {
				return val.toUpperCase()
			})

			while (count--) {
				var prefixedProperty = vendorPrefixes[count] + property
				// See comment re: HTMLElement.style.hasOwnProperty above
				if (prefixedProperty in div.style) {
					return true
				}
			}
			return false
		}

		var makeFadeInFunction = function(opacityValue) {
			return function() {
				fadeIn(opacityValue)
			}
		}

		// Style element explicitly - TODO: investigate and delete if not needed
		var startStylesAndEvents = function() {
			var buttonClose = document.getElementById("buttonCloseUpdateBrowser")
			var buttonUpdate = document.getElementById("buttonUpdateBrowser")

			//check settings attributes
			outdatedUI.style.backgroundColor = backgroundColor
			//way too hard to put !important on IE6
			outdatedUI.style.color = textColor
			outdatedUI.children[0].children[0].style.color = textColor
			outdatedUI.children[0].children[1].style.color = textColor

			// Update button is desktop only
			if (buttonUpdate) {
				buttonUpdate.style.color = textColor
				if (buttonUpdate.style.borderColor) {
					buttonUpdate.style.borderColor = textColor
				}

				// Override the update button color to match the background color
				buttonUpdate.onmouseover = function() {
					this.style.color = backgroundColor
					this.style.backgroundColor = textColor
				}

				buttonUpdate.onmouseout = function() {
					this.style.color = textColor
					this.style.backgroundColor = backgroundColor
				}
			}

			buttonClose.style.color = textColor

			buttonClose.onmousedown = function() {
				outdatedUI.style.display = "none"
				return false
			}
		}

		var getmessage = function(lang) {
			var defaultMessages = languageMessages[lang] || languageMessages.en
			var customMessages = options.messages && options.messages[lang]
			var messages = deepExtend({}, defaultMessages, customMessages)

			var updateMessages = {
				web:
					"<p>" +
					messages.update.web +
					'<a id="buttonUpdateBrowser" rel="nofollow" href="' +
					messages.url +
					'">' +
					messages.callToAction +
					"</a></p>",
				googlePlay:
					"<p>" +
					messages.update.googlePlay +
					'<a id="buttonUpdateBrowser" rel="nofollow" href="https://play.google.com/store/apps/details?id=com.android.chrome">' +
					messages.callToAction +
					"</a></p>",
				appStore: "<p>" + messages.update[updateSource] + "</p>"
			}

			var updateMessage = updateMessages[updateSource]

			return (
				'<div class="vertical-center"><h6>' +
				messages.outOfDate +
				"</h6>" +
				updateMessage +
				'<p class="last"><a href="#" id="buttonCloseUpdateBrowser" title="' +
				messages.close +
				'">&times;</a></p></div>'
			)
		}

		// Check if browser is supported
		if (isBrowserOutOfDate() || !isPropertySupported(requiredCssProperty) || isAndroidButNotChrome) {
			// This is an outdated browser
			if (done && outdatedUI.style.opacity !== "1") {
				done = false

				for (var opacity = 1; opacity <= 100; opacity++) {
					setTimeout(makeFadeInFunction(opacity), opacity * 8)
				}
			}

			var insertContentHere = document.getElementById("outdated")
			if (fullscreen) {
				insertContentHere.classList.add("fullscreen")
			}
			insertContentHere.innerHTML = getmessage(language)
			startStylesAndEvents()
		}
	}

	// Load main when DOM ready.
	var oldOnload = window.onload
	if (typeof window.onload !== "function") {
		window.onload = main
	} else {
		window.onload = function() {
			if (oldOnload) {
				oldOnload()
			}
			main()
		}
	}
}

},{"./extend":1,"./languages.json":3,"ua-parser-js":4}],3:[function(require,module,exports){
module.exports={
  "br": {
    "outOfDate": "O seu navegador est&aacute; desatualizado!",
    "update": {
      "web": "Atualize o seu navegador para ter uma melhor experi&ecirc;ncia e visualiza&ccedil;&atilde;o deste site. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/br",
    "callToAction": "Atualize o seu navegador agora",
    "close": "Fechar"
  },
  "cn": {
    "outOfDate": "您的浏览器已过时",
    "update": {
      "web": "要正常浏览本网站请升级您的浏览器。",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/cn",
    "callToAction": "现在升级",
    "close": "关闭"
  },
  "cz": {
    "outOfDate": "Váš prohlížeč je zastaralý!",
    "update": {
      "web": "Pro správné zobrazení těchto stránek aktualizujte svůj prohlížeč. ",
      "googlePlay": "Nainstalujte si Chrome z Google Play",
      "appStore": "Aktualizujte si systém iOS"
    },
    "url": "http://outdatedbrowser.com/cz",
    "callToAction": "Aktualizovat nyní svůj prohlížeč",
    "close": "Zavřít"
  },
   "da": {
    "outOfDate": "Din browser er forældet!",
    "update": {
      "web": "Opdatér din browser for at få vist denne hjemmeside korrekt. ",
      "googlePlay": "Installér venligst Chrome fra Google Play",
      "appStore": "Opdatér venligst iOS"
    },
    "url": "http://outdatedbrowser.com/da",
    "callToAction": "Opdatér din browser nu",
    "close": "Luk"
  },
  "de": {
    "outOfDate": "Ihr Browser ist veraltet!",
    "update": {
      "web": "Bitte aktualisieren Sie Ihren Browser, um diese Website korrekt darzustellen. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/de",
    "callToAction": "Den Browser jetzt aktualisieren ",
    "close": "Schließen"
  },
  "ee": {
    "outOfDate": "Sinu veebilehitseja on vananenud!",
    "update": {
      "web": "Palun uuenda oma veebilehitsejat, et näha lehekülge korrektselt. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/ee",
    "callToAction": "Uuenda oma veebilehitsejat kohe",
    "close": "Sulge"
  },
  "en": {
    "outOfDate": "Your browser is out-of-date!",
    "update": {
      "web": "Update your browser to view this website correctly. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/",
    "callToAction": "Update my browser now",
    "close": "Close"
  },
  "es": {
    "outOfDate": "¡Tu navegador está anticuado!",
    "update": {
      "web": "Actualiza tu navegador para ver esta página correctamente. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/es",
    "callToAction": "Actualizar mi navegador ahora",
    "close": "Cerrar"
  },
  "fa": {
    "rightToLeft": true,
    "outOfDate": "مرورگر شما منسوخ شده است!",
    "update": {
      "web": "جهت مشاهده صحیح این وبسایت، مرورگرتان را بروز رسانی نمایید. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/",
    "callToAction": "همین حالا مرورگرم را بروز کن",
    "close": "Close"
  },
  "fi": {
    "outOfDate": "Selaimesi on vanhentunut!",
    "update": {
      "web": "Lataa ajantasainen selain n&auml;hd&auml;ksesi t&auml;m&auml;n sivun oikein. ",
      "googlePlay": "Asenna uusin Chrome Google Play -kaupasta",
      "appStore": "Päivitä iOS puhelimesi asetuksista"
    },
    "url": "http://outdatedbrowser.com/fi",
    "callToAction": "P&auml;ivit&auml; selaimeni nyt ",
    "close": "Sulje"
  },
  "fr": {
    "outOfDate": "Votre navigateur n'est plus compatible !",
    "update": {
      "web": "Mettez à jour votre navigateur pour afficher correctement ce site Web. ",
      "googlePlay": "Merci d'installer Chrome depuis le Google Play Store",
      "appStore": "Merci de mettre à jour iOS depuis l'application Réglages"
    },
    "url": "http://outdatedbrowser.com/fr",
    "callToAction": "Mettre à jour maintenant ",
    "close": "Fermer"
  },
  "hu": {
    "outOfDate": "A böngészője elavult!",
    "update": {
      "web": "Firssítse vagy cserélje le a böngészőjét. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/hu",
    "callToAction": "A böngészőm frissítése ",
    "close": "Close"
  },
  "id":{
    "outOfDate": "Browser yang Anda gunakan sudah ketinggalan zaman!",
    "update": {
      "web": "Perbaharuilah browser Anda agar bisa menjelajahi website ini dengan nyaman. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/",
    "callToAction": "Perbaharui browser sekarang ",
    "close": "Close"
  },
  "it": {
    "outOfDate": "Il tuo browser non &egrave; aggiornato!",
    "update": {
      "web": "Aggiornalo per vedere questo sito correttamente. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/it",
    "callToAction": "Aggiorna ora",
    "close": "Chiudi"
  },
  "lt":{
    "outOfDate": "Jūsų naršyklės versija yra pasenusi!",
    "update": {
      "web": "Atnaujinkite savo naršyklę, kad galėtumėte peržiūrėti šią svetainę tinkamai. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/",
    "callToAction": "Atnaujinti naršyklę ",
    "close": "Close"
  },
  "nl": {
    "outOfDate": "Je gebruikt een oude browser!",
    "update": {
      "web": "Update je browser om deze website correct te bekijken. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/nl",
    "callToAction": "Update mijn browser nu ",
    "close": "Sluiten"
  },
  "pl": {
    "outOfDate": "Twoja przeglądarka jest przestarzała!",
    "update": {
      "web": "Zaktualizuj swoją przeglądarkę, aby poprawnie wyświetlić tę stronę. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/pl",
    "callToAction": "Zaktualizuj przeglądarkę już teraz",
    "close": "Close"
  },
  "pt": {
    "outOfDate": "O seu browser est&aacute; desatualizado!",
    "update": {
      "web": "Atualize o seu browser para ter uma melhor experi&ecirc;ncia e visualiza&ccedil;&atilde;o deste site. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/pt",
    "callToAction": "Atualize o seu browser agora",
    "close": "Fechar"
  },
  "ro": {
    "outOfDate": "Browserul este învechit!",
    "update": {
      "web": "Actualizați browserul pentru a vizualiza corect acest site. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/",
    "callToAction": "Actualizați browserul acum!",
    "close": "Close"
  },
  "ru": {
    "outOfDate": "Ваш браузер устарел!",
    "update": {
      "web": "Обновите ваш браузер для правильного отображения этого сайта. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/ru",
    "callToAction": "Обновить мой браузер ",
    "close": "Закрыть"
  },
  "si": {
    "outOfDate": "Vaš brskalnik je zastarel!",
    "update": {
      "web": "Za pravilen prikaz spletne strani posodobite vaš brskalnik. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/si",
    "callToAction": "Posodobi brskalnik ",
    "close": "Zapri"
  },
  "sv": {
    "outOfDate": "Din webbläsare stödjs ej längre!",
    "update": {
      "web": "Uppdatera din webbläsare för att webbplatsen ska visas korrekt. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/",
    "callToAction": "Uppdatera min webbläsare nu",
    "close": "Stäng"
  },
  "ua": {
    "outOfDate": "Ваш браузер застарів!",
    "update": {
      "web": "Оновіть ваш браузер для правильного відображення цього сайта. ",
      "googlePlay": "Please install Chrome from Google Play",
      "appStore": "Please update iOS from the Settings App"
    },
    "url": "http://outdatedbrowser.com/ua",
    "callToAction": "Оновити мій браузер ",
    "close": "Закрити"
  }
}

},{}],4:[function(require,module,exports){
/*!
 * UAParser.js v0.7.18
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 or MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '0.7.18',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major', // deprecated
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend : function (regexes, extensions) {
            var margedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    margedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    margedRegexes[i] = regexes[i];
                }
            }
            return margedRegexes;
        },
        has : function (str1, str2) {
          if (typeof str1 === "string") {
            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
          } else {
            return false;
          }
        },
        lowerize : function (str) {
            return str.toLowerCase();
        },
        major : function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined;
        },
        trim : function (str) {
          return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx : function (ua, arrays) {

            //var result = {},
            var i = 0, j, k, p, q, matches, match;//, args = arguments;

            /*// construct object barebones
            for (p = 0; p < args[1].length; p++) {
                q = args[1][p];
                result[typeof q === OBJ_TYPE ? q[0] : q] = undefined;
            }*/

            // loop through all regexes maps
            while (i < arrays.length && !matches) {

                var regex = arrays[i],       // even sequence (0,2,4,..)
                    props = arrays[i + 1];   // odd sequence (1,3,5,..)
                j = k = 0;

                // try matching uastring with regexes
                while (j < regex.length && !matches) {

                    matches = regex[j++].exec(ua);

                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        this[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        this[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        this[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                        this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                this[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            // console.log(this);
            //return this;
        },

        str : function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser : {
            oldsafari : {
                version : {
                    '1.0'   : '/8',
                    '1.2'   : '/1',
                    '1.3'   : '/3',
                    '2.0'   : '/412',
                    '2.0.2' : '/416',
                    '2.0.3' : '/417',
                    '2.0.4' : '/419',
                    '?'     : '/'
                }
            }
        },

        device : {
            amazon : {
                model : {
                    'Fire Phone' : ['SD', 'KF']
                }
            },
            sprint : {
                model : {
                    'Evo Shift 4G' : '7373KT'
                },
                vendor : {
                    'HTC'       : 'APA',
                    'Sprint'    : 'Sprint'
                }
            }
        },

        os : {
            windows : {
                version : {
                    'ME'        : '4.90',
                    'NT 3.11'   : 'NT3.51',
                    'NT 4.0'    : 'NT4.0',
                    '2000'      : 'NT 5.0',
                    'XP'        : ['NT 5.1', 'NT 5.2'],
                    'Vista'     : 'NT 6.0',
                    '7'         : 'NT 6.1',
                    '8'         : 'NT 6.2',
                    '8.1'       : 'NT 6.3',
                    '10'        : ['NT 6.4', 'NT 10.0'],
                    'RT'        : 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser : [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
            ], [NAME, VERSION], [

            /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
            ], [[NAME, 'Opera Mini'], VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
            ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]*)/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]*)/i,                                             // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser
            ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
            ], [[NAME, 'IE'], VERSION], [

            /(edge|edgios|edgea)\/((\d+)?[\w\.]+)/i                             // Microsoft Edge
            ], [[NAME, 'Edge'], VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
            ], [[NAME, 'Yandex'], VERSION], [

            /(puffin)\/([\w\.]+)/i                                              // Puffin
            ], [[NAME, 'Puffin'], VERSION], [

            /((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i
                                                                                // UCBrowser
            ], [[NAME, 'UCBrowser'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [

            /(micromessenger)\/([\w\.]+)/i                                      // WeChat
            ], [[NAME, 'WeChat'], VERSION], [

            /(qqbrowserlite)\/([\w\.]+)/i                                       // QQBrowserLite
            ], [NAME, VERSION], [

            /(QQ)\/([\d\.]+)/i                                                  // QQ, aka ShouQ
            ], [NAME, VERSION], [

            /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
            ], [NAME, VERSION], [

            /(BIDUBrowser)[\/\s]?([\w\.]+)/i                                    // Baidu Browser
            ], [NAME, VERSION], [

            /(2345Explorer)[\/\s]?([\w\.]+)/i                                   // 2345 Browser
            ], [NAME, VERSION], [

            /(MetaSr)[\/\s]?([\w\.]+)/i                                         // SouGouBrowser
            ], [NAME], [

            /(LBBROWSER)/i                                      // LieBao Browser
            ], [NAME], [

            /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
            ], [VERSION, [NAME, 'MIUI Browser']], [

            /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
            ], [VERSION, [NAME, 'Facebook']], [

            /headlesschrome(?:\/([\w\.]+)|\s)/i                                 // Chrome Headless
            ], [VERSION, [NAME, 'Chrome Headless']], [

            /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
            ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

            /((?:oculus|samsung)browser)\/([\w\.]+)/i
            ], [[NAME, /(.+(?:g|us))(.+)/, '$1 $2'], VERSION], [                // Oculus / Samsung Browser

            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
            ], [VERSION, [NAME, 'Android Browser']], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            ], [NAME, VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
            ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
            ], [[NAME, 'Chrome'], VERSION], [

            /(coast)\/([\w\.]+)/i                                               // Opera Coast
            ], [[NAME, 'Opera Coast'], VERSION], [

            /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, 'Firefox']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
            ], [VERSION, NAME], [

            /webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i  // Google Search Appliance on iOS
            ], [[NAME, 'GSA'], VERSION], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([\w\.-]+)$/i,

                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]*)/i,                                         // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
            ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
            ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
            ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, util.lowerize]]
        ],

        device : [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
            ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(hp).+(tablet)/i,                                                  // HP Tablet
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/.+silk\//i                                      // Kindle Fire HD
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/.+silk\//i                         // Fire Phone
            ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
            ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]*)/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
            ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
            ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /android.+\s([c-g]\d{4}|so[-l]\w+)\sbuild\//i
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[34portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
            ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w*)/i,                                                     // ZTE
            /(alcatel|geeksphone|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]*)/i
                                                                                // Alcatel/GeeksPhone/Lenovo/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /d\/huawei([\w\s-]+)[;\)]/i,
            /(nexus\s6p)/i                                                      // Huawei
            ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

            /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
            ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?:?(\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w*)/i,
            /(XT\d{3,4}) build\//i,
            /(nexus\s6)/i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
            ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
            ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /smart-tv.+(samsung)/i
            ], [VENDOR, [TYPE, SMARTTV], MODEL], [
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)/i,
            /sec-((sgh\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

            /sie-(\w*)/i                                                        // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]*)/i
            ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android.+([vl]k\-?\d{3})\s+build/i                                 // LG Tablet
            ], [MODEL, [VENDOR, 'LG'], [TYPE, TABLET]], [
            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
            ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w*)/i,
            /android.+lg(\-?[\d\w]+)\s+build/i
            ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /crkey/i                                                            // Google Chromecast
            ], [[MODEL, 'Chromecast'], [VENDOR, 'Google']], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
            ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+;\s(pixel c)\s/i                                          // Google Pixel C
            ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

            /android.+;\s(pixel xl|pixel)\s/i                                   // Google Pixel
            ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

            /android.+;\s(\w+)\s+build\/hm\1/i,                                 // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d?\w?)[\s_]*(?:plus)?)\s+build/i,    // Xiaomi Mi
            /android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+))\s+build/i       // Redmi Phones
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
            /android.+(mi[\s\-_]*(?:pad)(?:[\s_]*[\w\s]+))\s+build/i            // Mi Pad tablets
            ],[[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, TABLET]], [
            /android.+;\s(m[1-5]\snote)\sbuild/i                                // Meizu Tablet
            ], [MODEL, [VENDOR, 'Meizu'], [TYPE, TABLET]], [

            /android.+a000(1)\s+build/i,                                        // OnePlus
            /android.+oneplus\s(a\d{4})\s+build/i
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(RCT[\d\w]+)\s+build/i                            // RCA Tablets
            ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [

            /android.+[;\/\s]+(Venue[\d\s]{2,7})\s+build/i                      // Dell Venue Tablets
            ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i                         // Verizon Tablet
            ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [

            /android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i     // Barnes & Noble Tablet
            ], [[VENDOR, 'Barnes & Noble'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i                           // Barnes & Noble Tablet
            ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [

            /android.+;\s(k88)\sbuild/i                                         // ZTE K Series Tablet
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(gen\d{3})\s+build.*49h/i                         // Swiss GEN Mobile
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(zur\d{3})\s+build/i                              // Swiss ZUR Tablet
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i                         // Zeki Tablets
            ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [

            /(android).+[;\/]\s+([YR]\d{2})\s+build/i,
            /android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(\w{5})\sbuild/i        // Dragon Touch Tablet
            ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(NS-?\w{0,9})\sbuild/i                            // Insignia Tablets
            ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((NX|Next)-?\w{0,9})\s+build/i                    // NextBook Tablets
            ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Xtreme\_)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i
            ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [                    // Voice Xtreme Phones

            /android.+[;\/]\s*(LVTEL\-)?(V1[12])\s+build/i                     // LvTel Phones
            ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [

            /android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i          // Envizen Tablets
            ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(\w{1,9})\s+build/i          // Le Pan Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i                         // MachSpeed Tablets
            ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i                // Trinity Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*TU_(1491)\s+build/i                               // Rotor Tablets
            ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [

            /android.+(KS(.+))\s+build/i                                        // Amazon Kindle Tablets
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [

            /android.+(Gigaset)[\s\-]+(Q\w{1,9})\s+build/i                      // Gigaset Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /\s(tablet|tab)[;\/]/i,                                             // Unidentifiable Tablet
            /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
            ], [[TYPE, util.lowerize], VENDOR, MODEL], [

            /(android[\w\.\s\-]{0,9});.+build/i                                 // Generic Android Device
            ], [MODEL, [VENDOR, 'Generic']]


        /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine : [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
            ], [NAME, VERSION], [

            /rv\:([\w\.]{1,9}).+(gecko)/i                                       // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s\w]*)/i,                   // Windows Phone
            /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
            ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]*)/i,                                     // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]*)/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
            ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]*)/i                  // Symbian
            ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
            ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
            ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w*)/i,                                            // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|suse|opensuse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]*)/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]*)/i,                                        // Hurd/Linux
            /(gnu)\s?([\w\.]*)/i                                                // GNU
            ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
            ], [[NAME, 'Chromium OS'], VERSION],[

            // Solaris
            /(sunos)\s?([\w\.\d]*)/i                                            // Solaris
            ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]*)/i                    // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
            ], [NAME, VERSION],[

            /(haiku)\s(\w+)/i                                                   // Haiku
            ], [NAME, VERSION],[

            /cfnetwork\/.+darwin/i,
            /ip[honead]{2,4}(?:.*os\s([\w]+)\slike\smac|;\sopera)/i             // iOS
            ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [

            /(mac\sos\sx)\s?([\w\s\.]*)/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]*)/i,                             // Solaris
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.])*/i,                                // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]*)/i                                               // UNIX
            ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////
    /*
    var Browser = function (name, version) {
        this[NAME] = name;
        this[VERSION] = version;
    };
    var CPU = function (arch) {
        this[ARCHITECTURE] = arch;
    };
    var Device = function (vendor, model, type) {
        this[VENDOR] = vendor;
        this[MODEL] = model;
        this[TYPE] = type;
    };
    var Engine = Browser;
    var OS = Browser;
    */
    var UAParser = function (uastring, extensions) {

        if (typeof uastring === 'object') {
            extensions = uastring;
            uastring = undefined;
        }

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;
        //var browser = new Browser();
        //var cpu = new CPU();
        //var device = new Device();
        //var engine = new Engine();
        //var os = new OS();

        this.getBrowser = function () {
            var browser = { name: undefined, version: undefined };
            mapper.rgx.call(browser, ua, rgxmap.browser);
            browser.major = util.major(browser.version); // deprecated
            return browser;
        };
        this.getCPU = function () {
            var cpu = { architecture: undefined };
            mapper.rgx.call(cpu, ua, rgxmap.cpu);
            return cpu;
        };
        this.getDevice = function () {
            var device = { vendor: undefined, model: undefined, type: undefined };
            mapper.rgx.call(device, ua, rgxmap.device);
            return device;
        };
        this.getEngine = function () {
            var engine = { name: undefined, version: undefined };
            mapper.rgx.call(engine, ua, rgxmap.engine);
            return engine;
        };
        this.getOS = function () {
            var os = { name: undefined, version: undefined };
            mapper.rgx.call(os, ua, rgxmap.os);
            return os;
        };
        this.getResult = function () {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            //browser = new Browser();
            //cpu = new CPU();
            //device = new Device();
            //engine = new Engine();
            //os = new OS();
            return this;
        };
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME    : NAME,
        MAJOR   : MAJOR, // deprecated
        VERSION : VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE : ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL   : MODEL,
        VENDOR  : VENDOR,
        TYPE    : TYPE,
        CONSOLE : CONSOLE,
        MOBILE  : MOBILE,
        SMARTTV : SMARTTV,
        TABLET  : TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME    : NAME,
        VERSION : VERSION
    };
    UAParser.OS = {
        NAME    : NAME,
        VERSION : VERSION
    };
    //UAParser.Utils = util;

    ///////////
    // Export
    //////////


    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        // TODO: test!!!!!!!!
        /*
        if (require && require.main === module && process) {
            // cli
            var jsonize = function (arr) {
                var res = [];
                for (var i in arr) {
                    res.push(new UAParser(arr[i]).getResult());
                }
                process.stdout.write(JSON.stringify(res, null, 2) + '\n');
            };
            if (process.stdin.isTTY) {
                // via args
                jsonize(process.argv.slice(2));
            } else {
                // via pipe
                var str = '';
                process.stdin.on('readable', function() {
                    var read = process.stdin.read();
                    if (read !== null) {
                        str += read;
                    }
                });
                process.stdin.on('end', function () {
                    jsonize(str.replace(/\n$/, '').split('\n'));
                });
            }
        }
        */
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if (typeof(define) === FUNC_TYPE && define.amd) {
            define(function () {
                return UAParser;
            });
        } else if (window) {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window && (window.jQuery || window.Zepto);
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);

},{}]},{},[2])(2)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbmQuanMiLCJpbmRleC5qcyIsImxhbmd1YWdlcy5qc29uIiwibm9kZV9tb2R1bGVzL3VhLXBhcnNlci1qcy9zcmMvdWEtcGFyc2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogSGlnaGx5IGR1bWJlZCBkb3duIHZlcnNpb24gb2YgaHR0cHM6Ly9naXRodWIuY29tL3VuY2xlY2h1L25vZGUtZGVlcC1leHRlbmQgKi9cblxuLyoqXG4gKiBFeHRlbmluZyBvYmplY3QgdGhhdCBlbnRlcmVkIGluIGZpcnN0IGFyZ3VtZW50LlxuICpcbiAqIFJldHVybnMgZXh0ZW5kZWQgb2JqZWN0IG9yIGZhbHNlIGlmIGhhdmUgbm8gdGFyZ2V0IG9iamVjdCBvciBpbmNvcnJlY3QgdHlwZS5cbiAqXG4gKiBJZiB5b3Ugd2lzaCB0byBjbG9uZSBzb3VyY2Ugb2JqZWN0ICh3aXRob3V0IG1vZGlmeSBpdCksIGp1c3QgdXNlIGVtcHR5IG5ld1xuICogb2JqZWN0IGFzIGZpcnN0IGFyZ3VtZW50LCBsaWtlIHRoaXM6XG4gKiAgIGRlZXBFeHRlbmQoe30sIHlvdXJPYmpfMSwgW3lvdXJPYmpfTl0pO1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlZXBFeHRlbmQoLypvYmpfMSwgW29ial8yXSwgW29ial9OXSovKSB7XG5cdGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMSB8fCB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSBcIm9iamVjdFwiKSB7XG5cdFx0cmV0dXJuIGZhbHNlXG5cdH1cblxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcblx0XHRyZXR1cm4gYXJndW1lbnRzWzBdXG5cdH1cblxuXHR2YXIgdGFyZ2V0ID0gYXJndW1lbnRzWzBdXG5cblx0Zm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgb2JqID0gYXJndW1lbnRzW2ldXG5cblx0XHRmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG5cdFx0XHR2YXIgc3JjID0gdGFyZ2V0W2tleV1cblx0XHRcdHZhciB2YWwgPSBvYmpba2V5XVxuXG5cdFx0XHRpZiAodHlwZW9mIHZhbCAhPT0gXCJvYmplY3RcIiB8fCB2YWwgPT09IG51bGwpIHtcblx0XHRcdFx0dGFyZ2V0W2tleV0gPSB2YWxcblxuXHRcdFx0XHQvLyBqdXN0IGNsb25lIGFycmF5cyAoYW5kIHJlY3Vyc2l2ZSBjbG9uZSBvYmplY3RzIGluc2lkZSlcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIHNyYyAhPT0gXCJvYmplY3RcIiB8fCBzcmMgPT09IG51bGwpIHtcblx0XHRcdFx0dGFyZ2V0W2tleV0gPSBkZWVwRXh0ZW5kKHt9LCB2YWwpXG5cblx0XHRcdFx0Ly8gc291cmNlIHZhbHVlIGFuZCBuZXcgdmFsdWUgaXMgb2JqZWN0cyBib3RoLCBleHRlbmRpbmcuLi5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldFtrZXldID0gZGVlcEV4dGVuZChzcmMsIHZhbClcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGFyZ2V0XG59XG4iLCJ2YXIgVXNlckFnZW50UGFyc2VyID0gcmVxdWlyZShcInVhLXBhcnNlci1qc1wiKVxudmFyIGxhbmd1YWdlTWVzc2FnZXMgPSByZXF1aXJlKFwiLi9sYW5ndWFnZXMuanNvblwiKVxudmFyIGRlZXBFeHRlbmQgPSByZXF1aXJlKFwiLi9leHRlbmRcIilcblxudmFyIERFRkFVTFRTID0ge1xuXHRDaHJvbWU6IDU3LCAvLyBJbmNsdWRlcyBDaHJvbWUgZm9yIG1vYmlsZSBkZXZpY2VzXG5cdEVkZ2U6IDM5LFxuXHRTYWZhcmk6IDEwLFxuXHRcIk1vYmlsZSBTYWZhcmlcIjogMTAsXG5cdE9wZXJhOiA1MCxcblx0RmlyZWZveDogNTAsXG5cdFZpdmFsZGk6IDEsXG5cdElFOiBmYWxzZVxufVxuXG52YXIgRURHRUhUTUxfVlNfRURHRV9WRVJTSU9OUyA9IHtcblx0MTI6IDAuMSxcblx0MTM6IDIxLFxuXHQxNDogMzEsXG5cdDE1OiAzOSxcblx0MTY6IDQxLFxuXHQxNzogNDJcbn1cblxudmFyIENPTE9SUyA9IHtcblx0c2FsbW9uOiBcIiNmMjU2NDhcIixcblx0d2hpdGU6IFwid2hpdGVcIlxufVxuXG52YXIgdXBkYXRlRGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cywgdXBkYXRlZFZhbHVlcykge1xuXHRmb3IgKHZhciBrZXkgaW4gdXBkYXRlZFZhbHVlcykge1xuXHRcdGlmIChkZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRkZWZhdWx0c1trZXldID0gdXBkYXRlZFZhbHVlc1trZXldXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGRlZmF1bHRzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXIgbWFpbiA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIERlc3BpdGUgdGhlIGRvY3MsIFVBIG5lZWRzIHRvIGJlIHByb3ZpZGVkIHRvIGNvbnN0cnVjdG9yIGV4cGxpY2l0bHk6XG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2ZhaXNhbG1hbi91YS1wYXJzZXItanMvaXNzdWVzLzkwXG5cdFx0dmFyIHBhcnNlZFVzZXJBZ2VudCA9IG5ldyBVc2VyQWdlbnRQYXJzZXIod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpLmdldFJlc3VsdCgpXG5cblx0XHQvLyBWYXJpYWJsZSBkZWZpbml0aW9uIChiZWZvcmUgYWpheClcblx0XHR2YXIgb3V0ZGF0ZWRVSSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3V0ZGF0ZWRcIilcblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cblx0XHR2YXIgYnJvd3NlckxvY2FsZSA9IHdpbmRvdy5uYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgd2luZG93Lm5hdmlnYXRvci51c2VyTGFuZ3VhZ2UgLy8gRXZlcnlvbmUgZWxzZSwgSUVcblxuXHRcdC8vIFNldCBkZWZhdWx0IG9wdGlvbnNcblx0XHR2YXIgYnJvd3NlclN1cHBvcnQgPSBvcHRpb25zLmJyb3dzZXJTdXBwb3J0ID8gdXBkYXRlRGVmYXVsdHMoREVGQVVMVFMsIG9wdGlvbnMuYnJvd3NlclN1cHBvcnQpIDogREVGQVVMVFNcblx0XHQvLyBDU1MgcHJvcGVydHkgdG8gY2hlY2sgZm9yLiBZb3UgbWF5IGFsc28gbGlrZSAnYm9yZGVyU3BhY2luZycsICdib3hTaGFkb3cnLCAndHJhbnNmb3JtJywgJ2JvcmRlckltYWdlJztcblx0XHR2YXIgcmVxdWlyZWRDc3NQcm9wZXJ0eSA9IG9wdGlvbnMucmVxdWlyZWRDc3NQcm9wZXJ0eSB8fCBmYWxzZVxuXHRcdHZhciBiYWNrZ3JvdW5kQ29sb3IgPSBvcHRpb25zLmJhY2tncm91bmRDb2xvciB8fCBDT0xPUlMuc2FsbW9uXG5cdFx0dmFyIHRleHRDb2xvciA9IG9wdGlvbnMudGV4dENvbG9yIHx8IENPTE9SUy53aGl0ZVxuXHRcdHZhciBmdWxsc2NyZWVuID0gb3B0aW9ucy5mdWxsc2NyZWVuIHx8IGZhbHNlXG5cdFx0dmFyIGxhbmd1YWdlID0gb3B0aW9ucy5sYW5ndWFnZSB8fCBicm93c2VyTG9jYWxlLnNsaWNlKDAsIDIpIC8vIExhbmd1YWdlIGNvZGVcblxuXHRcdHZhciB1cGRhdGVTb3VyY2UgPSBcIndlYlwiIC8vIE90aGVyIHBvc3NpYmxlIHZhbHVlcyBhcmUgJ2dvb2dsZVBsYXknIG9yICdhcHBTdG9yZScuIERldGVybWluZXMgd2hlcmUgd2UgdGVsbCB1c2VycyB0byBnbyBmb3IgdXBncmFkZXMuXG5cblx0XHQvLyBDaHJvbWUgbW9iaWxlIGlzIHN0aWxsIENocm9tZSAodW5saWtlIFNhZmFyaSB3aGljaCBpcyAnTW9iaWxlIFNhZmFyaScpXG5cdFx0dmFyIGlzQW5kcm9pZCA9IHBhcnNlZFVzZXJBZ2VudC5vcy5uYW1lID09PSBcIkFuZHJvaWRcIlxuXHRcdGlmIChpc0FuZHJvaWQpIHtcblx0XHRcdHVwZGF0ZVNvdXJjZSA9IFwiZ29vZ2xlUGxheVwiXG5cdFx0fVxuXG5cdFx0dmFyIGlzQW5kcm9pZEJ1dE5vdENocm9tZVxuXHRcdGlmIChvcHRpb25zLnJlcXVpcmVDaHJvbWVPbkFuZHJvaWQpIHtcblx0XHRcdGlzQW5kcm9pZEJ1dE5vdENocm9tZSA9IGlzQW5kcm9pZCAmJiBwYXJzZWRVc2VyQWdlbnQuYnJvd3Nlci5uYW1lICE9PSBcIkNocm9tZVwiXG5cdFx0fVxuXG5cdFx0aWYgKHBhcnNlZFVzZXJBZ2VudC5vcy5uYW1lID09PSBcImlPU1wiKSB7XG5cdFx0XHR1cGRhdGVTb3VyY2UgPSBcImFwcFN0b3JlXCJcblx0XHR9XG5cblx0XHR2YXIgZG9uZSA9IHRydWVcblxuXHRcdHZhciBjaGFuZ2VPcGFjaXR5ID0gZnVuY3Rpb24ob3BhY2l0eVZhbHVlKSB7XG5cdFx0XHRvdXRkYXRlZFVJLnN0eWxlLm9wYWNpdHkgPSBvcGFjaXR5VmFsdWUgLyAxMDBcblx0XHRcdG91dGRhdGVkVUkuc3R5bGUuZmlsdGVyID0gXCJhbHBoYShvcGFjaXR5PVwiICsgb3BhY2l0eVZhbHVlICsgXCIpXCJcblx0XHR9XG5cblx0XHR2YXIgZmFkZUluID0gZnVuY3Rpb24ob3BhY2l0eVZhbHVlKSB7XG5cdFx0XHRjaGFuZ2VPcGFjaXR5KG9wYWNpdHlWYWx1ZSlcblx0XHRcdGlmIChvcGFjaXR5VmFsdWUgPT09IDEpIHtcblx0XHRcdFx0b3V0ZGF0ZWRVSS5zdHlsZS5kaXNwbGF5ID0gXCJ0YWJsZVwiXG5cdFx0XHR9XG5cdFx0XHRpZiAob3BhY2l0eVZhbHVlID09PSAxMDApIHtcblx0XHRcdFx0ZG9uZSA9IHRydWVcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgaXNCcm93c2VyT3V0T2ZEYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYnJvd3Nlck5hbWUgPSBwYXJzZWRVc2VyQWdlbnQuYnJvd3Nlci5uYW1lXG5cdFx0XHR2YXIgYnJvd3Nlck1ham9yVmVyc2lvbiA9IHBhcnNlZFVzZXJBZ2VudC5icm93c2VyLm1ham9yXG5cdFx0XHRpZiAoYnJvd3Nlck5hbWUgPT09IFwiRWRnZVwiKSB7XG5cdFx0XHRcdGJyb3dzZXJNYWpvclZlcnNpb24gPSBFREdFSFRNTF9WU19FREdFX1ZFUlNJT05TW2Jyb3dzZXJNYWpvclZlcnNpb25dXG5cdFx0XHR9XG5cdFx0XHR2YXIgaXNPdXRPZkRhdGUgPSBmYWxzZVxuXHRcdFx0aWYgKCEoYnJvd3Nlck5hbWUgaW4gYnJvd3NlclN1cHBvcnQpKSB7XG5cdFx0XHRcdGlmICghb3B0aW9ucy5pc1Vua25vd25Ccm93c2VyT0spIHtcblx0XHRcdFx0XHRpc091dE9mRGF0ZSA9IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICghYnJvd3NlclN1cHBvcnRbYnJvd3Nlck5hbWVdKSB7XG5cdFx0XHRcdGlzT3V0T2ZEYXRlID0gdHJ1ZVxuXHRcdFx0fSBlbHNlIGlmIChicm93c2VyTWFqb3JWZXJzaW9uIDwgYnJvd3NlclN1cHBvcnRbYnJvd3Nlck5hbWVdKSB7XG5cdFx0XHRcdGlzT3V0T2ZEYXRlID0gdHJ1ZVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGlzT3V0T2ZEYXRlXG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJucyB0cnVlIGlmIGEgYnJvd3NlciBzdXBwb3J0cyBhIGNzczMgcHJvcGVydHlcblx0XHR2YXIgaXNQcm9wZXJ0eVN1cHBvcnRlZCA9IGZ1bmN0aW9uKHByb3BlcnR5KSB7XG5cdFx0XHRpZiAoIXByb3BlcnR5KSB7XG5cdFx0XHRcdHJldHVybiB0cnVlXG5cdFx0XHR9XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuXHRcdFx0dmFyIHZlbmRvclByZWZpeGVzID0gW1wia2h0bWxcIiwgXCJtc1wiLCBcIm9cIiwgXCJtb3pcIiwgXCJ3ZWJraXRcIl1cblx0XHRcdHZhciBjb3VudCA9IHZlbmRvclByZWZpeGVzLmxlbmd0aFxuXG5cdFx0XHQvLyBOb3RlOiBIVE1MRWxlbWVudC5zdHlsZS5oYXNPd25Qcm9wZXJ0eSBzZWVtcyBicm9rZW4gaW4gRWRnZVxuXHRcdFx0aWYgKHByb3BlcnR5IGluIGRpdi5zdHlsZSkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZVxuXHRcdFx0fVxuXG5cdFx0XHRwcm9wZXJ0eSA9IHByb3BlcnR5LnJlcGxhY2UoL15bYS16XS8sIGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHRyZXR1cm4gdmFsLnRvVXBwZXJDYXNlKClcblx0XHRcdH0pXG5cblx0XHRcdHdoaWxlIChjb3VudC0tKSB7XG5cdFx0XHRcdHZhciBwcmVmaXhlZFByb3BlcnR5ID0gdmVuZG9yUHJlZml4ZXNbY291bnRdICsgcHJvcGVydHlcblx0XHRcdFx0Ly8gU2VlIGNvbW1lbnQgcmU6IEhUTUxFbGVtZW50LnN0eWxlLmhhc093blByb3BlcnR5IGFib3ZlXG5cdFx0XHRcdGlmIChwcmVmaXhlZFByb3BlcnR5IGluIGRpdi5zdHlsZSkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdH1cblxuXHRcdHZhciBtYWtlRmFkZUluRnVuY3Rpb24gPSBmdW5jdGlvbihvcGFjaXR5VmFsdWUpIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdFx0ZmFkZUluKG9wYWNpdHlWYWx1ZSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdHlsZSBlbGVtZW50IGV4cGxpY2l0bHkgLSBUT0RPOiBpbnZlc3RpZ2F0ZSBhbmQgZGVsZXRlIGlmIG5vdCBuZWVkZWRcblx0XHR2YXIgc3RhcnRTdHlsZXNBbmRFdmVudHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBidXR0b25DbG9zZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYnV0dG9uQ2xvc2VVcGRhdGVCcm93c2VyXCIpXG5cdFx0XHR2YXIgYnV0dG9uVXBkYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJidXR0b25VcGRhdGVCcm93c2VyXCIpXG5cblx0XHRcdC8vY2hlY2sgc2V0dGluZ3MgYXR0cmlidXRlc1xuXHRcdFx0b3V0ZGF0ZWRVSS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBiYWNrZ3JvdW5kQ29sb3Jcblx0XHRcdC8vd2F5IHRvbyBoYXJkIHRvIHB1dCAhaW1wb3J0YW50IG9uIElFNlxuXHRcdFx0b3V0ZGF0ZWRVSS5zdHlsZS5jb2xvciA9IHRleHRDb2xvclxuXHRcdFx0b3V0ZGF0ZWRVSS5jaGlsZHJlblswXS5jaGlsZHJlblswXS5zdHlsZS5jb2xvciA9IHRleHRDb2xvclxuXHRcdFx0b3V0ZGF0ZWRVSS5jaGlsZHJlblswXS5jaGlsZHJlblsxXS5zdHlsZS5jb2xvciA9IHRleHRDb2xvclxuXG5cdFx0XHQvLyBVcGRhdGUgYnV0dG9uIGlzIGRlc2t0b3Agb25seVxuXHRcdFx0aWYgKGJ1dHRvblVwZGF0ZSkge1xuXHRcdFx0XHRidXR0b25VcGRhdGUuc3R5bGUuY29sb3IgPSB0ZXh0Q29sb3Jcblx0XHRcdFx0aWYgKGJ1dHRvblVwZGF0ZS5zdHlsZS5ib3JkZXJDb2xvcikge1xuXHRcdFx0XHRcdGJ1dHRvblVwZGF0ZS5zdHlsZS5ib3JkZXJDb2xvciA9IHRleHRDb2xvclxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gT3ZlcnJpZGUgdGhlIHVwZGF0ZSBidXR0b24gY29sb3IgdG8gbWF0Y2ggdGhlIGJhY2tncm91bmQgY29sb3Jcblx0XHRcdFx0YnV0dG9uVXBkYXRlLm9ubW91c2VvdmVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGhpcy5zdHlsZS5jb2xvciA9IGJhY2tncm91bmRDb2xvclxuXHRcdFx0XHRcdHRoaXMuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gdGV4dENvbG9yXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRidXR0b25VcGRhdGUub25tb3VzZW91dCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRoaXMuc3R5bGUuY29sb3IgPSB0ZXh0Q29sb3Jcblx0XHRcdFx0XHR0aGlzLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGJhY2tncm91bmRDb2xvclxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGJ1dHRvbkNsb3NlLnN0eWxlLmNvbG9yID0gdGV4dENvbG9yXG5cblx0XHRcdGJ1dHRvbkNsb3NlLm9ubW91c2Vkb3duID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdG91dGRhdGVkVUkuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG5cdFx0XHRcdHJldHVybiBmYWxzZVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBnZXRtZXNzYWdlID0gZnVuY3Rpb24obGFuZykge1xuXHRcdFx0dmFyIGRlZmF1bHRNZXNzYWdlcyA9IGxhbmd1YWdlTWVzc2FnZXNbbGFuZ10gfHwgbGFuZ3VhZ2VNZXNzYWdlcy5lblxuXHRcdFx0dmFyIGN1c3RvbU1lc3NhZ2VzID0gb3B0aW9ucy5tZXNzYWdlcyAmJiBvcHRpb25zLm1lc3NhZ2VzW2xhbmddXG5cdFx0XHR2YXIgbWVzc2FnZXMgPSBkZWVwRXh0ZW5kKHt9LCBkZWZhdWx0TWVzc2FnZXMsIGN1c3RvbU1lc3NhZ2VzKVxuXG5cdFx0XHR2YXIgdXBkYXRlTWVzc2FnZXMgPSB7XG5cdFx0XHRcdHdlYjpcblx0XHRcdFx0XHRcIjxwPlwiICtcblx0XHRcdFx0XHRtZXNzYWdlcy51cGRhdGUud2ViICtcblx0XHRcdFx0XHQnPGEgaWQ9XCJidXR0b25VcGRhdGVCcm93c2VyXCIgcmVsPVwibm9mb2xsb3dcIiBocmVmPVwiJyArXG5cdFx0XHRcdFx0bWVzc2FnZXMudXJsICtcblx0XHRcdFx0XHQnXCI+JyArXG5cdFx0XHRcdFx0bWVzc2FnZXMuY2FsbFRvQWN0aW9uICtcblx0XHRcdFx0XHRcIjwvYT48L3A+XCIsXG5cdFx0XHRcdGdvb2dsZVBsYXk6XG5cdFx0XHRcdFx0XCI8cD5cIiArXG5cdFx0XHRcdFx0bWVzc2FnZXMudXBkYXRlLmdvb2dsZVBsYXkgK1xuXHRcdFx0XHRcdCc8YSBpZD1cImJ1dHRvblVwZGF0ZUJyb3dzZXJcIiByZWw9XCJub2ZvbGxvd1wiIGhyZWY9XCJodHRwczovL3BsYXkuZ29vZ2xlLmNvbS9zdG9yZS9hcHBzL2RldGFpbHM/aWQ9Y29tLmFuZHJvaWQuY2hyb21lXCI+JyArXG5cdFx0XHRcdFx0bWVzc2FnZXMuY2FsbFRvQWN0aW9uICtcblx0XHRcdFx0XHRcIjwvYT48L3A+XCIsXG5cdFx0XHRcdGFwcFN0b3JlOiBcIjxwPlwiICsgbWVzc2FnZXMudXBkYXRlW3VwZGF0ZVNvdXJjZV0gKyBcIjwvcD5cIlxuXHRcdFx0fVxuXG5cdFx0XHR2YXIgdXBkYXRlTWVzc2FnZSA9IHVwZGF0ZU1lc3NhZ2VzW3VwZGF0ZVNvdXJjZV1cblxuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJ2ZXJ0aWNhbC1jZW50ZXJcIj48aDY+JyArXG5cdFx0XHRcdG1lc3NhZ2VzLm91dE9mRGF0ZSArXG5cdFx0XHRcdFwiPC9oNj5cIiArXG5cdFx0XHRcdHVwZGF0ZU1lc3NhZ2UgK1xuXHRcdFx0XHQnPHAgY2xhc3M9XCJsYXN0XCI+PGEgaHJlZj1cIiNcIiBpZD1cImJ1dHRvbkNsb3NlVXBkYXRlQnJvd3NlclwiIHRpdGxlPVwiJyArXG5cdFx0XHRcdG1lc3NhZ2VzLmNsb3NlICtcblx0XHRcdFx0J1wiPiZ0aW1lczs8L2E+PC9wPjwvZGl2Pidcblx0XHRcdClcblx0XHR9XG5cblx0XHQvLyBDaGVjayBpZiBicm93c2VyIGlzIHN1cHBvcnRlZFxuXHRcdGlmIChpc0Jyb3dzZXJPdXRPZkRhdGUoKSB8fCAhaXNQcm9wZXJ0eVN1cHBvcnRlZChyZXF1aXJlZENzc1Byb3BlcnR5KSB8fCBpc0FuZHJvaWRCdXROb3RDaHJvbWUpIHtcblx0XHRcdC8vIFRoaXMgaXMgYW4gb3V0ZGF0ZWQgYnJvd3NlclxuXHRcdFx0aWYgKGRvbmUgJiYgb3V0ZGF0ZWRVSS5zdHlsZS5vcGFjaXR5ICE9PSBcIjFcIikge1xuXHRcdFx0XHRkb25lID0gZmFsc2VcblxuXHRcdFx0XHRmb3IgKHZhciBvcGFjaXR5ID0gMTsgb3BhY2l0eSA8PSAxMDA7IG9wYWNpdHkrKykge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQobWFrZUZhZGVJbkZ1bmN0aW9uKG9wYWNpdHkpLCBvcGFjaXR5ICogOClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR2YXIgaW5zZXJ0Q29udGVudEhlcmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm91dGRhdGVkXCIpXG5cdFx0XHRpZiAoZnVsbHNjcmVlbikge1xuXHRcdFx0XHRpbnNlcnRDb250ZW50SGVyZS5jbGFzc0xpc3QuYWRkKFwiZnVsbHNjcmVlblwiKVxuXHRcdFx0fVxuXHRcdFx0aW5zZXJ0Q29udGVudEhlcmUuaW5uZXJIVE1MID0gZ2V0bWVzc2FnZShsYW5ndWFnZSlcblx0XHRcdHN0YXJ0U3R5bGVzQW5kRXZlbnRzKClcblx0XHR9XG5cdH1cblxuXHQvLyBMb2FkIG1haW4gd2hlbiBET00gcmVhZHkuXG5cdHZhciBvbGRPbmxvYWQgPSB3aW5kb3cub25sb2FkXG5cdGlmICh0eXBlb2Ygd2luZG93Lm9ubG9hZCAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0d2luZG93Lm9ubG9hZCA9IG1haW5cblx0fSBlbHNlIHtcblx0XHR3aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAob2xkT25sb2FkKSB7XG5cdFx0XHRcdG9sZE9ubG9hZCgpXG5cdFx0XHR9XG5cdFx0XHRtYWluKClcblx0XHR9XG5cdH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJiclwiOiB7XG4gICAgXCJvdXRPZkRhdGVcIjogXCJPIHNldSBuYXZlZ2Fkb3IgZXN0JmFhY3V0ZTsgZGVzYXR1YWxpemFkbyFcIixcbiAgICBcInVwZGF0ZVwiOiB7XG4gICAgICBcIndlYlwiOiBcIkF0dWFsaXplIG8gc2V1IG5hdmVnYWRvciBwYXJhIHRlciB1bWEgbWVsaG9yIGV4cGVyaSZlY2lyYztuY2lhIGUgdmlzdWFsaXphJmNjZWRpbDsmYXRpbGRlO28gZGVzdGUgc2l0ZS4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL2JyXCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJBdHVhbGl6ZSBvIHNldSBuYXZlZ2Fkb3IgYWdvcmFcIixcbiAgICBcImNsb3NlXCI6IFwiRmVjaGFyXCJcbiAgfSxcbiAgXCJjblwiOiB7XG4gICAgXCJvdXRPZkRhdGVcIjogXCLmgqjnmoTmtY/op4jlmajlt7Lov4fml7ZcIixcbiAgICBcInVwZGF0ZVwiOiB7XG4gICAgICBcIndlYlwiOiBcIuimgeato+W4uOa1j+iniOacrOe9keermeivt+WNh+e6p+aCqOeahOa1j+iniOWZqOOAglwiLFxuICAgICAgXCJnb29nbGVQbGF5XCI6IFwiUGxlYXNlIGluc3RhbGwgQ2hyb21lIGZyb20gR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJQbGVhc2UgdXBkYXRlIGlPUyBmcm9tIHRoZSBTZXR0aW5ncyBBcHBcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS9jblwiLFxuICAgIFwiY2FsbFRvQWN0aW9uXCI6IFwi546w5Zyo5Y2H57qnXCIsXG4gICAgXCJjbG9zZVwiOiBcIuWFs+mXrVwiXG4gIH0sXG4gIFwiY3pcIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiVsOhxaEgcHJvaGzDrcW+ZcSNIGplIHphc3RhcmFsw70hXCIsXG4gICAgXCJ1cGRhdGVcIjoge1xuICAgICAgXCJ3ZWJcIjogXCJQcm8gc3Byw6F2bsOpIHpvYnJhemVuw60gdMSbY2h0byBzdHLDoW5layBha3R1YWxpenVqdGUgc3bFr2ogcHJvaGzDrcW+ZcSNLiBcIixcbiAgICAgIFwiZ29vZ2xlUGxheVwiOiBcIk5haW5zdGFsdWp0ZSBzaSBDaHJvbWUgeiBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIkFrdHVhbGl6dWp0ZSBzaSBzeXN0w6ltIGlPU1wiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL2N6XCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJBa3R1YWxpem92YXQgbnluw60gc3bFr2ogcHJvaGzDrcW+ZcSNXCIsXG4gICAgXCJjbG9zZVwiOiBcIlphdsWZw610XCJcbiAgfSxcbiAgIFwiZGFcIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiRGluIGJyb3dzZXIgZXIgZm9yw6ZsZGV0IVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiT3BkYXTDqXIgZGluIGJyb3dzZXIgZm9yIGF0IGbDpSB2aXN0IGRlbm5lIGhqZW1tZXNpZGUga29ycmVrdC4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJJbnN0YWxsw6lyIHZlbmxpZ3N0IENocm9tZSBmcmEgR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJPcGRhdMOpciB2ZW5saWdzdCBpT1NcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS9kYVwiLFxuICAgIFwiY2FsbFRvQWN0aW9uXCI6IFwiT3BkYXTDqXIgZGluIGJyb3dzZXIgbnVcIixcbiAgICBcImNsb3NlXCI6IFwiTHVrXCJcbiAgfSxcbiAgXCJkZVwiOiB7XG4gICAgXCJvdXRPZkRhdGVcIjogXCJJaHIgQnJvd3NlciBpc3QgdmVyYWx0ZXQhXCIsXG4gICAgXCJ1cGRhdGVcIjoge1xuICAgICAgXCJ3ZWJcIjogXCJCaXR0ZSBha3R1YWxpc2llcmVuIFNpZSBJaHJlbiBCcm93c2VyLCB1bSBkaWVzZSBXZWJzaXRlIGtvcnJla3QgZGFyenVzdGVsbGVuLiBcIixcbiAgICAgIFwiZ29vZ2xlUGxheVwiOiBcIlBsZWFzZSBpbnN0YWxsIENocm9tZSBmcm9tIEdvb2dsZSBQbGF5XCIsXG4gICAgICBcImFwcFN0b3JlXCI6IFwiUGxlYXNlIHVwZGF0ZSBpT1MgZnJvbSB0aGUgU2V0dGluZ3MgQXBwXCJcbiAgICB9LFxuICAgIFwidXJsXCI6IFwiaHR0cDovL291dGRhdGVkYnJvd3Nlci5jb20vZGVcIixcbiAgICBcImNhbGxUb0FjdGlvblwiOiBcIkRlbiBCcm93c2VyIGpldHp0IGFrdHVhbGlzaWVyZW4gXCIsXG4gICAgXCJjbG9zZVwiOiBcIlNjaGxpZcOfZW5cIlxuICB9LFxuICBcImVlXCI6IHtcbiAgICBcIm91dE9mRGF0ZVwiOiBcIlNpbnUgdmVlYmlsZWhpdHNlamEgb24gdmFuYW5lbnVkIVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiUGFsdW4gdXVlbmRhIG9tYSB2ZWViaWxlaGl0c2VqYXQsIGV0IG7DpGhhIGxlaGVrw7xsZ2Uga29ycmVrdHNlbHQuIFwiLFxuICAgICAgXCJnb29nbGVQbGF5XCI6IFwiUGxlYXNlIGluc3RhbGwgQ2hyb21lIGZyb20gR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJQbGVhc2UgdXBkYXRlIGlPUyBmcm9tIHRoZSBTZXR0aW5ncyBBcHBcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS9lZVwiLFxuICAgIFwiY2FsbFRvQWN0aW9uXCI6IFwiVXVlbmRhIG9tYSB2ZWViaWxlaGl0c2VqYXQga29oZVwiLFxuICAgIFwiY2xvc2VcIjogXCJTdWxnZVwiXG4gIH0sXG4gIFwiZW5cIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiWW91ciBicm93c2VyIGlzIG91dC1vZi1kYXRlIVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiVXBkYXRlIHlvdXIgYnJvd3NlciB0byB2aWV3IHRoaXMgd2Vic2l0ZSBjb3JyZWN0bHkuIFwiLFxuICAgICAgXCJnb29nbGVQbGF5XCI6IFwiUGxlYXNlIGluc3RhbGwgQ2hyb21lIGZyb20gR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJQbGVhc2UgdXBkYXRlIGlPUyBmcm9tIHRoZSBTZXR0aW5ncyBBcHBcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS9cIixcbiAgICBcImNhbGxUb0FjdGlvblwiOiBcIlVwZGF0ZSBteSBicm93c2VyIG5vd1wiLFxuICAgIFwiY2xvc2VcIjogXCJDbG9zZVwiXG4gIH0sXG4gIFwiZXNcIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiwqFUdSBuYXZlZ2Fkb3IgZXN0w6EgYW50aWN1YWRvIVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiQWN0dWFsaXphIHR1IG5hdmVnYWRvciBwYXJhIHZlciBlc3RhIHDDoWdpbmEgY29ycmVjdGFtZW50ZS4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL2VzXCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJBY3R1YWxpemFyIG1pIG5hdmVnYWRvciBhaG9yYVwiLFxuICAgIFwiY2xvc2VcIjogXCJDZXJyYXJcIlxuICB9LFxuICBcImZhXCI6IHtcbiAgICBcInJpZ2h0VG9MZWZ0XCI6IHRydWUsXG4gICAgXCJvdXRPZkRhdGVcIjogXCLZhdix2YjYsdqv2LEg2LTZhdinINmF2YbYs9mI2K4g2LTYr9mHINin2LPYqiFcIixcbiAgICBcInVwZGF0ZVwiOiB7XG4gICAgICBcIndlYlwiOiBcItis2YfYqiDZhdi02KfZh9iv2Ycg2LXYrduM2K0g2KfbjNmGINmI2KjYs9in24zYqtiMINmF2LHZiNix2q/Ysdiq2KfZhiDYsdinINio2LHZiNiyINix2LPYp9mG24wg2YbZhdin24zbjNivLiBcIixcbiAgICAgIFwiZ29vZ2xlUGxheVwiOiBcIlBsZWFzZSBpbnN0YWxsIENocm9tZSBmcm9tIEdvb2dsZSBQbGF5XCIsXG4gICAgICBcImFwcFN0b3JlXCI6IFwiUGxlYXNlIHVwZGF0ZSBpT1MgZnJvbSB0aGUgU2V0dGluZ3MgQXBwXCJcbiAgICB9LFxuICAgIFwidXJsXCI6IFwiaHR0cDovL291dGRhdGVkYnJvd3Nlci5jb20vXCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCLZh9mF24zZhiDYrdin2YTYpyDZhdix2YjYsdqv2LHZhSDYsdinINio2LHZiNiyINqp2YZcIixcbiAgICBcImNsb3NlXCI6IFwiQ2xvc2VcIlxuICB9LFxuICBcImZpXCI6IHtcbiAgICBcIm91dE9mRGF0ZVwiOiBcIlNlbGFpbWVzaSBvbiB2YW5oZW50dW51dCFcIixcbiAgICBcInVwZGF0ZVwiOiB7XG4gICAgICBcIndlYlwiOiBcIkxhdGFhIGFqYW50YXNhaW5lbiBzZWxhaW4gbiZhdW1sO2hkJmF1bWw7a3Nlc2kgdCZhdW1sO20mYXVtbDtuIHNpdnVuIG9pa2Vpbi4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJBc2VubmEgdXVzaW4gQ2hyb21lIEdvb2dsZSBQbGF5IC1rYXVwYXN0YVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlDDpGl2aXTDpCBpT1MgcHVoZWxpbWVzaSBhc2V0dWtzaXN0YVwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL2ZpXCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJQJmF1bWw7aXZpdCZhdW1sOyBzZWxhaW1lbmkgbnl0IFwiLFxuICAgIFwiY2xvc2VcIjogXCJTdWxqZVwiXG4gIH0sXG4gIFwiZnJcIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiVm90cmUgbmF2aWdhdGV1ciBuJ2VzdCBwbHVzIGNvbXBhdGlibGUgIVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiTWV0dGV6IMOgIGpvdXIgdm90cmUgbmF2aWdhdGV1ciBwb3VyIGFmZmljaGVyIGNvcnJlY3RlbWVudCBjZSBzaXRlIFdlYi4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJNZXJjaSBkJ2luc3RhbGxlciBDaHJvbWUgZGVwdWlzIGxlIEdvb2dsZSBQbGF5IFN0b3JlXCIsXG4gICAgICBcImFwcFN0b3JlXCI6IFwiTWVyY2kgZGUgbWV0dHJlIMOgIGpvdXIgaU9TIGRlcHVpcyBsJ2FwcGxpY2F0aW9uIFLDqWdsYWdlc1wiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL2ZyXCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJNZXR0cmUgw6Agam91ciBtYWludGVuYW50IFwiLFxuICAgIFwiY2xvc2VcIjogXCJGZXJtZXJcIlxuICB9LFxuICBcImh1XCI6IHtcbiAgICBcIm91dE9mRGF0ZVwiOiBcIkEgYsO2bmfDqXN6xZFqZSBlbGF2dWx0IVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiRmlyc3PDrXRzZSB2YWd5IGNzZXLDqWxqZSBsZSBhIGLDtm5nw6lzesWRasOpdC4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL2h1XCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJBIGLDtm5nw6lzesWRbSBmcmlzc8OtdMOpc2UgXCIsXG4gICAgXCJjbG9zZVwiOiBcIkNsb3NlXCJcbiAgfSxcbiAgXCJpZFwiOntcbiAgICBcIm91dE9mRGF0ZVwiOiBcIkJyb3dzZXIgeWFuZyBBbmRhIGd1bmFrYW4gc3VkYWgga2V0aW5nZ2FsYW4gemFtYW4hXCIsXG4gICAgXCJ1cGRhdGVcIjoge1xuICAgICAgXCJ3ZWJcIjogXCJQZXJiYWhhcnVpbGFoIGJyb3dzZXIgQW5kYSBhZ2FyIGJpc2EgbWVuamVsYWphaGkgd2Vic2l0ZSBpbmkgZGVuZ2FuIG55YW1hbi4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL1wiLFxuICAgIFwiY2FsbFRvQWN0aW9uXCI6IFwiUGVyYmFoYXJ1aSBicm93c2VyIHNla2FyYW5nIFwiLFxuICAgIFwiY2xvc2VcIjogXCJDbG9zZVwiXG4gIH0sXG4gIFwiaXRcIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiSWwgdHVvIGJyb3dzZXIgbm9uICZlZ3JhdmU7IGFnZ2lvcm5hdG8hXCIsXG4gICAgXCJ1cGRhdGVcIjoge1xuICAgICAgXCJ3ZWJcIjogXCJBZ2dpb3JuYWxvIHBlciB2ZWRlcmUgcXVlc3RvIHNpdG8gY29ycmV0dGFtZW50ZS4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL2l0XCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJBZ2dpb3JuYSBvcmFcIixcbiAgICBcImNsb3NlXCI6IFwiQ2hpdWRpXCJcbiAgfSxcbiAgXCJsdFwiOntcbiAgICBcIm91dE9mRGF0ZVwiOiBcIkrFq3PFsyBuYXLFoXlrbMSXcyB2ZXJzaWphIHlyYSBwYXNlbnVzaSFcIixcbiAgICBcInVwZGF0ZVwiOiB7XG4gICAgICBcIndlYlwiOiBcIkF0bmF1amlua2l0ZSBzYXZvIG5hcsWheWtsxJksIGthZCBnYWzEl3R1bcSXdGUgcGVyxb5pxatyxJd0aSDFoWnEhSBzdmV0YWluxJkgdGlua2FtYWkuIFwiLFxuICAgICAgXCJnb29nbGVQbGF5XCI6IFwiUGxlYXNlIGluc3RhbGwgQ2hyb21lIGZyb20gR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJQbGVhc2UgdXBkYXRlIGlPUyBmcm9tIHRoZSBTZXR0aW5ncyBBcHBcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS9cIixcbiAgICBcImNhbGxUb0FjdGlvblwiOiBcIkF0bmF1amludGkgbmFyxaF5a2zEmSBcIixcbiAgICBcImNsb3NlXCI6IFwiQ2xvc2VcIlxuICB9LFxuICBcIm5sXCI6IHtcbiAgICBcIm91dE9mRGF0ZVwiOiBcIkplIGdlYnJ1aWt0IGVlbiBvdWRlIGJyb3dzZXIhXCIsXG4gICAgXCJ1cGRhdGVcIjoge1xuICAgICAgXCJ3ZWJcIjogXCJVcGRhdGUgamUgYnJvd3NlciBvbSBkZXplIHdlYnNpdGUgY29ycmVjdCB0ZSBiZWtpamtlbi4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL25sXCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJVcGRhdGUgbWlqbiBicm93c2VyIG51IFwiLFxuICAgIFwiY2xvc2VcIjogXCJTbHVpdGVuXCJcbiAgfSxcbiAgXCJwbFwiOiB7XG4gICAgXCJvdXRPZkRhdGVcIjogXCJUd29qYSBwcnplZ2zEhWRhcmthIGplc3QgcHJ6ZXN0YXJ6YcWCYSFcIixcbiAgICBcInVwZGF0ZVwiOiB7XG4gICAgICBcIndlYlwiOiBcIlpha3R1YWxpenVqIHN3b2rEhSBwcnplZ2zEhWRhcmvEmSwgYWJ5IHBvcHJhd25pZSB3ecWbd2lldGxpxIcgdMSZIHN0cm9uxJkuIFwiLFxuICAgICAgXCJnb29nbGVQbGF5XCI6IFwiUGxlYXNlIGluc3RhbGwgQ2hyb21lIGZyb20gR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJQbGVhc2UgdXBkYXRlIGlPUyBmcm9tIHRoZSBTZXR0aW5ncyBBcHBcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS9wbFwiLFxuICAgIFwiY2FsbFRvQWN0aW9uXCI6IFwiWmFrdHVhbGl6dWogcHJ6ZWdsxIVkYXJrxJkganXFvCB0ZXJhelwiLFxuICAgIFwiY2xvc2VcIjogXCJDbG9zZVwiXG4gIH0sXG4gIFwicHRcIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiTyBzZXUgYnJvd3NlciBlc3QmYWFjdXRlOyBkZXNhdHVhbGl6YWRvIVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiQXR1YWxpemUgbyBzZXUgYnJvd3NlciBwYXJhIHRlciB1bWEgbWVsaG9yIGV4cGVyaSZlY2lyYztuY2lhIGUgdmlzdWFsaXphJmNjZWRpbDsmYXRpbGRlO28gZGVzdGUgc2l0ZS4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL3B0XCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJBdHVhbGl6ZSBvIHNldSBicm93c2VyIGFnb3JhXCIsXG4gICAgXCJjbG9zZVwiOiBcIkZlY2hhclwiXG4gIH0sXG4gIFwicm9cIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiQnJvd3NlcnVsIGVzdGUgw65udmVjaGl0IVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiQWN0dWFsaXphyJtpIGJyb3dzZXJ1bCBwZW50cnUgYSB2aXp1YWxpemEgY29yZWN0IGFjZXN0IHNpdGUuIFwiLFxuICAgICAgXCJnb29nbGVQbGF5XCI6IFwiUGxlYXNlIGluc3RhbGwgQ2hyb21lIGZyb20gR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJQbGVhc2UgdXBkYXRlIGlPUyBmcm9tIHRoZSBTZXR0aW5ncyBBcHBcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS9cIixcbiAgICBcImNhbGxUb0FjdGlvblwiOiBcIkFjdHVhbGl6YcibaSBicm93c2VydWwgYWN1bSFcIixcbiAgICBcImNsb3NlXCI6IFwiQ2xvc2VcIlxuICB9LFxuICBcInJ1XCI6IHtcbiAgICBcIm91dE9mRGF0ZVwiOiBcItCS0LDRiCDQsdGA0LDRg9C30LXRgCDRg9GB0YLQsNGA0LXQuyFcIixcbiAgICBcInVwZGF0ZVwiOiB7XG4gICAgICBcIndlYlwiOiBcItCe0LHQvdC+0LLQuNGC0LUg0LLQsNGIINCx0YDQsNGD0LfQtdGAINC00LvRjyDQv9GA0LDQstC40LvRjNC90L7Qs9C+INC+0YLQvtCx0YDQsNC20LXQvdC40Y8g0Y3RgtC+0LPQviDRgdCw0LnRgtCwLiBcIixcbiAgICAgIFwiZ29vZ2xlUGxheVwiOiBcIlBsZWFzZSBpbnN0YWxsIENocm9tZSBmcm9tIEdvb2dsZSBQbGF5XCIsXG4gICAgICBcImFwcFN0b3JlXCI6IFwiUGxlYXNlIHVwZGF0ZSBpT1MgZnJvbSB0aGUgU2V0dGluZ3MgQXBwXCJcbiAgICB9LFxuICAgIFwidXJsXCI6IFwiaHR0cDovL291dGRhdGVkYnJvd3Nlci5jb20vcnVcIixcbiAgICBcImNhbGxUb0FjdGlvblwiOiBcItCe0LHQvdC+0LLQuNGC0Ywg0LzQvtC5INCx0YDQsNGD0LfQtdGAIFwiLFxuICAgIFwiY2xvc2VcIjogXCLQl9Cw0LrRgNGL0YLRjFwiXG4gIH0sXG4gIFwic2lcIjoge1xuICAgIFwib3V0T2ZEYXRlXCI6IFwiVmHFoSBicnNrYWxuaWsgamUgemFzdGFyZWwhXCIsXG4gICAgXCJ1cGRhdGVcIjoge1xuICAgICAgXCJ3ZWJcIjogXCJaYSBwcmF2aWxlbiBwcmlrYXogc3BsZXRuZSBzdHJhbmkgcG9zb2RvYml0ZSB2YcWhIGJyc2thbG5pay4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL3NpXCIsXG4gICAgXCJjYWxsVG9BY3Rpb25cIjogXCJQb3NvZG9iaSBicnNrYWxuaWsgXCIsXG4gICAgXCJjbG9zZVwiOiBcIlphcHJpXCJcbiAgfSxcbiAgXCJzdlwiOiB7XG4gICAgXCJvdXRPZkRhdGVcIjogXCJEaW4gd2ViYmzDpHNhcmUgc3TDtmRqcyBlaiBsw6RuZ3JlIVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwiVXBwZGF0ZXJhIGRpbiB3ZWJibMOkc2FyZSBmw7ZyIGF0dCB3ZWJicGxhdHNlbiBza2EgdmlzYXMga29ycmVrdC4gXCIsXG4gICAgICBcImdvb2dsZVBsYXlcIjogXCJQbGVhc2UgaW5zdGFsbCBDaHJvbWUgZnJvbSBHb29nbGUgUGxheVwiLFxuICAgICAgXCJhcHBTdG9yZVwiOiBcIlBsZWFzZSB1cGRhdGUgaU9TIGZyb20gdGhlIFNldHRpbmdzIEFwcFwiXG4gICAgfSxcbiAgICBcInVybFwiOiBcImh0dHA6Ly9vdXRkYXRlZGJyb3dzZXIuY29tL1wiLFxuICAgIFwiY2FsbFRvQWN0aW9uXCI6IFwiVXBwZGF0ZXJhIG1pbiB3ZWJibMOkc2FyZSBudVwiLFxuICAgIFwiY2xvc2VcIjogXCJTdMOkbmdcIlxuICB9LFxuICBcInVhXCI6IHtcbiAgICBcIm91dE9mRGF0ZVwiOiBcItCS0LDRiCDQsdGA0LDRg9C30LXRgCDQt9Cw0YHRgtCw0YDRltCyIVwiLFxuICAgIFwidXBkYXRlXCI6IHtcbiAgICAgIFwid2ViXCI6IFwi0J7QvdC+0LLRltGC0Ywg0LLQsNGIINCx0YDQsNGD0LfQtdGAINC00LvRjyDQv9GA0LDQstC40LvRjNC90L7Qs9C+INCy0ZbQtNC+0LHRgNCw0LbQtdC90L3RjyDRhtGM0L7Qs9C+INGB0LDQudGC0LAuIFwiLFxuICAgICAgXCJnb29nbGVQbGF5XCI6IFwiUGxlYXNlIGluc3RhbGwgQ2hyb21lIGZyb20gR29vZ2xlIFBsYXlcIixcbiAgICAgIFwiYXBwU3RvcmVcIjogXCJQbGVhc2UgdXBkYXRlIGlPUyBmcm9tIHRoZSBTZXR0aW5ncyBBcHBcIlxuICAgIH0sXG4gICAgXCJ1cmxcIjogXCJodHRwOi8vb3V0ZGF0ZWRicm93c2VyLmNvbS91YVwiLFxuICAgIFwiY2FsbFRvQWN0aW9uXCI6IFwi0J7QvdC+0LLQuNGC0Lgg0LzRltC5INCx0YDQsNGD0LfQtdGAIFwiLFxuICAgIFwiY2xvc2VcIjogXCLQl9Cw0LrRgNC40YLQuFwiXG4gIH1cbn1cbiIsIi8qIVxuICogVUFQYXJzZXIuanMgdjAuNy4xOFxuICogTGlnaHR3ZWlnaHQgSmF2YVNjcmlwdC1iYXNlZCBVc2VyLUFnZW50IHN0cmluZyBwYXJzZXJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWlzYWxtYW4vdWEtcGFyc2VyLWpzXG4gKlxuICogQ29weXJpZ2h0IMKpIDIwMTItMjAxNiBGYWlzYWwgU2FsbWFuIDxmeXpsbWFuQGdtYWlsLmNvbT5cbiAqIER1YWwgbGljZW5zZWQgdW5kZXIgR1BMdjIgb3IgTUlUXG4gKi9cblxuKGZ1bmN0aW9uICh3aW5kb3csIHVuZGVmaW5lZCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBDb25zdGFudHNcbiAgICAvLy8vLy8vLy8vLy8vXG5cblxuICAgIHZhciBMSUJWRVJTSU9OICA9ICcwLjcuMTgnLFxuICAgICAgICBFTVBUWSAgICAgICA9ICcnLFxuICAgICAgICBVTktOT1dOICAgICA9ICc/JyxcbiAgICAgICAgRlVOQ19UWVBFICAgPSAnZnVuY3Rpb24nLFxuICAgICAgICBVTkRFRl9UWVBFICA9ICd1bmRlZmluZWQnLFxuICAgICAgICBPQkpfVFlQRSAgICA9ICdvYmplY3QnLFxuICAgICAgICBTVFJfVFlQRSAgICA9ICdzdHJpbmcnLFxuICAgICAgICBNQUpPUiAgICAgICA9ICdtYWpvcicsIC8vIGRlcHJlY2F0ZWRcbiAgICAgICAgTU9ERUwgICAgICAgPSAnbW9kZWwnLFxuICAgICAgICBOQU1FICAgICAgICA9ICduYW1lJyxcbiAgICAgICAgVFlQRSAgICAgICAgPSAndHlwZScsXG4gICAgICAgIFZFTkRPUiAgICAgID0gJ3ZlbmRvcicsXG4gICAgICAgIFZFUlNJT04gICAgID0gJ3ZlcnNpb24nLFxuICAgICAgICBBUkNISVRFQ1RVUkU9ICdhcmNoaXRlY3R1cmUnLFxuICAgICAgICBDT05TT0xFICAgICA9ICdjb25zb2xlJyxcbiAgICAgICAgTU9CSUxFICAgICAgPSAnbW9iaWxlJyxcbiAgICAgICAgVEFCTEVUICAgICAgPSAndGFibGV0JyxcbiAgICAgICAgU01BUlRUViAgICAgPSAnc21hcnR0dicsXG4gICAgICAgIFdFQVJBQkxFICAgID0gJ3dlYXJhYmxlJyxcbiAgICAgICAgRU1CRURERUQgICAgPSAnZW1iZWRkZWQnO1xuXG5cbiAgICAvLy8vLy8vLy8vL1xuICAgIC8vIEhlbHBlclxuICAgIC8vLy8vLy8vLy9cblxuXG4gICAgdmFyIHV0aWwgPSB7XG4gICAgICAgIGV4dGVuZCA6IGZ1bmN0aW9uIChyZWdleGVzLCBleHRlbnNpb25zKSB7XG4gICAgICAgICAgICB2YXIgbWFyZ2VkUmVnZXhlcyA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiByZWdleGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbnNbaV0gJiYgZXh0ZW5zaW9uc1tpXS5sZW5ndGggJSAyID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmdlZFJlZ2V4ZXNbaV0gPSBleHRlbnNpb25zW2ldLmNvbmNhdChyZWdleGVzW2ldKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtYXJnZWRSZWdleGVzW2ldID0gcmVnZXhlc1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWFyZ2VkUmVnZXhlcztcbiAgICAgICAgfSxcbiAgICAgICAgaGFzIDogZnVuY3Rpb24gKHN0cjEsIHN0cjIpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHN0cjEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHIyLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzdHIxLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbG93ZXJpemUgOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIG1ham9yIDogZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YodmVyc2lvbikgPT09IFNUUl9UWVBFID8gdmVyc2lvbi5yZXBsYWNlKC9bXlxcZFxcLl0vZywnJykuc3BsaXQoXCIuXCIpWzBdIDogdW5kZWZpbmVkO1xuICAgICAgICB9LFxuICAgICAgICB0cmltIDogZnVuY3Rpb24gKHN0cikge1xuICAgICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvXltcXHNcXHVGRUZGXFx4QTBdK3xbXFxzXFx1RkVGRlxceEEwXSskL2csICcnKTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIE1hcCBoZWxwZXJcbiAgICAvLy8vLy8vLy8vLy8vL1xuXG5cbiAgICB2YXIgbWFwcGVyID0ge1xuXG4gICAgICAgIHJneCA6IGZ1bmN0aW9uICh1YSwgYXJyYXlzKSB7XG5cbiAgICAgICAgICAgIC8vdmFyIHJlc3VsdCA9IHt9LFxuICAgICAgICAgICAgdmFyIGkgPSAwLCBqLCBrLCBwLCBxLCBtYXRjaGVzLCBtYXRjaDsvLywgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICAgICAgLyovLyBjb25zdHJ1Y3Qgb2JqZWN0IGJhcmVib25lc1xuICAgICAgICAgICAgZm9yIChwID0gMDsgcCA8IGFyZ3NbMV0ubGVuZ3RoOyBwKyspIHtcbiAgICAgICAgICAgICAgICBxID0gYXJnc1sxXVtwXTtcbiAgICAgICAgICAgICAgICByZXN1bHRbdHlwZW9mIHEgPT09IE9CSl9UWVBFID8gcVswXSA6IHFdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSovXG5cbiAgICAgICAgICAgIC8vIGxvb3AgdGhyb3VnaCBhbGwgcmVnZXhlcyBtYXBzXG4gICAgICAgICAgICB3aGlsZSAoaSA8IGFycmF5cy5sZW5ndGggJiYgIW1hdGNoZXMpIHtcblxuICAgICAgICAgICAgICAgIHZhciByZWdleCA9IGFycmF5c1tpXSwgICAgICAgLy8gZXZlbiBzZXF1ZW5jZSAoMCwyLDQsLi4pXG4gICAgICAgICAgICAgICAgICAgIHByb3BzID0gYXJyYXlzW2kgKyAxXTsgICAvLyBvZGQgc2VxdWVuY2UgKDEsMyw1LC4uKVxuICAgICAgICAgICAgICAgIGogPSBrID0gMDtcblxuICAgICAgICAgICAgICAgIC8vIHRyeSBtYXRjaGluZyB1YXN0cmluZyB3aXRoIHJlZ2V4ZXNcbiAgICAgICAgICAgICAgICB3aGlsZSAoaiA8IHJlZ2V4Lmxlbmd0aCAmJiAhbWF0Y2hlcykge1xuXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXMgPSByZWdleFtqKytdLmV4ZWModWEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICghIW1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocCA9IDA7IHAgPCBwcm9wcy5sZW5ndGg7IHArKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoID0gbWF0Y2hlc1srK2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHEgPSBwcm9wc1twXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBnaXZlbiBwcm9wZXJ0eSBpcyBhY3R1YWxseSBhcnJheVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcSA9PT0gT0JKX1RZUEUgJiYgcS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHFbMV0gPT0gRlVOQ19UWVBFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNzaWduIG1vZGlmaWVkIG1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1txWzBdXSA9IHFbMV0uY2FsbCh0aGlzLCBtYXRjaCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzc2lnbiBnaXZlbiB2YWx1ZSwgaWdub3JlIHJlZ2V4IG1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1txWzBdXSA9IHFbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocS5sZW5ndGggPT0gMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgd2hldGhlciBmdW5jdGlvbiBvciByZWdleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBxWzFdID09PSBGVU5DX1RZUEUgJiYgIShxWzFdLmV4ZWMgJiYgcVsxXS50ZXN0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbGwgZnVuY3Rpb24gKHVzdWFsbHkgc3RyaW5nIG1hcHBlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3FbMF1dID0gbWF0Y2ggPyBxWzFdLmNhbGwodGhpcywgbWF0Y2gsIHFbMl0pIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzYW5pdGl6ZSBtYXRjaCB1c2luZyBnaXZlbiByZWdleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcVswXV0gPSBtYXRjaCA/IG1hdGNoLnJlcGxhY2UocVsxXSwgcVsyXSkgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocS5sZW5ndGggPT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcVswXV0gPSBtYXRjaCA/IHFbM10uY2FsbCh0aGlzLCBtYXRjaC5yZXBsYWNlKHFbMV0sIHFbMl0pKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcV0gPSBtYXRjaCA/IG1hdGNoIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzKTtcbiAgICAgICAgICAgIC8vcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RyIDogZnVuY3Rpb24gKHN0ciwgbWFwKSB7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gbWFwKSB7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgYXJyYXlcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1hcFtpXSA9PT0gT0JKX1RZUEUgJiYgbWFwW2ldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtYXBbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1dGlsLmhhcyhtYXBbaV1bal0sIHN0cikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGkgPT09IFVOS05PV04pID8gdW5kZWZpbmVkIDogaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXRpbC5oYXMobWFwW2ldLCBzdHIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoaSA9PT0gVU5LTk9XTikgPyB1bmRlZmluZWQgOiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAvLy8vLy8vLy8vLy8vLy9cbiAgICAvLyBTdHJpbmcgbWFwXG4gICAgLy8vLy8vLy8vLy8vLy9cblxuXG4gICAgdmFyIG1hcHMgPSB7XG5cbiAgICAgICAgYnJvd3NlciA6IHtcbiAgICAgICAgICAgIG9sZHNhZmFyaSA6IHtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uIDoge1xuICAgICAgICAgICAgICAgICAgICAnMS4wJyAgIDogJy84JyxcbiAgICAgICAgICAgICAgICAgICAgJzEuMicgICA6ICcvMScsXG4gICAgICAgICAgICAgICAgICAgICcxLjMnICAgOiAnLzMnLFxuICAgICAgICAgICAgICAgICAgICAnMi4wJyAgIDogJy80MTInLFxuICAgICAgICAgICAgICAgICAgICAnMi4wLjInIDogJy80MTYnLFxuICAgICAgICAgICAgICAgICAgICAnMi4wLjMnIDogJy80MTcnLFxuICAgICAgICAgICAgICAgICAgICAnMi4wLjQnIDogJy80MTknLFxuICAgICAgICAgICAgICAgICAgICAnPycgICAgIDogJy8nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGRldmljZSA6IHtcbiAgICAgICAgICAgIGFtYXpvbiA6IHtcbiAgICAgICAgICAgICAgICBtb2RlbCA6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0ZpcmUgUGhvbmUnIDogWydTRCcsICdLRiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNwcmludCA6IHtcbiAgICAgICAgICAgICAgICBtb2RlbCA6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0V2byBTaGlmdCA0RycgOiAnNzM3M0tUJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdmVuZG9yIDoge1xuICAgICAgICAgICAgICAgICAgICAnSFRDJyAgICAgICA6ICdBUEEnLFxuICAgICAgICAgICAgICAgICAgICAnU3ByaW50JyAgICA6ICdTcHJpbnQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG9zIDoge1xuICAgICAgICAgICAgd2luZG93cyA6IHtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uIDoge1xuICAgICAgICAgICAgICAgICAgICAnTUUnICAgICAgICA6ICc0LjkwJyxcbiAgICAgICAgICAgICAgICAgICAgJ05UIDMuMTEnICAgOiAnTlQzLjUxJyxcbiAgICAgICAgICAgICAgICAgICAgJ05UIDQuMCcgICAgOiAnTlQ0LjAnLFxuICAgICAgICAgICAgICAgICAgICAnMjAwMCcgICAgICA6ICdOVCA1LjAnLFxuICAgICAgICAgICAgICAgICAgICAnWFAnICAgICAgICA6IFsnTlQgNS4xJywgJ05UIDUuMiddLFxuICAgICAgICAgICAgICAgICAgICAnVmlzdGEnICAgICA6ICdOVCA2LjAnLFxuICAgICAgICAgICAgICAgICAgICAnNycgICAgICAgICA6ICdOVCA2LjEnLFxuICAgICAgICAgICAgICAgICAgICAnOCcgICAgICAgICA6ICdOVCA2LjInLFxuICAgICAgICAgICAgICAgICAgICAnOC4xJyAgICAgICA6ICdOVCA2LjMnLFxuICAgICAgICAgICAgICAgICAgICAnMTAnICAgICAgICA6IFsnTlQgNi40JywgJ05UIDEwLjAnXSxcbiAgICAgICAgICAgICAgICAgICAgJ1JUJyAgICAgICAgOiAnQVJNJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8vLy8vLy8vLy8vLy8vXG4gICAgLy8gUmVnZXggbWFwXG4gICAgLy8vLy8vLy8vLy8vL1xuXG5cbiAgICB2YXIgcmVnZXhlcyA9IHtcblxuICAgICAgICBicm93c2VyIDogW1tcblxuICAgICAgICAgICAgLy8gUHJlc3RvIGJhc2VkXG4gICAgICAgICAgICAvKG9wZXJhXFxzbWluaSlcXC8oW1xcd1xcLi1dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSBNaW5pXG4gICAgICAgICAgICAvKG9wZXJhXFxzW21vYmlsZXRhYl0rKS4rdmVyc2lvblxcLyhbXFx3XFwuLV0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSBNb2JpL1RhYmxldFxuICAgICAgICAgICAgLyhvcGVyYSkuK3ZlcnNpb25cXC8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSA+IDkuODBcbiAgICAgICAgICAgIC8ob3BlcmEpW1xcL1xcc10rKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIDwgOS44MFxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8ob3Bpb3MpW1xcL1xcc10rKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9wZXJhIG1pbmkgb24gaXBob25lID49IDguMFxuICAgICAgICAgICAgXSwgW1tOQU1FLCAnT3BlcmEgTWluaSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvXFxzKG9wcilcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPcGVyYSBXZWJraXRcbiAgICAgICAgICAgIF0sIFtbTkFNRSwgJ09wZXJhJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8vIE1peGVkXG4gICAgICAgICAgICAvKGtpbmRsZSlcXC8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtpbmRsZVxuICAgICAgICAgICAgLyhsdW5hc2NhcGV8bWF4dGhvbnxuZXRmcm9udHxqYXNtaW5lfGJsYXplcilbXFwvXFxzXT8oW1xcd1xcLl0qKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMdW5hc2NhcGUvTWF4dGhvbi9OZXRmcm9udC9KYXNtaW5lL0JsYXplclxuXG4gICAgICAgICAgICAvLyBUcmlkZW50IGJhc2VkXG4gICAgICAgICAgICAvKGF2YW50XFxzfGllbW9iaWxlfHNsaW18YmFpZHUpKD86YnJvd3Nlcik/W1xcL1xcc10/KFtcXHdcXC5dKikvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXZhbnQvSUVNb2JpbGUvU2xpbUJyb3dzZXIvQmFpZHVcbiAgICAgICAgICAgIC8oPzptc3xcXCgpKGllKVxccyhbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludGVybmV0IEV4cGxvcmVyXG5cbiAgICAgICAgICAgIC8vIFdlYmtpdC9LSFRNTCBiYXNlZFxuICAgICAgICAgICAgLyhyZWtvbnEpXFwvKFtcXHdcXC5dKikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWtvbnFcbiAgICAgICAgICAgIC8oY2hyb21pdW18ZmxvY2t8cm9ja21lbHR8bWlkb3JpfGVwaXBoYW55fHNpbGt8c2t5ZmlyZXxvdmlicm93c2VyfGJvbHR8aXJvbnx2aXZhbGRpfGlyaWRpdW18cGhhbnRvbWpzfGJvd3NlcnxxdWFyaylcXC8oW1xcd1xcLi1dKykvaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaHJvbWl1bS9GbG9jay9Sb2NrTWVsdC9NaWRvcmkvRXBpcGhhbnkvU2lsay9Ta3lmaXJlL0JvbHQvSXJvbi9JcmlkaXVtL1BoYW50b21KUy9Cb3dzZXJcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKHRyaWRlbnQpLitydls6XFxzXShbXFx3XFwuXSspLitsaWtlXFxzZ2Vja28vaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJRTExXG4gICAgICAgICAgICBdLCBbW05BTUUsICdJRSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKGVkZ2V8ZWRnaW9zfGVkZ2VhKVxcLygoXFxkKyk/W1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNaWNyb3NvZnQgRWRnZVxuICAgICAgICAgICAgXSwgW1tOQU1FLCAnRWRnZSddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKHlhYnJvd3NlcilcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFlhbmRleFxuICAgICAgICAgICAgXSwgW1tOQU1FLCAnWWFuZGV4J10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8ocHVmZmluKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHVmZmluXG4gICAgICAgICAgICBdLCBbW05BTUUsICdQdWZmaW4nXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgLygoPzpbXFxzXFwvXSl1Yz9cXHM/YnJvd3NlcnwoPzpqdWMuKyl1Y3dlYilbXFwvXFxzXT8oW1xcd1xcLl0rKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVDQnJvd3NlclxuICAgICAgICAgICAgXSwgW1tOQU1FLCAnVUNCcm93c2VyJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oY29tb2RvX2RyYWdvbilcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29tb2RvIERyYWdvblxuICAgICAgICAgICAgXSwgW1tOQU1FLCAvXy9nLCAnICddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKG1pY3JvbWVzc2VuZ2VyKVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlQ2hhdFxuICAgICAgICAgICAgXSwgW1tOQU1FLCAnV2VDaGF0J10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8ocXFicm93c2VybGl0ZSlcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUVFCcm93c2VyTGl0ZVxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oUVEpXFwvKFtcXGRcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUVEsIGFrYSBTaG91UVxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC9tPyhxcWJyb3dzZXIpW1xcL1xcc10/KFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFFRQnJvd3NlclxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oQklEVUJyb3dzZXIpW1xcL1xcc10/KFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJhaWR1IEJyb3dzZXJcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKDIzNDVFeHBsb3JlcilbXFwvXFxzXT8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyMzQ1IEJyb3dzZXJcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKE1ldGFTcilbXFwvXFxzXT8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb3VHb3VCcm93c2VyXG4gICAgICAgICAgICBdLCBbTkFNRV0sIFtcblxuICAgICAgICAgICAgLyhMQkJST1dTRVIpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExpZUJhbyBCcm93c2VyXG4gICAgICAgICAgICBdLCBbTkFNRV0sIFtcblxuICAgICAgICAgICAgL3hpYW9taVxcL21pdWlicm93c2VyXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTUlVSSBCcm93c2VyXG4gICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdNSVVJIEJyb3dzZXInXV0sIFtcblxuICAgICAgICAgICAgLztmYmF2XFwvKFtcXHdcXC5dKyk7L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGYWNlYm9vayBBcHAgZm9yIGlPUyAmIEFuZHJvaWRcbiAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBbTkFNRSwgJ0ZhY2Vib29rJ11dLCBbXG5cbiAgICAgICAgICAgIC9oZWFkbGVzc2Nocm9tZSg/OlxcLyhbXFx3XFwuXSspfFxccykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENocm9tZSBIZWFkbGVzc1xuICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnQ2hyb21lIEhlYWRsZXNzJ11dLCBbXG5cbiAgICAgICAgICAgIC9cXHN3dlxcKS4rKGNocm9tZSlcXC8oW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaHJvbWUgV2ViVmlld1xuICAgICAgICAgICAgXSwgW1tOQU1FLCAvKC4rKS8sICckMSBXZWJWaWV3J10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oKD86b2N1bHVzfHNhbXN1bmcpYnJvd3NlcilcXC8oW1xcd1xcLl0rKS9pXG4gICAgICAgICAgICBdLCBbW05BTUUsIC8oLisoPzpnfHVzKSkoLispLywgJyQxICQyJ10sIFZFUlNJT05dLCBbICAgICAgICAgICAgICAgIC8vIE9jdWx1cyAvIFNhbXN1bmcgQnJvd3NlclxuXG4gICAgICAgICAgICAvYW5kcm9pZC4rdmVyc2lvblxcLyhbXFx3XFwuXSspXFxzKyg/Om1vYmlsZVxccz9zYWZhcml8c2FmYXJpKSovaSAgICAgICAgLy8gQW5kcm9pZCBCcm93c2VyXG4gICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdBbmRyb2lkIEJyb3dzZXInXV0sIFtcblxuICAgICAgICAgICAgLyhjaHJvbWV8b21uaXdlYnxhcm9yYXxbdGl6ZW5va2FdezV9XFxzP2Jyb3dzZXIpXFwvdj8oW1xcd1xcLl0rKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENocm9tZS9PbW5pV2ViL0Fyb3JhL1RpemVuL05va2lhXG4gICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgLyhkb2xmaW4pXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEb2xwaGluXG4gICAgICAgICAgICBdLCBbW05BTUUsICdEb2xwaGluJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oKD86YW5kcm9pZC4rKWNybW98Y3Jpb3MpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hyb21lIGZvciBBbmRyb2lkL2lPU1xuICAgICAgICAgICAgXSwgW1tOQU1FLCAnQ2hyb21lJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oY29hc3QpXFwvKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3BlcmEgQ29hc3RcbiAgICAgICAgICAgIF0sIFtbTkFNRSwgJ09wZXJhIENvYXN0J10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC9meGlvc1xcLyhbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBmb3IgaU9TXG4gICAgICAgICAgICBdLCBbVkVSU0lPTiwgW05BTUUsICdGaXJlZm94J11dLCBbXG5cbiAgICAgICAgICAgIC92ZXJzaW9uXFwvKFtcXHdcXC5dKykuKz9tb2JpbGVcXC9cXHcrXFxzKHNhZmFyaSkvaSAgICAgICAgICAgICAgICAgICAgICAgLy8gTW9iaWxlIFNhZmFyaVxuICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnTW9iaWxlIFNhZmFyaSddXSwgW1xuXG4gICAgICAgICAgICAvdmVyc2lvblxcLyhbXFx3XFwuXSspLis/KG1vYmlsZVxccz9zYWZhcml8c2FmYXJpKS9pICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgJiBTYWZhcmkgTW9iaWxlXG4gICAgICAgICAgICBdLCBbVkVSU0lPTiwgTkFNRV0sIFtcblxuICAgICAgICAgICAgL3dlYmtpdC4rPyhnc2EpXFwvKFtcXHdcXC5dKykuKz8obW9iaWxlXFxzP3NhZmFyaXxzYWZhcmkpKFxcL1tcXHdcXC5dKykvaSAgLy8gR29vZ2xlIFNlYXJjaCBBcHBsaWFuY2Ugb24gaU9TXG4gICAgICAgICAgICBdLCBbW05BTUUsICdHU0EnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgL3dlYmtpdC4rPyhtb2JpbGVcXHM/c2FmYXJpfHNhZmFyaSkoXFwvW1xcd1xcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgLy8gU2FmYXJpIDwgMy4wXG4gICAgICAgICAgICBdLCBbTkFNRSwgW1ZFUlNJT04sIG1hcHBlci5zdHIsIG1hcHMuYnJvd3Nlci5vbGRzYWZhcmkudmVyc2lvbl1dLCBbXG5cbiAgICAgICAgICAgIC8oa29ucXVlcm9yKVxcLyhbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gS29ucXVlcm9yXG4gICAgICAgICAgICAvKHdlYmtpdHxraHRtbClcXC8oW1xcd1xcLl0rKS9pXG4gICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgLy8gR2Vja28gYmFzZWRcbiAgICAgICAgICAgIC8obmF2aWdhdG9yfG5ldHNjYXBlKVxcLyhbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmV0c2NhcGVcbiAgICAgICAgICAgIF0sIFtbTkFNRSwgJ05ldHNjYXBlJ10sIFZFUlNJT05dLCBbXG4gICAgICAgICAgICAvKHN3aWZ0Zm94KS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN3aWZ0Zm94XG4gICAgICAgICAgICAvKGljZWRyYWdvbnxpY2V3ZWFzZWx8Y2FtaW5vfGNoaW1lcmF8ZmVubmVjfG1hZW1vXFxzYnJvd3NlcnxtaW5pbW98Y29ua2Vyb3IpW1xcL1xcc10/KFtcXHdcXC5cXCtdKykvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWNlRHJhZ29uL0ljZXdlYXNlbC9DYW1pbm8vQ2hpbWVyYS9GZW5uZWMvTWFlbW8vTWluaW1vL0Nvbmtlcm9yXG4gICAgICAgICAgICAvKGZpcmVmb3h8c2VhbW9ua2V5fGstbWVsZW9ufGljZWNhdHxpY2VhcGV8ZmlyZWJpcmR8cGhvZW5peHxwYWxlbW9vbnxiYXNpbGlza3x3YXRlcmZveClcXC8oW1xcd1xcLi1dKykkL2ksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveC9TZWFNb25rZXkvSy1NZWxlb24vSWNlQ2F0L0ljZUFwZS9GaXJlYmlyZC9QaG9lbml4XG4gICAgICAgICAgICAvKG1vemlsbGEpXFwvKFtcXHdcXC5dKykuK3J2XFw6LitnZWNrb1xcL1xcZCsvaSwgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1vemlsbGFcblxuICAgICAgICAgICAgLy8gT3RoZXJcbiAgICAgICAgICAgIC8ocG9sYXJpc3xseW54fGRpbGxvfGljYWJ8ZG9yaXN8YW1heWF8dzNtfG5ldHN1cmZ8c2xlaXBuaXIpW1xcL1xcc10/KFtcXHdcXC5dKykvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUG9sYXJpcy9MeW54L0RpbGxvL2lDYWIvRG9yaXMvQW1heWEvdzNtL05ldFN1cmYvU2xlaXBuaXJcbiAgICAgICAgICAgIC8obGlua3MpXFxzXFwoKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExpbmtzXG4gICAgICAgICAgICAvKGdvYnJvd3NlcilcXC8/KFtcXHdcXC5dKikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvQnJvd3NlclxuICAgICAgICAgICAgLyhpY2VcXHM/YnJvd3NlcilcXC92PyhbXFx3XFwuX10rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSUNFIEJyb3dzZXJcbiAgICAgICAgICAgIC8obW9zYWljKVtcXC9cXHNdKFtcXHdcXC5dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1vc2FpY1xuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dXG5cbiAgICAgICAgICAgIC8qIC8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgICAgICAgICAgLy8gTWVkaWEgcGxheWVycyBCRUdJTlxuICAgICAgICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbiAgICAgICAgICAgICwgW1xuXG4gICAgICAgICAgICAvKGFwcGxlKD86Y29yZW1lZGlhfCkpXFwvKChcXGQrKVtcXHdcXC5fXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZW5lcmljIEFwcGxlIENvcmVNZWRpYVxuICAgICAgICAgICAgLyhjb3JlbWVkaWEpIHYoKFxcZCspW1xcd1xcLl9dKykvaVxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oYXF1YWx1bmd8bHlzc25hfGJzcGxheWVyKVxcLygoXFxkKyk/W1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgIC8vIEFxdWFsdW5nL0x5c3NuYS9CU1BsYXllclxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oYXJlc3xvc3Nwcm94eSlcXHMoKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFyZXMvT1NTUHJveHlcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKGF1ZGFjaW91c3xhdWRpbXVzaWNzdHJlYW18YW1hcm9rfGJhc3N8Y29yZXxkYWx2aWt8Z25vbWVtcGxheWVyfG11c2ljIG9uIGNvbnNvbGV8bnNwbGF5ZXJ8cHNwLWludGVybmV0cmFkaW9wbGF5ZXJ8dmlkZW9zKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBdWRhY2lvdXMvQXVkaU11c2ljU3RyZWFtL0FtYXJvay9CQVNTL09wZW5DT1JFL0RhbHZpay9Hbm9tZU1wbGF5ZXIvTW9DXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5TUGxheWVyL1BTUC1JbnRlcm5ldFJhZGlvUGxheWVyL1ZpZGVvc1xuICAgICAgICAgICAgLyhjbGVtZW50aW5lfG11c2ljIHBsYXllciBkYWVtb24pXFxzKChcXGQrKVtcXHdcXC4tXSspL2ksICAgICAgICAgICAgICAgLy8gQ2xlbWVudGluZS9NUERcbiAgICAgICAgICAgIC8obGcgcGxheWVyfG5leHBsYXllcilcXHMoKFxcZCspW1xcZFxcLl0rKS9pLFxuICAgICAgICAgICAgL3BsYXllclxcLyhuZXhwbGF5ZXJ8bGcgcGxheWVyKVxccygoXFxkKylbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgIC8vIE5leFBsYXllci9MRyBQbGF5ZXJcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuICAgICAgICAgICAgLyhuZXhwbGF5ZXIpXFxzKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmV4cGxheWVyXG4gICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgLyhmbHJwKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmxpcCBQbGF5ZXJcbiAgICAgICAgICAgIF0sIFtbTkFNRSwgJ0ZsaXAgUGxheWVyJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oZnN0cmVhbXxuYXRpdmVob3N0fHF1ZXJ5c2Vla3NwaWRlcnxpYS1hcmNoaXZlcnxmYWNlYm9va2V4dGVybmFsaGl0KS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZTdHJlYW0vTmF0aXZlSG9zdC9RdWVyeVNlZWtTcGlkZXIvSUEgQXJjaGl2ZXIvZmFjZWJvb2tleHRlcm5hbGhpdFxuICAgICAgICAgICAgXSwgW05BTUVdLCBbXG5cbiAgICAgICAgICAgIC8oZ3N0cmVhbWVyKSBzb3VwaHR0cHNyYyAoPzpcXChbXlxcKV0rXFwpKXswLDF9IGxpYnNvdXBcXC8oKFxcZCspW1xcd1xcLi1dKykvaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHc3RyZWFtZXJcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKGh0YyBzdHJlYW1pbmcgcGxheWVyKVxcc1tcXHdfXStcXHNcXC9cXHMoKFxcZCspW1xcZFxcLl0rKS9pLCAgICAgICAgICAgICAgLy8gSFRDIFN0cmVhbWluZyBQbGF5ZXJcbiAgICAgICAgICAgIC8oamF2YXxweXRob24tdXJsbGlifHB5dGhvbi1yZXF1ZXN0c3x3Z2V0fGxpYmN1cmwpXFwvKChcXGQrKVtcXHdcXC4tX10rKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBKYXZhL3VybGxpYi9yZXF1ZXN0cy93Z2V0L2NVUkxcbiAgICAgICAgICAgIC8obGF2ZikoKFxcZCspW1xcZFxcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGF2ZiAoRkZNUEVHKVxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8oaHRjX29uZV9zKVxcLygoXFxkKylbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhUQyBPbmUgU1xuICAgICAgICAgICAgXSwgW1tOQU1FLCAvXy9nLCAnICddLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKG1wbGF5ZXIpKD86XFxzfFxcLykoPzooPzpzaGVycHlhLSl7MCwxfXN2bikoPzotfFxccykoclxcZCsoPzotXFxkK1tcXHdcXC4tXSspezAsMX0pL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTVBsYXllciBTVk5cbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKG1wbGF5ZXIpKD86XFxzfFxcL3xbdW5rb3ctXSspKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgLy8gTVBsYXllclxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8obXBsYXllcikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTVBsYXllciAobm8gb3RoZXIgaW5mbylcbiAgICAgICAgICAgIC8oeW91cm11emUpL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWW91ck11emVcbiAgICAgICAgICAgIC8obWVkaWEgcGxheWVyIGNsYXNzaWN8bmVybyBzaG93dGltZSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWVkaWEgUGxheWVyIENsYXNzaWMvTmVybyBTaG93VGltZVxuICAgICAgICAgICAgXSwgW05BTUVdLCBbXG5cbiAgICAgICAgICAgIC8obmVybyAoPzpob21lfHNjb3V0KSlcXC8oKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5lcm8gSG9tZS9OZXJvIFNjb3V0XG4gICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgLyhub2tpYVxcZCspXFwvKChcXGQrKVtcXHdcXC4tXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5va2lhXG4gICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgL1xccyhzb25nYmlyZClcXC8oKFxcZCspW1xcd1xcLi1dKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbmdiaXJkL1BoaWxpcHMtU29uZ2JpcmRcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKHdpbmFtcCkzIHZlcnNpb24gKChcXGQrKVtcXHdcXC4tXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdpbmFtcFxuICAgICAgICAgICAgLyh3aW5hbXApXFxzKChcXGQrKVtcXHdcXC4tXSspL2ksXG4gICAgICAgICAgICAvKHdpbmFtcCltcGVnXFwvKChcXGQrKVtcXHdcXC4tXSspL2lcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKG9jbXMtYm90fHRhcGlucmFkaW98dHVuZWluIHJhZGlvfHVua25vd258d2luYW1wfGlubGlnaHQgcmFkaW8pL2kgIC8vIE9DTVMtYm90L3RhcCBpbiByYWRpby90dW5laW4vdW5rbm93bi93aW5hbXAgKG5vIG90aGVyIGluZm8pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlubGlnaHQgcmFkaW9cbiAgICAgICAgICAgIF0sIFtOQU1FXSwgW1xuXG4gICAgICAgICAgICAvKHF1aWNrdGltZXxybWF8cmFkaW9hcHB8cmFkaW9jbGllbnRhcHBsaWNhdGlvbnxzb3VuZHRhcHx0b3RlbXxzdGFnZWZyaWdodHxzdHJlYW1pdW0pXFwvKChcXGQrKVtcXHdcXC4tXSspL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUXVpY2tUaW1lL1JlYWxNZWRpYS9SYWRpb0FwcC9SYWRpb0NsaWVudEFwcGxpY2F0aW9uL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb3VuZFRhcC9Ub3RlbS9TdGFnZWZyaWdodC9TdHJlYW1pdW1cbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKHNtcCkoKFxcZCspW1xcZFxcLl0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNNUFxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8odmxjKSBtZWRpYSBwbGF5ZXIgLSB2ZXJzaW9uICgoXFxkKylbXFx3XFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgLy8gVkxDIFZpZGVvbGFuXG4gICAgICAgICAgICAvKHZsYylcXC8oKFxcZCspW1xcd1xcLi1dKykvaSxcbiAgICAgICAgICAgIC8oeGJtY3xndmZzfHhpbmV8eG1tc3xpcmFwcClcXC8oKFxcZCspW1xcd1xcLi1dKykvaSwgICAgICAgICAgICAgICAgICAgIC8vIFhCTUMvZ3Zmcy9YaW5lL1hNTVMvaXJhcHBcbiAgICAgICAgICAgIC8oZm9vYmFyMjAwMClcXC8oKFxcZCspW1xcZFxcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvb2JhcjIwMDBcbiAgICAgICAgICAgIC8oaXR1bmVzKVxcLygoXFxkKylbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlUdW5lc1xuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8od21wbGF5ZXIpXFwvKChcXGQrKVtcXHdcXC4tXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdpbmRvd3MgTWVkaWEgUGxheWVyXG4gICAgICAgICAgICAvKHdpbmRvd3MtbWVkaWEtcGxheWVyKVxcLygoXFxkKylbXFx3XFwuLV0rKS9pXG4gICAgICAgICAgICBdLCBbW05BTUUsIC8tL2csICcgJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC93aW5kb3dzXFwvKChcXGQrKVtcXHdcXC4tXSspIHVwbnBcXC9bXFxkXFwuXSsgZGxuYWRvY1xcL1tcXGRcXC5dKyAoaG9tZSBtZWRpYSBzZXJ2ZXIpL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2luZG93cyBNZWRpYSBTZXJ2ZXJcbiAgICAgICAgICAgIF0sIFtWRVJTSU9OLCBbTkFNRSwgJ1dpbmRvd3MnXV0sIFtcblxuICAgICAgICAgICAgLyhjb21cXC5yaXNldXByYWRpb2FsYXJtKVxcLygoXFxkKylbXFxkXFwuXSopL2kgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJpc2VVUCBSYWRpbyBBbGFybVxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8ocmFkLmlvKVxccygoXFxkKylbXFxkXFwuXSspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJhZC5pb1xuICAgICAgICAgICAgLyhyYWRpby4oPzpkZXxhdHxmcikpXFxzKChcXGQrKVtcXGRcXC5dKykvaVxuICAgICAgICAgICAgXSwgW1tOQU1FLCAncmFkLmlvJ10sIFZFUlNJT05dXG5cbiAgICAgICAgICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAgICAgICAgIC8vIE1lZGlhIHBsYXllcnMgRU5EXG4gICAgICAgICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLyovXG5cbiAgICAgICAgXSxcblxuICAgICAgICBjcHUgOiBbW1xuXG4gICAgICAgICAgICAvKD86KGFtZHx4KD86KD86ODZ8NjQpW18tXSk/fHdvd3x3aW4pNjQpWztcXCldL2kgICAgICAgICAgICAgICAgICAgICAvLyBBTUQ2NFxuICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsICdhbWQ2NCddXSwgW1xuXG4gICAgICAgICAgICAvKGlhMzIoPz07KSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElBMzIgKHF1aWNrdGltZSlcbiAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCB1dGlsLmxvd2VyaXplXV0sIFtcblxuICAgICAgICAgICAgLygoPzppWzM0Nl18eCk4NilbO1xcKV0vaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSUEzMlxuICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsICdpYTMyJ11dLCBbXG5cbiAgICAgICAgICAgIC8vIFBvY2tldFBDIG1pc3Rha2VubHkgaWRlbnRpZmllZCBhcyBQb3dlclBDXG4gICAgICAgICAgICAvd2luZG93c1xccyhjZXxtb2JpbGUpO1xcc3BwYzsvaVxuICAgICAgICAgICAgXSwgW1tBUkNISVRFQ1RVUkUsICdhcm0nXV0sIFtcblxuICAgICAgICAgICAgLygoPzpwcGN8cG93ZXJwYykoPzo2NCk/KSg/Olxcc21hY3w7fFxcKSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBvd2VyUENcbiAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCAvb3dlci8sICcnLCB1dGlsLmxvd2VyaXplXV0sIFtcblxuICAgICAgICAgICAgLyhzdW40XFx3KVs7XFwpXS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNQQVJDXG4gICAgICAgICAgICBdLCBbW0FSQ0hJVEVDVFVSRSwgJ3NwYXJjJ11dLCBbXG5cbiAgICAgICAgICAgIC8oKD86YXZyMzJ8aWE2NCg/PTspKXw2OGsoPz1cXCkpfGFybSg/OjY0fCg/PXZcXGQrOykpfCg/PWF0bWVsXFxzKWF2cnwoPzppcml4fG1pcHN8c3BhcmMpKD86NjQpPyg/PTspfHBhLXJpc2MpL2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSUE2NCwgNjhLLCBBUk0vNjQsIEFWUi8zMiwgSVJJWC82NCwgTUlQUy82NCwgU1BBUkMvNjQsIFBBLVJJU0NcbiAgICAgICAgICAgIF0sIFtbQVJDSElURUNUVVJFLCB1dGlsLmxvd2VyaXplXV1cbiAgICAgICAgXSxcblxuICAgICAgICBkZXZpY2UgOiBbW1xuXG4gICAgICAgICAgICAvXFwoKGlwYWR8cGxheWJvb2spO1tcXHdcXHNcXCk7LV0rKHJpbXxhcHBsZSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpUGFkL1BsYXlCb29rXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFZFTkRPUiwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hcHBsZWNvcmVtZWRpYVxcL1tcXHdcXC5dKyBcXCgoaXBhZCkvICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlQYWRcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FwcGxlJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvKGFwcGxlXFxzezAsMX10dikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBsZSBUVlxuICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0FwcGxlIFRWJ10sIFtWRU5ET1IsICdBcHBsZSddXSwgW1xuXG4gICAgICAgICAgICAvKGFyY2hvcylcXHMoZ2FtZXBhZDI/KS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcmNob3NcbiAgICAgICAgICAgIC8oaHApLisodG91Y2hwYWQpL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSFAgVG91Y2hQYWRcbiAgICAgICAgICAgIC8oaHApLisodGFibGV0KS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSFAgVGFibGV0XG4gICAgICAgICAgICAvKGtpbmRsZSlcXC8oW1xcd1xcLl0rKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtpbmRsZVxuICAgICAgICAgICAgL1xccyhub29rKVtcXHdcXHNdK2J1aWxkXFwvKFxcdyspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vb2tcbiAgICAgICAgICAgIC8oZGVsbClcXHMoc3RyZWFba3ByXFxzXFxkXSpbXFxka29dKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlbGwgU3RyZWFrXG4gICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC8oa2ZbQS16XSspXFxzYnVpbGRcXC8uK3NpbGtcXC8vaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gS2luZGxlIEZpcmUgSERcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FtYXpvbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgIC8oc2R8a2YpWzAzNDloaWpvcnN0dXddK1xcc2J1aWxkXFwvLitzaWxrXFwvL2kgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBQaG9uZVxuICAgICAgICAgICAgXSwgW1tNT0RFTCwgbWFwcGVyLnN0ciwgbWFwcy5kZXZpY2UuYW1hem9uLm1vZGVsXSwgW1ZFTkRPUiwgJ0FtYXpvbiddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgL1xcKChpcFtob25lZHxcXHNcXHcqXSspOy4rKGFwcGxlKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpUG9kL2lQaG9uZVxuICAgICAgICAgICAgXSwgW01PREVMLCBWRU5ET1IsIFtUWVBFLCBNT0JJTEVdXSwgW1xuICAgICAgICAgICAgL1xcKChpcFtob25lZHxcXHNcXHcqXSspOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpUG9kL2lQaG9uZVxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQXBwbGUnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC8oYmxhY2tiZXJyeSlbXFxzLV0/KFxcdyspL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCbGFja0JlcnJ5XG4gICAgICAgICAgICAvKGJsYWNrYmVycnl8YmVucXxwYWxtKD89XFwtKXxzb255ZXJpY3Nzb258YWNlcnxhc3VzfGRlbGx8bWVpenV8bW90b3JvbGF8cG9seXRyb24pW1xcc18tXT8oW1xcdy1dKikvaSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmVuUS9QYWxtL1NvbnktRXJpY3Nzb24vQWNlci9Bc3VzL0RlbGwvTWVpenUvTW90b3JvbGEvUG9seXRyb25cbiAgICAgICAgICAgIC8oaHApXFxzKFtcXHdcXHNdK1xcdykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhQIGlQQVFcbiAgICAgICAgICAgIC8oYXN1cyktPyhcXHcrKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFzdXNcbiAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC9cXChiYjEwO1xccyhcXHcrKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmxhY2tCZXJyeSAxMFxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQmxhY2tCZXJyeSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXN1cyBUYWJsZXRzXG4gICAgICAgICAgICAvYW5kcm9pZC4rKHRyYW5zZm9bcHJpbWVcXHNdezQsMTB9XFxzXFx3K3xlZWVwY3xzbGlkZXJcXHNcXHcrfG5leHVzIDd8cGFkZm9uZSkvaVxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQXN1cyddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgLyhzb255KVxccyh0YWJsZXRcXHNbcHNdKVxcc2J1aWxkXFwvL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbnlcbiAgICAgICAgICAgIC8oc29ueSk/KD86c2dwLispXFxzYnVpbGRcXC8vaVxuICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdTb255J10sIFtNT0RFTCwgJ1hwZXJpYSBUYWJsZXQnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG4gICAgICAgICAgICAvYW5kcm9pZC4rXFxzKFtjLWddXFxkezR9fHNvWy1sXVxcdyspXFxzYnVpbGRcXC8vaVxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU29ueSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgL1xccyhvdXlhKVxccy9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE91eWFcbiAgICAgICAgICAgIC8obmludGVuZG8pXFxzKFt3aWRzM3VdKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5pbnRlbmRvXG4gICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIENPTlNPTEVdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rO1xccyhzaGllbGQpXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTnZpZGlhXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdOdmlkaWEnXSwgW1RZUEUsIENPTlNPTEVdXSwgW1xuXG4gICAgICAgICAgICAvKHBsYXlzdGF0aW9uXFxzWzM0cG9ydGFibGV2aV0rKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQbGF5c3RhdGlvblxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU29ueSddLCBbVFlQRSwgQ09OU09MRV1dLCBbXG5cbiAgICAgICAgICAgIC8oc3ByaW50XFxzKFxcdyspKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTcHJpbnQgUGhvbmVzXG4gICAgICAgICAgICBdLCBbW1ZFTkRPUiwgbWFwcGVyLnN0ciwgbWFwcy5kZXZpY2Uuc3ByaW50LnZlbmRvcl0sIFtNT0RFTCwgbWFwcGVyLnN0ciwgbWFwcy5kZXZpY2Uuc3ByaW50Lm1vZGVsXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC8obGVub3ZvKVxccz8oUyg/OjUwMDB8NjAwMCkrKD86Wy1dW1xcdytdKSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMZW5vdm8gdGFibGV0c1xuICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvKGh0YylbO19cXHMtXSsoW1xcd1xcc10rKD89XFwpKXxcXHcrKSovaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSFRDXG4gICAgICAgICAgICAvKHp0ZSktKFxcdyopL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBaVEVcbiAgICAgICAgICAgIC8oYWxjYXRlbHxnZWVrc3Bob25lfGxlbm92b3xuZXhpYW58cGFuYXNvbmljfCg/PTtcXHMpc29ueSlbX1xccy1dPyhbXFx3LV0qKS9pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsY2F0ZWwvR2Vla3NQaG9uZS9MZW5vdm8vTmV4aWFuL1BhbmFzb25pYy9Tb255XG4gICAgICAgICAgICBdLCBbVkVORE9SLCBbTU9ERUwsIC9fL2csICcgJ10sIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAvKG5leHVzXFxzOSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIVEMgTmV4dXMgOVxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnSFRDJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvZFxcL2h1YXdlaShbXFx3XFxzLV0rKVs7XFwpXS9pLFxuICAgICAgICAgICAgLyhuZXh1c1xcczZwKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSHVhd2VpXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdIdWF3ZWknXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC8obWljcm9zb2Z0KTtcXHMobHVtaWFbXFxzXFx3XSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWljcm9zb2Z0IEx1bWlhXG4gICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC9bXFxzXFwoO10oeGJveCg/Olxcc29uZSk/KVtcXHNcXCk7XS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNaWNyb3NvZnQgWGJveFxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTWljcm9zb2Z0J10sIFtUWVBFLCBDT05TT0xFXV0sIFtcbiAgICAgICAgICAgIC8oa2luXFwuW29uZXR3XXszfSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1pY3Jvc29mdCBLaW5cbiAgICAgICAgICAgIF0sIFtbTU9ERUwsIC9cXC4vZywgJyAnXSwgW1ZFTkRPUiwgJ01pY3Jvc29mdCddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNb3Rvcm9sYVxuICAgICAgICAgICAgL1xccyhtaWxlc3RvbmV8ZHJvaWQoPzpbMi00eF18XFxzKD86YmlvbmljfHgyfHByb3xyYXpyKSk/Oj8oXFxzNGcpPylbXFx3XFxzXStidWlsZFxcLy9pLFxuICAgICAgICAgICAgL21vdFtcXHMtXT8oXFx3KikvaSxcbiAgICAgICAgICAgIC8oWFRcXGR7Myw0fSkgYnVpbGRcXC8vaSxcbiAgICAgICAgICAgIC8obmV4dXNcXHM2KS9pXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdNb3Rvcm9sYSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC9hbmRyb2lkLitcXHMobXo2MFxcZHx4b29tW1xcczJdezAsMn0pXFxzYnVpbGRcXC8vaVxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTW90b3JvbGEnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9oYmJ0dlxcL1xcZCtcXC5cXGQrXFwuXFxkK1xccytcXChbXFx3XFxzXSo7XFxzKihcXHdbXjtdKik7KFteO10qKS9pICAgICAgICAgICAgLy8gSGJiVFYgZGV2aWNlc1xuICAgICAgICAgICAgXSwgW1tWRU5ET1IsIHV0aWwudHJpbV0sIFtNT0RFTCwgdXRpbC50cmltXSwgW1RZUEUsIFNNQVJUVFZdXSwgW1xuXG4gICAgICAgICAgICAvaGJidHYuK21hcGxlOyhcXGQrKS9pXG4gICAgICAgICAgICBdLCBbW01PREVMLCAvXi8sICdTbWFydFRWJ10sIFtWRU5ET1IsICdTYW1zdW5nJ10sIFtUWVBFLCBTTUFSVFRWXV0sIFtcblxuICAgICAgICAgICAgL1xcKGR0dltcXCk7XS4rKGFxdW9zKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNoYXJwXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdTaGFycCddLCBbVFlQRSwgU01BUlRUVl1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLisoKHNjaC1pWzg5XTBcXGR8c2h3LW0zODBzfGd0LXBcXGR7NH18Z3QtblxcZCt8c2doLXQ4WzU2XTl8bmV4dXMgMTApKS9pLFxuICAgICAgICAgICAgLygoU00tVFxcdyspKS9pXG4gICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgWyAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmdcbiAgICAgICAgICAgIC9zbWFydC10di4rKHNhbXN1bmcpL2lcbiAgICAgICAgICAgIF0sIFtWRU5ET1IsIFtUWVBFLCBTTUFSVFRWXSwgTU9ERUxdLCBbXG4gICAgICAgICAgICAvKChzW2NncF1oLVxcdyt8Z3QtXFx3K3xnYWxheHlcXHNuZXh1c3xzbS1cXHdbXFx3XFxkXSspKS9pLFxuICAgICAgICAgICAgLyhzYW1bc3VuZ10qKVtcXHMtXSooXFx3Ky0/W1xcdy1dKikvaSxcbiAgICAgICAgICAgIC9zZWMtKChzZ2hcXHcrKSkvaVxuICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdTYW1zdW5nJ10sIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgL3NpZS0oXFx3KikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2llbWVuc1xuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU2llbWVucyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgLyhtYWVtb3xub2tpYSkuKihuOTAwfGx1bWlhXFxzXFxkKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5va2lhXG4gICAgICAgICAgICAvKG5va2lhKVtcXHNfLV0/KFtcXHctXSopL2lcbiAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnTm9raWEnXSwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZFxcczNcXC5bXFxzXFx3Oy1dezEwfShhXFxkezN9KS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWNlclxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnQWNlciddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuKyhbdmxda1xcLT9cXGR7M30pXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMRyBUYWJsZXRcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0xHJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuICAgICAgICAgICAgL2FuZHJvaWRcXHMzXFwuW1xcc1xcdzstXXsxMH0obGc/KS0oWzA2Y3Y5XXszLDR9KS9pICAgICAgICAgICAgICAgICAgICAgLy8gTEcgVGFibGV0XG4gICAgICAgICAgICBdLCBbW1ZFTkRPUiwgJ0xHJ10sIE1PREVMLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgIC8obGcpIG5ldGNhc3RcXC50di9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExHIFNtYXJ0VFZcbiAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgU01BUlRUVl1dLCBbXG4gICAgICAgICAgICAvKG5leHVzXFxzWzQ1XSkvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMR1xuICAgICAgICAgICAgL2xnW2U7XFxzXFwvLV0rKFxcdyopL2ksXG4gICAgICAgICAgICAvYW5kcm9pZC4rbGcoXFwtP1tcXGRcXHddKylcXHMrYnVpbGQvaVxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTEcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLisoaWRlYXRhYlthLXowLTlcXC1cXHNdKykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMZW5vdm9cbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0xlbm92byddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgL2xpbnV4Oy4rKChqb2xsYSkpOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBKb2xsYVxuICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAvKChwZWJibGUpKWFwcFxcL1tcXGRcXC5dK1xccy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQZWJibGVcbiAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgV0VBUkFCTEVdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rO1xccyhvcHBvKVxccz8oW1xcd1xcc10rKVxcc2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT1BQT1xuICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgW1xuXG4gICAgICAgICAgICAvY3JrZXkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvb2dsZSBDaHJvbWVjYXN0XG4gICAgICAgICAgICBdLCBbW01PREVMLCAnQ2hyb21lY2FzdCddLCBbVkVORE9SLCAnR29vZ2xlJ11dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKGdsYXNzKVxcc1xcZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR29vZ2xlIEdsYXNzXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdHb29nbGUnXSwgW1RZUEUsIFdFQVJBQkxFXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMocGl4ZWwgYylcXHMvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvb2dsZSBQaXhlbCBDXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdHb29nbGUnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKHBpeGVsIHhsfHBpeGVsKVxccy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHb29nbGUgUGl4ZWxcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0dvb2dsZSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuKztcXHMoXFx3KylcXHMrYnVpbGRcXC9obVxcMS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFhpYW9taSBIb25nbWkgJ251bWVyaWMnIG1vZGVsc1xuICAgICAgICAgICAgL2FuZHJvaWQuKyhobVtcXHNcXC1fXSpub3RlP1tcXHNfXSooPzpcXGRcXHcpPylcXHMrYnVpbGQvaSwgICAgICAgICAgICAgICAvLyBYaWFvbWkgSG9uZ21pXG4gICAgICAgICAgICAvYW5kcm9pZC4rKG1pW1xcc1xcLV9dKig/Om9uZXxvbmVbXFxzX11wbHVzfG5vdGUgbHRlKT9bXFxzX10qKD86XFxkP1xcdz8pW1xcc19dKig/OnBsdXMpPylcXHMrYnVpbGQvaSwgICAgLy8gWGlhb21pIE1pXG4gICAgICAgICAgICAvYW5kcm9pZC4rKHJlZG1pW1xcc1xcLV9dKig/Om5vdGUpPyg/OltcXHNfXSpbXFx3XFxzXSspKVxccytidWlsZC9pICAgICAgIC8vIFJlZG1pIFBob25lc1xuICAgICAgICAgICAgXSwgW1tNT0RFTCwgL18vZywgJyAnXSwgW1ZFTkRPUiwgJ1hpYW9taSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC9hbmRyb2lkLisobWlbXFxzXFwtX10qKD86cGFkKSg/OltcXHNfXSpbXFx3XFxzXSspKVxccytidWlsZC9pICAgICAgICAgICAgLy8gTWkgUGFkIHRhYmxldHNcbiAgICAgICAgICAgIF0sW1tNT0RFTCwgL18vZywgJyAnXSwgW1ZFTkRPUiwgJ1hpYW9taSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgIC9hbmRyb2lkLis7XFxzKG1bMS01XVxcc25vdGUpXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWVpenUgVGFibGV0XG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdNZWl6dSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuK2EwMDAoMSlcXHMrYnVpbGQvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25lUGx1c1xuICAgICAgICAgICAgL2FuZHJvaWQuK29uZXBsdXNcXHMoYVxcZHs0fSlcXHMrYnVpbGQvaVxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnT25lUGx1cyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooUkNUW1xcZFxcd10rKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJDQSBUYWJsZXRzXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdSQ0EnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL1xcc10rKFZlbnVlW1xcZFxcc117Miw3fSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAvLyBEZWxsIFZlbnVlIFRhYmxldHNcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0RlbGwnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFFbVHxNXVtcXGRcXHddKylcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWZXJpem9uIFRhYmxldFxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnVmVyaXpvbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccysoQmFybmVzWyZcXHNdK05vYmxlXFxzK3xCTltSVF0pKFY/LiopXFxzK2J1aWxkL2kgICAgIC8vIEJhcm5lcyAmIE5vYmxlIFRhYmxldFxuICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdCYXJuZXMgJiBOb2JsZSddLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMrKFRNXFxkezN9LipcXGIpXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCYXJuZXMgJiBOb2JsZSBUYWJsZXRcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ051VmlzaW9uJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rO1xccyhrODgpXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWlRFIEsgU2VyaWVzIFRhYmxldFxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnWlRFJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihnZW5cXGR7M30pXFxzK2J1aWxkLio0OWgvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTd2lzcyBHRU4gTW9iaWxlXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdTd2lzcyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooenVyXFxkezN9KVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3dpc3MgWlVSIFRhYmxldFxuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnU3dpc3MnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKChaZWtpKT9UQi4qXFxiKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFpla2kgVGFibGV0c1xuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnWmVraSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgLyhhbmRyb2lkKS4rWztcXC9dXFxzKyhbWVJdXFxkezJ9KVxccytidWlsZC9pLFxuICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccysoRHJhZ29uW1xcLVxcc10rVG91Y2hcXHMrfERUKShcXHd7NX0pXFxzYnVpbGQvaSAgICAgICAgLy8gRHJhZ29uIFRvdWNoIFRhYmxldFxuICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdEcmFnb24gVG91Y2gnXSwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihOUy0/XFx3ezAsOX0pXFxzYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnNpZ25pYSBUYWJsZXRzXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdJbnNpZ25pYSddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooKE5YfE5leHQpLT9cXHd7MCw5fSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgLy8gTmV4dEJvb2sgVGFibGV0c1xuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTmV4dEJvb2snXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFh0cmVtZVxcXyk/KFYoMVswNDVdfDJbMDE1XXwzMHw0MHw2MHw3WzA1XXw5MCkpXFxzK2J1aWxkL2lcbiAgICAgICAgICAgIF0sIFtbVkVORE9SLCAnVm9pY2UnXSwgTU9ERUwsIFtUWVBFLCBNT0JJTEVdXSwgWyAgICAgICAgICAgICAgICAgICAgLy8gVm9pY2UgWHRyZW1lIFBob25lc1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihMVlRFTFxcLSk/KFYxWzEyXSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgIC8vIEx2VGVsIFBob25lc1xuICAgICAgICAgICAgXSwgW1tWRU5ET1IsICdMdlRlbCddLCBNT0RFTCwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFYoMTAwTUR8NzAwTkF8NzAxMXw5MTdHKS4qXFxiKVxccytidWlsZC9pICAgICAgICAgIC8vIEVudml6ZW4gVGFibGV0c1xuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnRW52aXplbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuK1s7XFwvXVxccyooTGVbXFxzXFwtXStQYW4pW1xcc1xcLV0rKFxcd3sxLDl9KVxccytidWlsZC9pICAgICAgICAgIC8vIExlIFBhbiBUYWJsZXRzXG4gICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9hbmRyb2lkLitbO1xcL11cXHMqKFRyaW9bXFxzXFwtXSouKilcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNYWNoU3BlZWQgVGFibGV0c1xuICAgICAgICAgICAgXSwgW01PREVMLCBbVkVORE9SLCAnTWFjaFNwZWVkJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKihUcmluaXR5KVtcXC1cXHNdKihUXFxkezN9KVxccytidWlsZC9pICAgICAgICAgICAgICAgIC8vIFRyaW5pdHkgVGFibGV0c1xuICAgICAgICAgICAgXSwgW1ZFTkRPUiwgTU9ERUwsIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rWztcXC9dXFxzKlRVXygxNDkxKVxccytidWlsZC9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJvdG9yIFRhYmxldHNcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ1JvdG9yJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuXG4gICAgICAgICAgICAvYW5kcm9pZC4rKEtTKC4rKSlcXHMrYnVpbGQvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbWF6b24gS2luZGxlIFRhYmxldHNcbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ0FtYXpvbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcblxuICAgICAgICAgICAgL2FuZHJvaWQuKyhHaWdhc2V0KVtcXHNcXC1dKyhRXFx3ezEsOX0pXFxzK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgLy8gR2lnYXNldCBUYWJsZXRzXG4gICAgICAgICAgICBdLCBbVkVORE9SLCBNT0RFTCwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC9cXHModGFibGV0fHRhYilbO1xcL10vaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVbmlkZW50aWZpYWJsZSBUYWJsZXRcbiAgICAgICAgICAgIC9cXHMobW9iaWxlKSg/Ols7XFwvXXxcXHNzYWZhcmkpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVW5pZGVudGlmaWFibGUgTW9iaWxlXG4gICAgICAgICAgICBdLCBbW1RZUEUsIHV0aWwubG93ZXJpemVdLCBWRU5ET1IsIE1PREVMXSwgW1xuXG4gICAgICAgICAgICAvKGFuZHJvaWRbXFx3XFwuXFxzXFwtXXswLDl9KTsuK2J1aWxkL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZW5lcmljIEFuZHJvaWQgRGV2aWNlXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdHZW5lcmljJ11dXG5cblxuICAgICAgICAvKi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAgICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIHN0cmluZyBtYXBcbiAgICAgICAgICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAgICAgICAgICAgLyhDNjYwMykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb255IFhwZXJpYSBaIEM2NjAzXG4gICAgICAgICAgICBdLCBbW01PREVMLCAnWHBlcmlhIFogQzY2MDMnXSwgW1ZFTkRPUiwgJ1NvbnknXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAvKEM2OTAzKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbnkgWHBlcmlhIFogMVxuICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ1hwZXJpYSBaIDEnXSwgW1ZFTkRPUiwgJ1NvbnknXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC8oU00tRzkwMFtGfEhdKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgUzVcbiAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgUzUnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAvKFNNLUc3MTAyKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmcgR2FsYXh5IEdyYW5kIDJcbiAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgR3JhbmQgMiddLCBbVkVORE9SLCAnU2Ftc3VuZyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC8oU00tRzUzMEgpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgR3JhbmQgUHJpbWVcbiAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgR3JhbmQgUHJpbWUnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAvKFNNLUczMTNIWikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmcgR2FsYXh5IFZcbiAgICAgICAgICAgIF0sIFtbTU9ERUwsICdHYWxheHkgViddLCBbVkVORE9SLCAnU2Ftc3VuZyddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC8oU00tVDgwNSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2Ftc3VuZyBHYWxheHkgVGFiIFMgMTAuNVxuICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0dhbGF4eSBUYWIgUyAxMC41J10sIFtWRU5ET1IsICdTYW1zdW5nJ10sIFtUWVBFLCBUQUJMRVRdXSwgW1xuICAgICAgICAgICAgLyhTTS1HODAwRikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTYW1zdW5nIEdhbGF4eSBTNSBNaW5pXG4gICAgICAgICAgICBdLCBbW01PREVMLCAnR2FsYXh5IFM1IE1pbmknXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG4gICAgICAgICAgICAvKFNNLVQzMTEpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhbXN1bmcgR2FsYXh5IFRhYiAzIDguMFxuICAgICAgICAgICAgXSwgW1tNT0RFTCwgJ0dhbGF4eSBUYWIgMyA4LjAnXSwgW1ZFTkRPUiwgJ1NhbXN1bmcnXSwgW1RZUEUsIFRBQkxFVF1dLCBbXG5cbiAgICAgICAgICAgIC8oVDNDKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW4gVmFuZHJvaWQgVDNDXG4gICAgICAgICAgICBdLCBbTU9ERUwsIFtWRU5ET1IsICdBZHZhbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgIC8oQURWQU4gVDFKXFwrKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuIFZhbmRyb2lkIFQxSitcbiAgICAgICAgICAgIF0sIFtbTU9ERUwsICdWYW5kcm9pZCBUMUorJ10sIFtWRU5ET1IsICdBZHZhbiddLCBbVFlQRSwgVEFCTEVUXV0sIFtcbiAgICAgICAgICAgIC8oQURWQU4gUzRBKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW4gVmFuZHJvaWQgUzRBXG4gICAgICAgICAgICBdLCBbW01PREVMLCAnVmFuZHJvaWQgUzRBJ10sIFtWRU5ET1IsICdBZHZhbiddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgLyhWOTcyTSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBaVEUgVjk3Mk1cbiAgICAgICAgICAgIF0sIFtNT0RFTCwgW1ZFTkRPUiwgJ1pURSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcblxuICAgICAgICAgICAgLyhpLW1vYmlsZSlcXHMoSVFcXHNbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaS1tb2JpbGUgSVFcbiAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC8oSVE2LjMpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaS1tb2JpbGUgSVEgSVEgNi4zXG4gICAgICAgICAgICBdLCBbW01PREVMLCAnSVEgNi4zJ10sIFtWRU5ET1IsICdpLW1vYmlsZSddLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC8oaS1tb2JpbGUpXFxzKGktc3R5bGVcXHNbXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGktbW9iaWxlIGktU1RZTEVcbiAgICAgICAgICAgIF0sIFtWRU5ET1IsIE1PREVMLCBbVFlQRSwgTU9CSUxFXV0sIFtcbiAgICAgICAgICAgIC8oaS1TVFlMRTIuMSkvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaS1tb2JpbGUgaS1TVFlMRSAyLjFcbiAgICAgICAgICAgIF0sIFtbTU9ERUwsICdpLVNUWUxFIDIuMSddLCBbVkVORE9SLCAnaS1tb2JpbGUnXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC8obW9iaWlzdGFyIHRvdWNoIExBSSA1MTIpL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbW9iaWlzdGFyIHRvdWNoIExBSSA1MTJcbiAgICAgICAgICAgIF0sIFtbTU9ERUwsICdUb3VjaCBMQUkgNTEyJ10sIFtWRU5ET1IsICdtb2JpaXN0YXInXSwgW1RZUEUsIE1PQklMRV1dLCBbXG5cbiAgICAgICAgICAgIC8vLy8vLy8vLy8vLy9cbiAgICAgICAgICAgIC8vIEVORCBUT0RPXG4gICAgICAgICAgICAvLy8vLy8vLy8vLyovXG5cbiAgICAgICAgXSxcblxuICAgICAgICBlbmdpbmUgOiBbW1xuXG4gICAgICAgICAgICAvd2luZG93cy4rXFxzZWRnZVxcLyhbXFx3XFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFZGdlSFRNTFxuICAgICAgICAgICAgXSwgW1ZFUlNJT04sIFtOQU1FLCAnRWRnZUhUTUwnXV0sIFtcblxuICAgICAgICAgICAgLyhwcmVzdG8pXFwvKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmVzdG9cbiAgICAgICAgICAgIC8od2Via2l0fHRyaWRlbnR8bmV0ZnJvbnR8bmV0c3VyZnxhbWF5YXxseW54fHczbSlcXC8oW1xcd1xcLl0rKS9pLCAgICAgLy8gV2ViS2l0L1RyaWRlbnQvTmV0RnJvbnQvTmV0U3VyZi9BbWF5YS9MeW54L3czbVxuICAgICAgICAgICAgLyhraHRtbHx0YXNtYW58bGlua3MpW1xcL1xcc11cXCg/KFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtIVE1ML1Rhc21hbi9MaW5rc1xuICAgICAgICAgICAgLyhpY2FiKVtcXC9cXHNdKFsyM11cXC5bXFxkXFwuXSspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlDYWJcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvcnZcXDooW1xcd1xcLl17MSw5fSkuKyhnZWNrbykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdlY2tvXG4gICAgICAgICAgICBdLCBbVkVSU0lPTiwgTkFNRV1cbiAgICAgICAgXSxcblxuICAgICAgICBvcyA6IFtbXG5cbiAgICAgICAgICAgIC8vIFdpbmRvd3MgYmFzZWRcbiAgICAgICAgICAgIC9taWNyb3NvZnRcXHMod2luZG93cylcXHModmlzdGF8eHApL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIChpVHVuZXMpXG4gICAgICAgICAgICBdLCBbTkFNRSwgVkVSU0lPTl0sIFtcbiAgICAgICAgICAgIC8od2luZG93cylcXHNudFxcczZcXC4yO1xccyhhcm0pL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdpbmRvd3MgUlRcbiAgICAgICAgICAgIC8od2luZG93c1xcc3Bob25lKD86XFxzb3MpKilbXFxzXFwvXT8oW1xcZFxcLlxcc1xcd10qKS9pLCAgICAgICAgICAgICAgICAgICAvLyBXaW5kb3dzIFBob25lXG4gICAgICAgICAgICAvKHdpbmRvd3NcXHNtb2JpbGV8d2luZG93cylbXFxzXFwvXT8oW250Y2VcXGRcXC5cXHNdK1xcdykvaVxuICAgICAgICAgICAgXSwgW05BTUUsIFtWRVJTSU9OLCBtYXBwZXIuc3RyLCBtYXBzLm9zLndpbmRvd3MudmVyc2lvbl1dLCBbXG4gICAgICAgICAgICAvKHdpbig/PTN8OXxuKXx3aW5cXHM5eFxccykoW250XFxkXFwuXSspL2lcbiAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1dpbmRvd3MnXSwgW1ZFUlNJT04sIG1hcHBlci5zdHIsIG1hcHMub3Mud2luZG93cy52ZXJzaW9uXV0sIFtcblxuICAgICAgICAgICAgLy8gTW9iaWxlL0VtYmVkZGVkIE9TXG4gICAgICAgICAgICAvXFwoKGJiKSgxMCk7L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCbGFja0JlcnJ5IDEwXG4gICAgICAgICAgICBdLCBbW05BTUUsICdCbGFja0JlcnJ5J10sIFZFUlNJT05dLCBbXG4gICAgICAgICAgICAvKGJsYWNrYmVycnkpXFx3KlxcLz8oW1xcd1xcLl0qKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCbGFja2JlcnJ5XG4gICAgICAgICAgICAvKHRpemVuKVtcXC9cXHNdKFtcXHdcXC5dKykvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaXplblxuICAgICAgICAgICAgLyhhbmRyb2lkfHdlYm9zfHBhbG1cXHNvc3xxbnh8YmFkYXxyaW1cXHN0YWJsZXRcXHNvc3xtZWVnb3xjb250aWtpKVtcXC9cXHMtXT8oW1xcd1xcLl0qKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbmRyb2lkL1dlYk9TL1BhbG0vUU5YL0JhZGEvUklNL01lZUdvL0NvbnRpa2lcbiAgICAgICAgICAgIC9saW51eDsuKyhzYWlsZmlzaCk7L2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2FpbGZpc2ggT1NcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuICAgICAgICAgICAgLyhzeW1iaWFuXFxzP29zfHN5bWJvc3xzNjAoPz07KSlbXFwvXFxzLV0/KFtcXHdcXC5dKikvaSAgICAgICAgICAgICAgICAgIC8vIFN5bWJpYW5cbiAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1N5bWJpYW4nXSwgVkVSU0lPTl0sIFtcbiAgICAgICAgICAgIC9cXCgoc2VyaWVzNDApOy9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlcmllcyA0MFxuICAgICAgICAgICAgXSwgW05BTUVdLCBbXG4gICAgICAgICAgICAvbW96aWxsYS4rXFwobW9iaWxlOy4rZ2Vja28uK2ZpcmVmb3gvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IE9TXG4gICAgICAgICAgICBdLCBbW05BTUUsICdGaXJlZm94IE9TJ10sIFZFUlNJT05dLCBbXG5cbiAgICAgICAgICAgIC8vIENvbnNvbGVcbiAgICAgICAgICAgIC8obmludGVuZG98cGxheXN0YXRpb24pXFxzKFt3aWRzMzRwb3J0YWJsZXZ1XSspL2ksICAgICAgICAgICAgICAgICAgIC8vIE5pbnRlbmRvL1BsYXlzdGF0aW9uXG5cbiAgICAgICAgICAgIC8vIEdOVS9MaW51eCBiYXNlZFxuICAgICAgICAgICAgLyhtaW50KVtcXC9cXHNcXChdPyhcXHcqKS9pLCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWludFxuICAgICAgICAgICAgLyhtYWdlaWF8dmVjdG9ybGludXgpWztcXHNdL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFnZWlhL1ZlY3RvckxpbnV4XG4gICAgICAgICAgICAvKGpvbGl8W2t4bG5dP3VidW50dXxkZWJpYW58c3VzZXxvcGVuc3VzZXxnZW50b298KD89XFxzKWFyY2h8c2xhY2t3YXJlfGZlZG9yYXxtYW5kcml2YXxjZW50b3N8cGNsaW51eG9zfHJlZGhhdHx6ZW53YWxrfGxpbnB1cylbXFwvXFxzLV0/KD8hY2hyb20pKFtcXHdcXC4tXSopL2ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEpvbGkvVWJ1bnR1L0RlYmlhbi9TVVNFL0dlbnRvby9BcmNoL1NsYWNrd2FyZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGZWRvcmEvTWFuZHJpdmEvQ2VudE9TL1BDTGludXhPUy9SZWRIYXQvWmVud2Fsay9MaW5wdXNcbiAgICAgICAgICAgIC8oaHVyZHxsaW51eClcXHM/KFtcXHdcXC5dKikvaSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSHVyZC9MaW51eFxuICAgICAgICAgICAgLyhnbnUpXFxzPyhbXFx3XFwuXSopL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHTlVcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSwgW1xuXG4gICAgICAgICAgICAvKGNyb3MpXFxzW1xcd10rXFxzKFtcXHdcXC5dK1xcdykvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENocm9taXVtIE9TXG4gICAgICAgICAgICBdLCBbW05BTUUsICdDaHJvbWl1bSBPUyddLCBWRVJTSU9OXSxbXG5cbiAgICAgICAgICAgIC8vIFNvbGFyaXNcbiAgICAgICAgICAgIC8oc3Vub3MpXFxzPyhbXFx3XFwuXFxkXSopL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbGFyaXNcbiAgICAgICAgICAgIF0sIFtbTkFNRSwgJ1NvbGFyaXMnXSwgVkVSU0lPTl0sIFtcblxuICAgICAgICAgICAgLy8gQlNEIGJhc2VkXG4gICAgICAgICAgICAvXFxzKFtmcmVudG9wYy1dezAsNH1ic2R8ZHJhZ29uZmx5KVxccz8oW1xcd1xcLl0qKS9pICAgICAgICAgICAgICAgICAgICAvLyBGcmVlQlNEL05ldEJTRC9PcGVuQlNEL1BDLUJTRC9EcmFnb25GbHlcbiAgICAgICAgICAgIF0sIFtOQU1FLCBWRVJTSU9OXSxbXG5cbiAgICAgICAgICAgIC8oaGFpa3UpXFxzKFxcdyspL2kgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIYWlrdVxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dLFtcblxuICAgICAgICAgICAgL2NmbmV0d29ya1xcLy4rZGFyd2luL2ksXG4gICAgICAgICAgICAvaXBbaG9uZWFkXXsyLDR9KD86Lipvc1xccyhbXFx3XSspXFxzbGlrZVxcc21hY3w7XFxzb3BlcmEpL2kgICAgICAgICAgICAgLy8gaU9TXG4gICAgICAgICAgICBdLCBbW1ZFUlNJT04sIC9fL2csICcuJ10sIFtOQU1FLCAnaU9TJ11dLCBbXG5cbiAgICAgICAgICAgIC8obWFjXFxzb3NcXHN4KVxccz8oW1xcd1xcc1xcLl0qKS9pLFxuICAgICAgICAgICAgLyhtYWNpbnRvc2h8bWFjKD89X3Bvd2VycGMpXFxzKS9pICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFjIE9TXG4gICAgICAgICAgICBdLCBbW05BTUUsICdNYWMgT1MnXSwgW1ZFUlNJT04sIC9fL2csICcuJ11dLCBbXG5cbiAgICAgICAgICAgIC8vIE90aGVyXG4gICAgICAgICAgICAvKCg/Om9wZW4pP3NvbGFyaXMpW1xcL1xccy1dPyhbXFx3XFwuXSopL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTb2xhcmlzXG4gICAgICAgICAgICAvKGFpeClcXHMoKFxcZCkoPz1cXC58XFwpfFxccylbXFx3XFwuXSkqL2ksICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBSVhcbiAgICAgICAgICAgIC8ocGxhblxcczl8bWluaXh8YmVvc3xvc1xcLzJ8YW1pZ2Fvc3xtb3JwaG9zfHJpc2NcXHNvc3xvcGVudm1zKS9pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQbGFuOS9NaW5peC9CZU9TL09TMi9BbWlnYU9TL01vcnBoT1MvUklTQ09TL09wZW5WTVNcbiAgICAgICAgICAgIC8odW5peClcXHM/KFtcXHdcXC5dKikvaSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVU5JWFxuICAgICAgICAgICAgXSwgW05BTUUsIFZFUlNJT05dXG4gICAgICAgIF1cbiAgICB9O1xuXG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vIENvbnN0cnVjdG9yXG4gICAgLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8qXG4gICAgdmFyIEJyb3dzZXIgPSBmdW5jdGlvbiAobmFtZSwgdmVyc2lvbikge1xuICAgICAgICB0aGlzW05BTUVdID0gbmFtZTtcbiAgICAgICAgdGhpc1tWRVJTSU9OXSA9IHZlcnNpb247XG4gICAgfTtcbiAgICB2YXIgQ1BVID0gZnVuY3Rpb24gKGFyY2gpIHtcbiAgICAgICAgdGhpc1tBUkNISVRFQ1RVUkVdID0gYXJjaDtcbiAgICB9O1xuICAgIHZhciBEZXZpY2UgPSBmdW5jdGlvbiAodmVuZG9yLCBtb2RlbCwgdHlwZSkge1xuICAgICAgICB0aGlzW1ZFTkRPUl0gPSB2ZW5kb3I7XG4gICAgICAgIHRoaXNbTU9ERUxdID0gbW9kZWw7XG4gICAgICAgIHRoaXNbVFlQRV0gPSB0eXBlO1xuICAgIH07XG4gICAgdmFyIEVuZ2luZSA9IEJyb3dzZXI7XG4gICAgdmFyIE9TID0gQnJvd3NlcjtcbiAgICAqL1xuICAgIHZhciBVQVBhcnNlciA9IGZ1bmN0aW9uICh1YXN0cmluZywgZXh0ZW5zaW9ucykge1xuXG4gICAgICAgIGlmICh0eXBlb2YgdWFzdHJpbmcgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBleHRlbnNpb25zID0gdWFzdHJpbmc7XG4gICAgICAgICAgICB1YXN0cmluZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBVQVBhcnNlcikpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVUFQYXJzZXIodWFzdHJpbmcsIGV4dGVuc2lvbnMpLmdldFJlc3VsdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHVhID0gdWFzdHJpbmcgfHwgKCh3aW5kb3cgJiYgd2luZG93Lm5hdmlnYXRvciAmJiB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCkgPyB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudCA6IEVNUFRZKTtcbiAgICAgICAgdmFyIHJneG1hcCA9IGV4dGVuc2lvbnMgPyB1dGlsLmV4dGVuZChyZWdleGVzLCBleHRlbnNpb25zKSA6IHJlZ2V4ZXM7XG4gICAgICAgIC8vdmFyIGJyb3dzZXIgPSBuZXcgQnJvd3NlcigpO1xuICAgICAgICAvL3ZhciBjcHUgPSBuZXcgQ1BVKCk7XG4gICAgICAgIC8vdmFyIGRldmljZSA9IG5ldyBEZXZpY2UoKTtcbiAgICAgICAgLy92YXIgZW5naW5lID0gbmV3IEVuZ2luZSgpO1xuICAgICAgICAvL3ZhciBvcyA9IG5ldyBPUygpO1xuXG4gICAgICAgIHRoaXMuZ2V0QnJvd3NlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBicm93c2VyID0geyBuYW1lOiB1bmRlZmluZWQsIHZlcnNpb246IHVuZGVmaW5lZCB9O1xuICAgICAgICAgICAgbWFwcGVyLnJneC5jYWxsKGJyb3dzZXIsIHVhLCByZ3htYXAuYnJvd3Nlcik7XG4gICAgICAgICAgICBicm93c2VyLm1ham9yID0gdXRpbC5tYWpvcihicm93c2VyLnZlcnNpb24pOyAvLyBkZXByZWNhdGVkXG4gICAgICAgICAgICByZXR1cm4gYnJvd3NlcjtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRDUFUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY3B1ID0geyBhcmNoaXRlY3R1cmU6IHVuZGVmaW5lZCB9O1xuICAgICAgICAgICAgbWFwcGVyLnJneC5jYWxsKGNwdSwgdWEsIHJneG1hcC5jcHUpO1xuICAgICAgICAgICAgcmV0dXJuIGNwdTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXREZXZpY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZGV2aWNlID0geyB2ZW5kb3I6IHVuZGVmaW5lZCwgbW9kZWw6IHVuZGVmaW5lZCwgdHlwZTogdW5kZWZpbmVkIH07XG4gICAgICAgICAgICBtYXBwZXIucmd4LmNhbGwoZGV2aWNlLCB1YSwgcmd4bWFwLmRldmljZSk7XG4gICAgICAgICAgICByZXR1cm4gZGV2aWNlO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmdldEVuZ2luZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlbmdpbmUgPSB7IG5hbWU6IHVuZGVmaW5lZCwgdmVyc2lvbjogdW5kZWZpbmVkIH07XG4gICAgICAgICAgICBtYXBwZXIucmd4LmNhbGwoZW5naW5lLCB1YSwgcmd4bWFwLmVuZ2luZSk7XG4gICAgICAgICAgICByZXR1cm4gZW5naW5lO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmdldE9TID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9zID0geyBuYW1lOiB1bmRlZmluZWQsIHZlcnNpb246IHVuZGVmaW5lZCB9O1xuICAgICAgICAgICAgbWFwcGVyLnJneC5jYWxsKG9zLCB1YSwgcmd4bWFwLm9zKTtcbiAgICAgICAgICAgIHJldHVybiBvcztcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRSZXN1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHVhICAgICAgOiB0aGlzLmdldFVBKCksXG4gICAgICAgICAgICAgICAgYnJvd3NlciA6IHRoaXMuZ2V0QnJvd3NlcigpLFxuICAgICAgICAgICAgICAgIGVuZ2luZSAgOiB0aGlzLmdldEVuZ2luZSgpLFxuICAgICAgICAgICAgICAgIG9zICAgICAgOiB0aGlzLmdldE9TKCksXG4gICAgICAgICAgICAgICAgZGV2aWNlICA6IHRoaXMuZ2V0RGV2aWNlKCksXG4gICAgICAgICAgICAgICAgY3B1ICAgICA6IHRoaXMuZ2V0Q1BVKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZ2V0VUEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdWE7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2V0VUEgPSBmdW5jdGlvbiAodWFzdHJpbmcpIHtcbiAgICAgICAgICAgIHVhID0gdWFzdHJpbmc7XG4gICAgICAgICAgICAvL2Jyb3dzZXIgPSBuZXcgQnJvd3NlcigpO1xuICAgICAgICAgICAgLy9jcHUgPSBuZXcgQ1BVKCk7XG4gICAgICAgICAgICAvL2RldmljZSA9IG5ldyBEZXZpY2UoKTtcbiAgICAgICAgICAgIC8vZW5naW5lID0gbmV3IEVuZ2luZSgpO1xuICAgICAgICAgICAgLy9vcyA9IG5ldyBPUygpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBVQVBhcnNlci5WRVJTSU9OID0gTElCVkVSU0lPTjtcbiAgICBVQVBhcnNlci5CUk9XU0VSID0ge1xuICAgICAgICBOQU1FICAgIDogTkFNRSxcbiAgICAgICAgTUFKT1IgICA6IE1BSk9SLCAvLyBkZXByZWNhdGVkXG4gICAgICAgIFZFUlNJT04gOiBWRVJTSU9OXG4gICAgfTtcbiAgICBVQVBhcnNlci5DUFUgPSB7XG4gICAgICAgIEFSQ0hJVEVDVFVSRSA6IEFSQ0hJVEVDVFVSRVxuICAgIH07XG4gICAgVUFQYXJzZXIuREVWSUNFID0ge1xuICAgICAgICBNT0RFTCAgIDogTU9ERUwsXG4gICAgICAgIFZFTkRPUiAgOiBWRU5ET1IsXG4gICAgICAgIFRZUEUgICAgOiBUWVBFLFxuICAgICAgICBDT05TT0xFIDogQ09OU09MRSxcbiAgICAgICAgTU9CSUxFICA6IE1PQklMRSxcbiAgICAgICAgU01BUlRUViA6IFNNQVJUVFYsXG4gICAgICAgIFRBQkxFVCAgOiBUQUJMRVQsXG4gICAgICAgIFdFQVJBQkxFOiBXRUFSQUJMRSxcbiAgICAgICAgRU1CRURERUQ6IEVNQkVEREVEXG4gICAgfTtcbiAgICBVQVBhcnNlci5FTkdJTkUgPSB7XG4gICAgICAgIE5BTUUgICAgOiBOQU1FLFxuICAgICAgICBWRVJTSU9OIDogVkVSU0lPTlxuICAgIH07XG4gICAgVUFQYXJzZXIuT1MgPSB7XG4gICAgICAgIE5BTUUgICAgOiBOQU1FLFxuICAgICAgICBWRVJTSU9OIDogVkVSU0lPTlxuICAgIH07XG4gICAgLy9VQVBhcnNlci5VdGlscyA9IHV0aWw7XG5cbiAgICAvLy8vLy8vLy8vL1xuICAgIC8vIEV4cG9ydFxuICAgIC8vLy8vLy8vLy9cblxuXG4gICAgLy8gY2hlY2sganMgZW52aXJvbm1lbnRcbiAgICBpZiAodHlwZW9mKGV4cG9ydHMpICE9PSBVTkRFRl9UWVBFKSB7XG4gICAgICAgIC8vIG5vZGVqcyBlbnZcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09IFVOREVGX1RZUEUgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFVBUGFyc2VyO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IHRlc3QhISEhISEhIVxuICAgICAgICAvKlxuICAgICAgICBpZiAocmVxdWlyZSAmJiByZXF1aXJlLm1haW4gPT09IG1vZHVsZSAmJiBwcm9jZXNzKSB7XG4gICAgICAgICAgICAvLyBjbGlcbiAgICAgICAgICAgIHZhciBqc29uaXplID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGFycikge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaChuZXcgVUFQYXJzZXIoYXJyW2ldKS5nZXRSZXN1bHQoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KHJlcywgbnVsbCwgMikgKyAnXFxuJyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHByb2Nlc3Muc3RkaW4uaXNUVFkpIHtcbiAgICAgICAgICAgICAgICAvLyB2aWEgYXJnc1xuICAgICAgICAgICAgICAgIGpzb25pemUocHJvY2Vzcy5hcmd2LnNsaWNlKDIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gdmlhIHBpcGVcbiAgICAgICAgICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbigncmVhZGFibGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWQgPSBwcm9jZXNzLnN0ZGluLnJlYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSByZWFkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBqc29uaXplKHN0ci5yZXBsYWNlKC9cXG4kLywgJycpLnNwbGl0KCdcXG4nKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKi9cbiAgICAgICAgZXhwb3J0cy5VQVBhcnNlciA9IFVBUGFyc2VyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJlcXVpcmVqcyBlbnYgKG9wdGlvbmFsKVxuICAgICAgICBpZiAodHlwZW9mKGRlZmluZSkgPT09IEZVTkNfVFlQRSAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBVQVBhcnNlcjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdykge1xuICAgICAgICAgICAgLy8gYnJvd3NlciBlbnZcbiAgICAgICAgICAgIHdpbmRvdy5VQVBhcnNlciA9IFVBUGFyc2VyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8galF1ZXJ5L1plcHRvIHNwZWNpZmljIChvcHRpb25hbClcbiAgICAvLyBOb3RlOlxuICAgIC8vICAgSW4gQU1EIGVudiB0aGUgZ2xvYmFsIHNjb3BlIHNob3VsZCBiZSBrZXB0IGNsZWFuLCBidXQgalF1ZXJ5IGlzIGFuIGV4Y2VwdGlvbi5cbiAgICAvLyAgIGpRdWVyeSBhbHdheXMgZXhwb3J0cyB0byBnbG9iYWwgc2NvcGUsIHVubGVzcyBqUXVlcnkubm9Db25mbGljdCh0cnVlKSBpcyB1c2VkLFxuICAgIC8vICAgYW5kIHdlIHNob3VsZCBjYXRjaCB0aGF0LlxuICAgIHZhciAkID0gd2luZG93ICYmICh3aW5kb3cualF1ZXJ5IHx8IHdpbmRvdy5aZXB0byk7XG4gICAgaWYgKHR5cGVvZiAkICE9PSBVTkRFRl9UWVBFKSB7XG4gICAgICAgIHZhciBwYXJzZXIgPSBuZXcgVUFQYXJzZXIoKTtcbiAgICAgICAgJC51YSA9IHBhcnNlci5nZXRSZXN1bHQoKTtcbiAgICAgICAgJC51YS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VyLmdldFVBKCk7XG4gICAgICAgIH07XG4gICAgICAgICQudWEuc2V0ID0gZnVuY3Rpb24gKHVhc3RyaW5nKSB7XG4gICAgICAgICAgICBwYXJzZXIuc2V0VUEodWFzdHJpbmcpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHBhcnNlci5nZXRSZXN1bHQoKTtcbiAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgJC51YVtwcm9wXSA9IHJlc3VsdFtwcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbn0pKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnID8gd2luZG93IDogdGhpcyk7XG4iXX0=
