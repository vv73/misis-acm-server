function initApplication () {
    var classes = [
        Config.Navigator.osX ? 'osx' : 'non_osx',
        Config.Navigator.retina ? 'is_2x' : 'is_1x'
    ];
    if (Config.Modes.ios_standalone) {
        classes.push('ios_standalone');
    }
    $(document.body).addClass(classes.join(' '));

    var origConsoleLog = console.log;
    console.log = function () {
        var curDate = new Date(),
            zF = function (num) { return num < 10 ? '0' + num : num },
            timeArray = [ curDate.getHours(), curDate.getMinutes(), curDate.getSeconds(), curDate.getMilliseconds() ],
            logTime = '[' + timeArray.map(zF).join(':') + ']';
        origConsoleLog.bind(console, logTime).apply(this, arguments);
    };

    ConfigStorage.get('i18n_locale', function (params) {
        var locale = params,
            defaultLocale = Config.I18n.locale,
            bootReady = {
                dom: false,
                i18n_ng: false,
                i18n_messages: false,
                i18n_fallback: false
            },
            checkReady = function checkReady () {
                var i, ready = true;
                for (i in bootReady) {
                    if (bootReady.hasOwnProperty(i) && bootReady[i] === false) {
                        ready = false;
                        break;
                    }
                }
                if (ready) {
                    bootReady.boot = false;
                    angular.bootstrap(document, ['Qemy']);
                }
            };

        if (!locale) {
            locale = defaultLocale
        }
        for (var i = 0; i < Config.I18n.supported.length; i++) {
            if (Config.I18n.supported[i] == locale) {
                Config.I18n.locale = locale;
                break;
            }
        }
        bootReady.i18n_ng = true;//Config.I18n.locale == defaultLocale; // Already included

        $.getJSON('/js/locales/' + Config.I18n.locale + '.json').success(function (json) {
            Config.I18n.messages = json;
            bootReady.i18n_messages = true;
            console.log("Locale language has been loaded");
            if (Config.I18n.locale == defaultLocale) { // No fallback, leave empty object
                bootReady.i18n_fallback = true;
            }
            checkReady();
        });

        if (Config.I18n.locale != defaultLocale) {
            $.getJSON('/js/locales/' + defaultLocale + '.json').success(function (json) {
                Config.I18n.fallback_messages = json;
                bootReady.i18n_fallback = true;
                checkReady();
            });
        }

        $(document).ready(function() {
            bootReady.dom = true;
            if (!bootReady.i18n_ng) {
                $('<script>').appendTo('body')
                    .on('load', function() {
                        bootReady.i18n_ng = true;
                        checkReady();
                    })
            } else {
                checkReady();
            }
        });
    });

    function initAutoUpgrade () {

        // Prevent click-jacking
        try {
            if (window == window.top || window.chrome && chrome.app && chrome.app.window) {
                document.documentElement.style.display = 'block';
            } else {
                top.location = self.location;
            }
        } catch (e) {console.error('CJ protection', e)};

        window.safeConfirm = function (params, callback) {
            if (typeof params === 'string') {
                params = {message: params};
            }
            var result = false;
            try {
                result = confirm(params.message);
            } catch (e) {
                result = true;
            }
            setTimeout(function () {callback(result)}, 10);
        };

        if (!window.applicationCache || !window.addEventListener) {
            return;
        }

        var appCache = window.applicationCache,
            declined = false,
            updateTimeout = false,
            scheduleUpdate = function (delay) {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(function () {
                    try {
                        appCache.update();
                    } catch (ex) {
                        console.log('appCache.update: ' + ex);
                    }
                }, delay || 10000);
            },
            downloadProgress = function (e) {
                var total = e && +e.total || 0;
                //console.log(total);
            },
            attach = function () {
                appCache.addEventListener('updateready', function(e) {
                    if (appCache.status == appCache.UPDATEREADY) {
                        // Browser downloaded a new app cache.
                        try {
                            var injector = angular
                                && angular.element(document.body)
                                && angular.element(document.body).injector();
                            var $mdDialog = injector.get('$mdDialog');
                        } catch (e) { console.log(e); }
                        if (injector && $mdDialog) {
                            // Angular Material is exists
                            var confirmDialog = $mdDialog.confirm()
                                .title('Предупреждение')
                                .content('A new version (' + Config.App.version + ') of this app is available. Load it?')
                                .clickOutsideToClose(false)
                                .ariaLabel('Application cache update confirm')
                                .ok('Ok')
                                .cancel('Cancel');
                            $mdDialog.show(confirmDialog).then(function() {
                                window.location.reload();
                            });
                        } else {
                            if (confirm('A new version (' + Config.App.version + ') of this app is available. Load it?')) {
                                window.location.reload();
                            }
                        }
                    } else {
                        // Manifest didn't changed. Nothing new to server.
                    }
                }, false);
                appCache.addEventListener('noupdate', function () {scheduleUpdate()}, false);
                appCache.addEventListener('error', function () {scheduleUpdate()}, false);
                appCache.addEventListener("progress", function (e) {downloadProgress(e);}, false);
            };

        scheduleUpdate(1000);
        window.addEventListener('load', attach);
    }

    initAutoUpgrade();
}