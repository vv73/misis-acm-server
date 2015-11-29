'use strict';

/* Directives */

angular.module('Qemy.directives', [])

    .directive('emailFilter', function() {
        return {
            require : 'ngModel',
            link : function(scope, element, attrs, ngModel) {
                var except = attrs.emailFilter,
                    emptyKey = 'empty';
                ngModel.$parsers.push(function(value) {
                    function setValidity(message, bool) {
                        ngModel.$setValidity(message, bool);
                    }
                    var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                        isValid = emailRegex.test(value.toString());
                    setValidity('email', value.length ? isValid : except == emptyKey);

                    return value;
                })
            }
        }
    })

    .directive('mySubmitOnEnter', function () {
        return {
            link: link
        };
        function link($scope, element, attrs) {
            element.on('keydown', function (event) {
                if (event.keyCode == 13) {
                    element.trigger('submit');
                }
            });
        }
    })

    .directive('pageHeader', function () {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: templateUrl('header', 'index'),
            controller: 'HeaderCtrl'
        }
    })

    .directive('pageContent', function () {
        return {
            restrict: 'E',
            transclude: true,
            scope: true,
            templateUrl: templateUrl('page', 'wrapper'),
            controller: 'WrapperCtrl'
        }
    })

    .directive('pageLoading', function () {
        return {
            restrict: 'EA',
            templateUrl: templateUrl('page', 'loading-layer'),
            scope: {
                active: '='
            },
            link: function (scope, element, attrs) {
                element.addClass('page__loading');
            }
        };
    })

    .directive('myTimerElement', ['$injector', function ($injector) {
        return {
            restrict: 'EA',
            template: '<div class="my-timer"></div>',
            scope: {
                finish: '=',
                format: '=',
                direction: '=',
                onFinish: '=',
                onOther: '='
            },
            link: function (scope, element, attrs) {
                element = element.find('.my-timer');
                var timeoutId,
                    $interval = $injector.get('$interval'),
                    $timeout = $injector.get('$timeout'),
                    finishCallbackInvoked = false;

                function updateTime() {
                    var curTime = new Date().getTime(),
                        finishTime = scope.finish || 0,
                        format = scope.format || 'hh:mm:ss',
                        finishCallback = scope.onFinish || angular.noop,
                        otherEvents = scope.onOther || [];
                    var diffTime = finishTime - curTime;
                    for (var eventKey in otherEvents) {
                        var timeEventMs = otherEvents[eventKey].time,
                            eventCallback = otherEvents[eventKey].callback;
                        if (Math.floor(timeEventMs / 1000) - 1 === Math.floor(curTime / 1000)) {
                            if (typeof eventCallback === 'function') {
                                $timeout(function (callback) {
                                    callback();
                                }.bind(this, eventCallback), 2000);
                            }
                        }
                    }
                    if (diffTime <= 0) {
                        if (!finishCallbackInvoked && typeof finishCallback === 'function') {
                            finishCallback();
                            finishCallbackInvoked = true;
                        }
                        $interval.cancel(timeoutId);
                    }
                    element.text(
                        timeRemainingFormat(diffTime, format)
                    );
                }

                updateTime();
                timeoutId = $interval(function() {
                    updateTime();
                }, 1000);

                function timeRemainingFormat(diffTimeMs, formatString) {
                    var diffTime = Math.max(diffTimeMs, 0),
                        allSeconds = Math.floor(diffTime / 1000),
                        seconds = allSeconds % 60,
                        minutes = Math.floor(allSeconds / 60),
                        hours = Math.floor(minutes / 60);
                    minutes %= 60;
                    var zF = function (num) { return num < 10 ? '0' + num : num; };
                    return formatString ? formatString
                        .replace(/(hh)/gi, zF(hours))
                        .replace(/(mm)/gi, zF(minutes))
                        .replace(/(ss)/gi, zF(seconds)) : '';
                }

                element.on('$destroy', function() {
                    $interval.cancel(timeoutId);
                });
            }
        };
    }])
;