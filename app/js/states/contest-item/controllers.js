/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 09.11.2015
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.contest-item', [])

    .controller('ContestItemBaseController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_',
        function ($scope, $rootScope, $state, ContestsManager, _) {
            $scope.$emit('change_title', {
                title: 'Контест | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            $scope.contest = {};
            $rootScope.$broadcast('data loading');
            ContestsManager.canJoin({ contest_id: contestId })
                .then(function (response) {
                    if (!response || !response.result
                        || !response.result.can || !response.result.joined) {
                        $rootScope.$broadcast('data loaded');
                        $state.go('index');
                    }
                    console.log('Доступ к контесту разрешен. Идет загрузка данных...');
                    ContestsManager.getContest({ contest_id: contestId })
                        .then(function (response) {
                            $rootScope.$broadcast('data loaded');
                            if (!response) {
                                $state.go('contests.list');
                            }
                            $scope.contest = contestFill(response.contest);
                            $scope.$broadcast('contest loaded', {
                                contest: response.contest
                            });
                            $rootScope.$broadcast('header expand open', {
                                contest: response.contest
                            });
                        });
                });

            $scope.$on('$destroy', function () {
                $rootScope.$broadcast('header expand close');
            });

            function contestFill (contest) {
                function getMonthName (num) {
                    num = num || 1;
                    if (num < 1 || num > 12) {
                        num = 1;
                    }
                    var month = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
                        'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
                    return month[ num - 1 ];
                }
                function zeroFill(num) {
                    return num < 10 ? '0' + num : num;
                }
                function formatDate(timeMs) {
                    var curDate = new Date(timeMs);
                    return [curDate.getHours(), curDate.getMinutes(), curDate.getSeconds()]
                            .map(zeroFill)
                            .join(':') + ' ' +
                        zeroFill(curDate.getDate()) + ' ' + getMonthName(curDate.getMonth()) +
                        ' ' + zeroFill(curDate.getFullYear());
                }

                contest.startDate = formatDate(contest.startTime);
                contest.finishDate = formatDate(contest.absoluteDurationTime);

                return contest;
            }
        }
    ])

    .controller('ContestItemController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Информация о контесте | ' + _('app_name')
            });
            console.log('Основной контроллер для контеста. Информация.');
        }
    ])

    .controller('ContestItemMonitorController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Таблица результатов | ' + _('app_name')
            });
            console.log('Таблица контеста.');
        }
    ])

    .controller('ContestItemConditionsController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Условия | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            $scope.conditions = {};
            $rootScope.$broadcast('data loading');
            ContestItemManager.getConditions({ contest_id: contestId })
                .then(function (result) {
                    $rootScope.$broadcast('data loaded');
                    if (result.error) {
                        return;
                    }
                    $scope.conditions = result;
                });
        }
    ])

    .controller('ConditionsItemController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Условия | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            var problemId = $state.params.problemIndex;
            $scope.condition = {};
            $rootScope.$broadcast('data loading');
            ContestItemManager.getCondition({ contest_id: contestId, problem_index: problemId })
                .then(function (result) {
                    $rootScope.$broadcast('data loaded');
                    if (result.error) {
                        return $state.go('^.conditions');
                    }
                    $scope.condition = result;
                });
        }
    ])

    .controller('ContestItemSendController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Отправить решение | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            $scope.conditions = [];
            $scope.selectedCondition = '';
            $scope.currentLangs = [];
            $scope.selectedLangId = null;

            $scope.$watch('selectedCondition', function (newValue, oldValue) {
                if (!newValue) {
                    return;
                }
                $rootScope.$broadcast('data loading');
                ContestItemManager.getLangs({
                    contest_id: contestId,
                    problem_index: $scope.selectedCondition
                }).then(function (result) {
                    $rootScope.$broadcast('data loaded');
                    if (result.error) {
                        return;
                    }
                    $scope.currentLangs = result;
                    $scope.selectedLangId = result && result.length ?
                        result[0].id : null;
                }).catch(function () {
                    $rootScope.$broadcast('data loaded');
                });
            });

            $rootScope.$broadcast('data loading');
            ContestItemManager.getConditions({ contest_id: contestId })
                .then(function (result) {
                    $rootScope.$broadcast('data loaded');
                    if (result.error) {
                        return;
                    }
                    $scope.conditions = result;
                    $scope.selectedCondition = $scope.conditions && $scope.conditions.length ?
                        $scope.conditions[0].internal_index : '';
                });

            $scope.solution = '';
            $scope.sent = false;

            $scope.submitSolution = function () {
                var solution = $scope.solution,
                    condition = $scope.selectedCondition;
                if (!solution || !condition || !contestId) {
                    return;
                }
                $rootScope.$broadcast('data loading');
                $scope.sent = true;

                ContestItemManager.sendSolution({
                    contest_id: contestId,
                    internal_index: condition,
                    solution: solution,
                    lang_id: $scope.selectedLangId
                }).then(function (result) {
                    $rootScope.$broadcast('data loaded');
                    $scope.sent = false;

                    if (result.error) {
                        return alert('Произошла ошибка: ' + result.error);
                    }
                    $state.go('^.status');
                });
            };
        }
    ])

    .controller('ContestItemStatusController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Все посылки | ' + _('app_name')
            });

            var contestId = $state.params.contestId;
            var defaultCount = 5;

            $scope.pageNumber = parseInt($state.params.pageNumber || 1);
            $scope.params = {
                contest_id: contestId,
                count: defaultCount,
                offset: ($scope.pageNumber - 1) * defaultCount,
                mode: 'my'
            };

            $scope.all_items_count = 0;
            $scope.pagination = [];
            $scope.sents = [];
            $scope.allPages = 0;

            function generatePaginationArray(offsetCount) {
                var pages = [],
                    curPage = $scope.pageNumber,
                    allItems = $scope.all_items_count,
                    backOffsetPages = offsetCount,
                    upOffsetPages = offsetCount,
                    allPages = Math.floor(allItems / defaultCount) +
                        (allItems && allItems % defaultCount ? 1 : 0);
                if (!defaultCount) {
                    allPages = 1e6;
                }
                $scope.allPages = allPages;
                for (var cur = Math.max(curPage - backOffsetPages, 1);
                     cur <= Math.min(curPage + upOffsetPages, allPages); ++cur) {
                    pages.push({
                        number: cur,
                        active: cur === curPage
                    });
                }
                return pages;
            }

            var firstInvokeStateChanged = true;
            $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
                if (firstInvokeStateChanged) {
                    return firstInvokeStateChanged = false;
                }
                $scope.pageNumber = toParams.pageNumber ?
                    parseInt(toParams.pageNumber) : 1;
                $scope.params.offset = ($scope.pageNumber - 1) * defaultCount;
                updateSentsList();
            });

            updateSentsList();

            function updateSentsList() {
                $rootScope.$broadcast('data loading');
                ContestItemManager.getSents($scope.params)
                    .then(function (result) {
                        $rootScope.$broadcast('data loaded');
                        if (result.error) {
                            return alert('Произошла ошибка: ' + result.error);
                        }
                        if (!result || !result.hasOwnProperty('all_items_count')) {
                            return;
                        }
                        $scope.all_items_count = result.all_items_count;
                        $scope.sents = result.sents;
                        $scope.pagination = generatePaginationArray(5);
                    }).catch(function (err) {
                        console.log(err);
                    });
            }
        }
    ])
;