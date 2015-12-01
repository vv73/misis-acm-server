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

angular.module('Qemy.controllers.admin', [])

    .controller('AdminBaseController', ['$scope', '$rootScope', '$state', '_', 'UserManager',
        function ($scope, $rootScope, $state, _, UserManager) {
            $scope.$emit('change_title', {
                title: 'Панель администратора | ' + _('app_name')
            });
            $scope.user = {};

            $rootScope.$broadcast('data loading');
            UserManager.getCurrentUser()
                .then(function (user) {
                    $rootScope.$broadcast('data loaded');
                    if (!user || !user.id) {
                        return $state.go('auth.form');
                    } else if (user.access_group.access_level !== 5) {
                        return $state.go('contests.list');
                    }
                    $scope.user = user;
                }
            ).catch(function (err) {
                $state.go('auth.form');
            });
        }
    ])

    .controller('AdminMenuController', ['$scope', '$rootScope', '$state', '_',
        function ($scope, $rootScope, $state, _) {
            $scope.menu = [{
                uiSref: 'admin.index',
                name: 'Контесты'
            }, {
                uiSref: 'contests.list',
                name: 'Контесты'
            }, {
                uiSref: 'contests.list',
                name: 'Тест тест тест'
            }, {
                uiSref: 'contests.list',
                name: 'Тест тест тест'
            }, {
                uiSref: 'contests.list',
                name: 'Тест тест тест'
            }, {
                uiSref: 'contests.list',
                name: 'Тест тест тест'
            }, {
                uiSref: 'contests.list',
                name: 'Тест тест тест'
            }, {
                uiSref: 'contests.list',
                name: 'Тест тест тест'
            }, {
                uiSref: 'contests.list',
                name: 'Тест тест тест'
            }];
        }
    ])

    .controller('AdminIndexController', ['$scope', '$rootScope', '$state', '_', 'ContestsManager',
        function ($scope, $rootScope, $state, _, ContestsManager) {
            $scope.$emit('change_title', {
                title: 'Управление контестами | ' + _('app_name')
            });
            var defaultCount = 10;

            $scope.pageNumber = parseInt($state.params.pageNumber || 1);
            $scope.params = {
                count: defaultCount,
                offset: ($scope.pageNumber - 1) * defaultCount,
                category: 'all',
                sort: 'byId',
                sort_order: 'desc'
            };

            $scope.all_items_count = 0;
            $scope.pagination = [];
            $scope.contestsList = [];
            $scope.allPages = 0;

            $scope.curSortItem = null;
            $scope.sortCategories = [{
                name: 'По дате создания',
                sort: 'byId'
            }, {
                name: 'По времени завершения',
                sort: 'byEnd'
            }, {
                name: 'По времени начала',
                sort: 'byStart'
            }];

            $scope.curSortOrder = null;
            $scope.sortOrders = [{
                name: 'По убыванию',
                order: 'desc'
            }, {
                name: 'По возрастанию',
                order: 'asc'
            }];

            $scope.curCategory = null;
            $scope.contestCategories = [{
                name: 'Все',
                category: 'all'
            }, {
                name: 'Только активные',
                category: 'showOnlyStarted'
            }, {
                name: 'Только активные с заморозкой',
                category: 'showOnlyFrozen'
            }, {
                name: 'Только завершенные',
                category: 'showOnlyFinished'
            }, {
                name: 'Только дорешивание',
                category: 'showOnlyPractice'
            }, {
                name: 'Только доступные',
                category: 'showOnlyEnabled'
            }, {
                name: 'Только недоступные',
                category: 'showOnlyDisabled'
            }, {
                name: 'Только удалённые',
                category: 'showOnlyRemoved'
            }];

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
                updateContestsList();
            });

            function updateContestsList() {
                $rootScope.$broadcast('data loading');
                var contestsPromise = ContestsManager.getContests($scope.params);
                contestsPromise.then(function (result) {
                    $rootScope.$broadcast('data loaded');
                    if (!result || !result.hasOwnProperty('all_items_count')) {
                        return;
                    }
                    $scope.all_items_count = result.all_items_count;
                    $scope.contestsList = result.contests;
                    $scope.pagination = generatePaginationArray(5);
                }).catch(function (err) {
                    console.log(err);
                });
            }

            updateContestsList();

            $scope.$watch('curCategory', function (newVal, oldVal) {
                if (!newVal) {
                    return;
                }
                $scope.params.category = newVal;
                $scope.pageNumber !== 1 ?
                    $state.go('contests.list') : updateContestsList();
                console.log('updating contests list...');
            });

            $scope.$watch('curSortItem', function (newVal, oldVal) {
                if (!newVal) {
                    return;
                }
                $scope.params.sort = newVal;
                updateContestsList();
                console.log('updating contests list...');
            });

            $scope.$watch('curSortOrder', function (newVal, oldVal) {
                if (!newVal) {
                    return;
                }
                $scope.params.sort_order = newVal;
                updateContestsList();
                console.log('updating contests list...');
            });
        }
    ])

    .controller('AdminEditContestController', ['$scope', '$rootScope', '$state', '_', 'ContestsManager',
        function ($scope, $rootScope, $state, _, ContestsManager) {
            $scope.$emit('change_title', {
                title: 'Редактирование контеста | ' + _('app_name')
            });
        }
    ])

    .controller('AdminCreateContestController', ['$scope', '$rootScope', '$state', '_', 'ContestsManager', '$q',
        function ($scope, $rootScope, $state, _, ContestsManager, $q) {
            $scope.$emit('change_title', {
                title: 'Создание контеста | ' + _('app_name')
            });
            $scope.form = {
                contestRelativeFinishTime: 5,
                contestFreezeTime: 1,
                contestPracticeTime: 0,
                contestStartTime: 9,
                groups: []
            };
            $scope.startTimes = [];

            var zF = function (num) { return num < 10 ? '0' + num : num };
            for (var i = 0; i < 24; ++i) {
                $scope.startTimes.push({
                    time: i,
                    name: zF(i) + ':00'
                });
            }

            $scope.submitForm = function () {
                alert("Форма отправлена");
            };

            $scope.chips = {
                selectedItem: '',
                searchText: ''
            };

            $scope.groupSearch = function (query) {
                var deferred = $q.defer();
                var items = [{
                    name: 'Тренеры',
                    color: 'rgba(77, 170, 102, 0.75)',
                    id: 1
                }, {
                    name: 'Старший дивизион',
                    color: 'rgba(96, 92, 243, 0.75)',
                    id: 2
                }];
                var results = query ? items.filter(function (element) {
                    if (!element || !element.name) {
                        return false;
                    }
                    return element.name.indexOf(query) !== -1;
                }) : [];

                setTimeout(function () {
                    deferred.resolve(results);
                }, 1000);

                return deferred.promise;
            };
        }
    ])
;