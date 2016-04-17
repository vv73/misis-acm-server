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

    .controller('ContestItemBaseController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_', 'SocketService', 'Battery', '$mdToast', '$mdSidenav', '$log', '$timeout',
        function ($scope, $rootScope, $state, ContestsManager, _, SocketService, Battery, $mdToast, $mdSidenav, $log, $timeout) {
            $scope.$emit('change_title', {
                title: 'Контест | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            $scope.contest = {};

            function updateContest() {
                $rootScope.$broadcast('data loading');
                ContestsManager.canJoin({contest_id: contestId})
                    .then(function (response) {
                        if (!response || !response.result
                            || !response.result.can || !response.result.joined) {
                            $rootScope.$broadcast('data loaded');
                            $state.go('index');
                        }
                        console.log('Доступ к контесту разрешен. Идет загрузка данных...');
                        ContestsManager.getContest({contest_id: contestId})
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
            }
            updateContest();

            $scope.updateContest = updateContest;

            function contestFill (contest) {
                function getMonthName(num) {
                    num = num || 0;
                    if (num < 0 || num > 12) {
                        num = 0;
                    }
                    var month = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
                        'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
                    return month[num];
                }

                function zeroFill(num) {
                    return num >= 0 && num < 10 ? '0' + num : num;
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
                contest.finishPracticeDate = formatDate(contest.absolutePracticeDurationTime);

                return contest;
            }

            var socketId,
                verdictUpdatesListener,
                newSolutionListener,
                tableUpdateListener;

            SocketService.onConnect(function () {
                socketId = SocketService.getSocket().id;
                console.log('Connected:', socketId);

                SocketService.joinContest(contestId);

                SocketService.getSocket().on('reconnect', function (data) {
                    console.log('Reconnected', SocketService.getSocket().id);
                    setTimeout(function () {
                        SocketService.joinContest(contestId);
                    }, 500);
                    //attachEvents();
                });

                attachEvents();
            });

            function attachEvents() {
                verdictUpdatesListener = SocketService.setListener('verdict updated', function (data) {
                    $rootScope.$broadcast('verdict updated', data);
                });
                newSolutionListener = SocketService.setListener('new solution', function (data) {
                    $rootScope.$broadcast('new solution', data);
                });
                tableUpdateListener = SocketService.setListener('table update', function () {
                    $rootScope.$broadcast('table update');
                });
            }

            function removeEvents() {
                try {
                    verdictUpdatesListener.removeListener();
                    newSolutionListener.removeListener();
                    tableUpdateListener.removeListener();
                } catch (err) {
                    console.log(err);
                }
            }

            $scope.$on('$destroy', function () {
                $rootScope.$broadcast('header expand close');
                $rootScope.$broadcast('inbox.messages.update-numbers', {
                    unreadMessagesNumber: 0,
                    allMessagesNumber: 0
                });
                SocketService.leaveContest(contestId);
                Battery.dispose();
                removeEvents();
            });

            var batteryLowEventDispatched = false;
            if (Battery.supported) {
                Battery.setOnLevelChangeListener(function (event) {
                    if (!event || !event.target || !event.target.level
                        || event.target.charging || !event.target.dischargingTime) {
                        return;
                    }
                    var level = event.target.level,
                        dischargingTime = event.target.dischargingTime;
                    if (level < 1) {
                        level *= 100;
                    }
                    if (level <= 15 && !batteryLowEventDispatched) {
                        $rootScope.$broadcast( 'battery level low', { level: level, dischargingTime: dischargingTime } );
                    }
                });
            }

            $scope.$on('battery level low', function (ev, args) {
                var position = [ 'left', 'bottom' ];
                var toast = $mdToast.show({
                    hideDelay: 20000,
                    parent: document.body,
                    templateUrl: templateUrl('contest-item/toast', 'battery-charge-low'),
                    controller: ['$scope', function ($scope) {
                        $scope.dischargingTime = new Date().getTime() + (args.dischargingTime || 0) * 1000;
                        $scope.closeToast = function() {
                            $mdToast.hide();
                        };
                    }],
                    position: position.join(' ')
                });

                toast.then(function(response) {
                    if ( response == 'ok' ) {
                        batteryLowEventDispatched = true;
                    }
                });
            });

            $timeout(function () {
                $rootScope.$broadcast('inbox.messages.update');
            });

            $scope.$on('toggleRightSidenav', function (ev, args) {
                $scope.toggleRight();
            });

            $scope.isOpenRightSidenav = function(){
                return $mdSidenav('right').isOpen();
            };

            $scope.toggleRight = buildToggler('right');

            /**
             * Supplies a function that will continue to operate until the
             * time is up.
             */
            function debounce(func, wait, context) {
                var timer;
                return function debounced() {
                    var context = $scope,
                        args = Array.prototype.slice.call(arguments);
                    $timeout.cancel(timer);
                    timer = $timeout(function() {
                        timer = undefined;
                        func.apply(context, args);
                    }, wait || 10);
                };
            }

            /**
             * Build handler to open/close a SideNav; when animation finishes
             * report completion in console
             */
            function buildDelayedToggler(navID) {
                return debounce(function() {
                    $mdSidenav(navID)
                        .toggle()
                        .then(function () {
                            $log.debug("toggle " + navID + " is done");
                        });
                }, 200);
            }

            function buildToggler(navID) {
                return function() {
                    $mdSidenav(navID)
                        .toggle()
                        .then(function () {
                            $log.debug("toggle " + navID + " is done");
                        });
                }
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

    .controller('ContestItemMonitorController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'UserManager', '$mdDialog',
        function ($scope, $rootScope, $state, ContestItemManager, _, UserManager, $mdDialog) {
            $scope.$emit('change_title', {
                title: 'Таблица результатов | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            $scope.contestTable = {};
            $scope.user = {};

            function updateTable(withoutLoading) {
                if (!withoutLoading) {
                    $rootScope.$broadcast('data loading');
                }
                ContestItemManager.getTable({contest_id: contestId})
                    .then(function (result) {
                        if (result.error) {
                            return $rootScope.$broadcast('data loaded');
                        }
                        $scope.contestTable = result;
                        UserManager.getCurrentUser()
                            .then(function (user) {
                                $rootScope.$broadcast('data loaded');
                                $scope.user = user;
                            }).catch(function () {
                                $rootScope.$broadcast('data loaded');
                            });
                    });
            }
            updateTable();
            $scope.updateTable = updateTable;
            
            $scope.disableUpdating = false;

            $scope.$on('table update', function () {
                if (!$scope.disableUpdating) {
                    updateTable(true);
                }
            });

            $scope.openStatusDialog = function (ev, cell, user) {
                if (!cell || !cell.task || cell.result === '—'
                    || !user || !user.user_id) {
                    return;
                }
                var userId = user.user_id,
                    problemIndex = cell.task;
                cell._loading = true;

                ContestItemManager.getSentsForCell({
                    contest_id: contestId,
                    user_id: userId,
                    problem_index: problemIndex
                }).then(function (response) {
                    cell._loading = false;
                    if (!response || response.error) {
                        return alert('Произошла ошибка: ' + response.error);
                    }
                    $mdDialog.show({
                        controller: 'ContestItemCellStatusController',
                        templateUrl: templateUrl('contest-item/contest-monitor', 'contest-monitor-cell-status-dialog'),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose: true,
                        locals: {
                            sents: response.sents || [],
                            $originalDialogArgs: [ ev, cell, user ],
                            $originalDialogScope: $scope
                        }
                    });
                });
            };
        }
    ])

    .controller('ContestItemConditionsController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'UserManager',
        function ($scope, $rootScope, $state, ContestItemManager, _, UserManager) {
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

            $scope.user = {};
            UserManager.getCurrentUser().then(function (user) {
                $scope.user = user;
            });
        }
    ])

    .controller('ConditionsItemController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$mdMedia', '$mdDialog',
        function ($scope, $rootScope, $state, ContestItemManager, _, $mdMedia, $mdDialog) {
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
                    result.formatted_text = result.formatted_text
                        .replace(/(\<\!\–\–\s?google_ad_section_(start|end)\s?\–\–\>)/gi, '');
                    $scope.condition = result;
                });
            
            $scope.openImage = function (ev, file) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
                $mdDialog.show({
                    controller: ['$scope', function ($scope) {
                        $scope.file = file;
                        $scope.close = function () {
                            $mdDialog.hide();
                        };
                    }],
                    template: '<md-dialog aria-label="Image"  ng-cloak>\n  <form>\n    <md-toolbar>\n      <div class="md-toolbar-tools">\n        <h2>{{file.title ? file.title : "Изображение"}}</h2>\n        <span flex></span>\n        <md-button class="md-icon-button" ng-click="close()">\n          <md-icon md-svg-src="/img/icons/ic_close_48px.svg" aria-label="Close dialog"></md-icon>\n        </md-button>\n      </div>\n    </md-toolbar>\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <img class="markdown__image" ng-src="{{file.url}}" title="{{file.title}}">\n      </div>\n    </md-dialog-content>\n    <md-dialog-actions layout="row">\n      <md-button style="margin-right: 20px;" ng-click="close()">\n        Закрыть\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true
                });

                ev.preventDefault();
                return false;
            };
        }
    ])

    .controller('ContestItemSendController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'Storage', 'Upload',
        function ($scope, $rootScope, $state, ContestItemManager, _, Storage, Upload) {
            $scope.$emit('change_title', {
                title: 'Отправить решение | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            $scope.conditions = [];
            $scope.selectedCondition = $state.params.problemIndex;
            $scope.currentLangs = [];
            $scope.selectedLangId = null;

            var curLang = {};

            $scope.$watch('selectedCondition', function (newValue, oldValue) {
                if (!newValue) {
                    return;
                }
                Storage.get('selected_problems').then(function (selectedProblems) {
                    selectedProblems = selectedProblems || {};
                    selectedProblems[ 'contest' + contestId ] = $scope.selectedCondition;
                    Storage.set({ selected_problems: selectedProblems });
                });

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
                    if (result.length) {
                        curLang.type = result[0].system_type;
                    }
                    Storage.get('system_langs').then(function (system_langs) {
                        if (!system_langs || typeof system_langs !== 'object') {
                            return $scope.selectedLangId = result && result.length ?
                                result[0].id : null;
                        }
                        var langId = system_langs[ curLang.type ];
                        if (!langId) {
                            return $scope.selectedLangId = result && result.length ?
                                result[0].id : null;
                        }
                        $scope.selectedLangId = langId;
                    });
                }).catch(function () {
                    $rootScope.$broadcast('data loaded');
                });
            });

            $scope.$watch('selectedLangId', function (newVal, oldVal) {
                curLang.id = newVal;
                if (newVal == oldVal) {
                    return;
                }
                Storage.get('system_langs').then(function (system_langs) {
                    if (!system_langs || typeof system_langs !== 'object') {
                        system_langs = {};
                    }
                    if (!curLang.id || !curLang.type) {
                        return;
                    }
                    system_langs[ curLang.type ] = curLang.id;
                    Storage.set({ system_langs: system_langs });
                });
            });

            $rootScope.$broadcast('data loading');
            ContestItemManager.getConditions({ contest_id: contestId })
                .then(function (result) {
                    $rootScope.$broadcast('data loaded');
                    if (result.error) {
                        return alert('Произошла ошибка: ' + result.error);
                    }
                    $scope.conditions = result;
                    Storage.get('selected_problems').then(function (selectedProblems) {
                        selectedProblems = selectedProblems || {};
                        if (!('contest' + contestId in selectedProblems)) {
                            $scope.selectedCondition = $state.params.problemIndex || 'A';
                            selectedProblems[ 'contest' + contestId ] = $scope.selectedCondition;
                            Storage.set({ selected_problems: selectedProblems });
                        } else {
                            var curProblemIndex = selectedProblems[ 'contest' + contestId ];
                            $scope.selectedCondition = $state.params.problemIndex || curProblemIndex || 'A';
                        }
                    });
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
                    $state.go('^.status', { select: 'my' });
                });
            };

            // upload on file select or drop
            $scope.upload = function (file) {
                Upload.upload({
                    url: '/api/contest/pipe',
                    data: {file: file}
                }).then(function (resp) {
                    console.log('Success ' + resp.config.data.file.name + 'uploaded.');
                    $scope.solution = resp.data;
                }, function (resp) {
                    console.log('Error status: ' + resp.status);
                }, function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
                });
            };
        }
    ])

    .controller('ContestItemStatusController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$timeout', '$interval', 'UserManager', '$mdDialog', 'AdminManager',
        function ($scope, $rootScope, $state, ContestItemManager, _, $timeout, $interval, UserManager, $mdDialog, AdminManager) {
            $scope.$emit('change_title', {
                title: 'Мои посылки | ' + _('app_name')
            });
            var contestId = $state.params.contestId;
            var select = $state.params.select;
            var defaultCount = 15;

            $scope.pageNumber = parseInt($state.params.pageNumber || 1);
            $scope.params = {
                contest_id: contestId,
                count: defaultCount,
                offset: ($scope.pageNumber - 1) * defaultCount,
                select: select
            };

            $scope.all_items_count = 0;
            $scope.pagination = [];
            $scope.sents = [];
            $scope.allPages = 0;

            $scope.loadingData = false;

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

            updateSentsList();

            function updateSentsList(page) {
                $rootScope.$broadcast('data loading');
                $scope.loadingData = true;
                ContestItemManager.getSents($scope.params)
                    .then(function (result) {
                        $timeout(function () {
                            $rootScope.$broadcast('data loaded');
                            $scope.loadingData = false;
                        }, 0);
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

            $scope.selectedTabIndex = select === 'my' ? 0 : 1;
            var firstInvokeStateChanged = true;
            $scope.$watch('selectedTabIndex', function(current, old) {
                if (firstInvokeStateChanged) {
                    return (firstInvokeStateChanged = false);
                }
                $scope.pageNumber = current === old ? ($state.params.pageNumber || 1) : 1;
                $scope.params.offset = ($scope.pageNumber - 1) * defaultCount;
                $scope.params.select = current === 0 ? 'my' : 'all';
                switch (current) {
                    case 0: {
                        $scope.$emit('change_title', {
                            title: 'Мои посылки | ' + _('app_name')
                        });
                        if ($scope.pageNumber === 1) {
                            $state.transitionTo(
                                'contest.status',
                                { select: 'my' },
                                { location: true, inherit: true, relative: $state.$current, notify: false }
                            );
                        } else {
                            $state.transitionTo(
                                'contest.status-pagination',
                                { select: 'my', pageNumber: $scope.pageNumber },
                                { location: true, inherit: true, relative: $state.$current, notify: false }
                            );
                        }
                        break;
                    }
                    case 1: {
                        $scope.$emit('change_title', {
                            title: 'Все посылки | ' + _('app_name')
                        });
                        if ($scope.pageNumber === 1) {
                            $state.transitionTo(
                                'contest.status',
                                { select: 'all' },
                                { location: true, inherit: true, relative: $state.$current, notify: false }
                            );
                        } else {
                            $state.transitionTo(
                                'contest.status-pagination',
                                { select: 'all', pageNumber: $scope.pageNumber },
                                { location: true, inherit: true, relative: $state.$current, notify: false }
                            );
                        }
                        break;
                    }
                }
                updateSentsList();
            });

            $scope.currentUser = {};
            UserManager.getCurrentUser().then(function (user) {
                $scope.currentUser = user;
            });

            $scope.$on('verdict updated', function (ev, args) {
                var sents = $scope.sents;
                for (var i = 0; i < sents.length; ++i) {
                    if (sents[i].sent_id === args.solution_id) {
                        if (typeof args.time !== 'undefined') {
                            sents[i].execution_time = args.time;
                        }
                        if (typeof args.memory !== 'undefined') {
                            sents[i].memory = args.memory;
                        }
                        if (typeof args.testNum !== 'undefined') {
                            sents[i].test_num = args.testNum;
                        }
                        if (typeof args.verdict_id !== 'undefined') {
                            sents[i].verdict_id = args.verdict_id;
                        }
                        if (typeof args.verdict_name !== 'undefined') {
                            sents[i].verdict_name = args.verdict_name;
                        }
                        $scope.$apply();
                        break;
                    }
                }
            });

            $scope.$on('new solution', function (ev, data) {
                //console.log(data);
                var userId = data.contestant_id,
                    select = $scope.params.select;
                if (select === 'my'
                    && userId !== $scope.currentUser.id
                    || $scope.pageNumber !== 1) {
                    return;
                }
                var sents = $scope.sents;
                for (var i = 0; i < sents.length; ++i) {
                    if (sents[i].sent_id === data.sent_id) {
                        return;
                    }
                }
                if (sents.length >= defaultCount) {
                    sents.pop();
                }
                sents.unshift(data);
            });

            $scope.actionsMenuItems = [{
                id: 'CHANGE_VERDICT',
                name: 'Изменить вердикт',
                svgIcon: '/img/icons/ic_edit_48px.svg'
            }, {
                id: 'SEND_DUPLICATE',
                name: 'Продублировать отправку',
                svgIcon: '/img/icons/ic_content_copy_48px.svg'
            }, {
                id: 'REFRESH_SOLUTION',
                name: 'Переотправить решение',
                svgIcon: '/img/icons/ic_refresh_48px.svg'
            }, {
                id: 'SENT_DELETE',
                name: 'Удалить отправку',
                svgIcon: '/img/icons/ic_delete_48px.svg'
            }];

            $scope.selectAction = function (ev, action, item) {
                function changeVerdict() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showVerdictSelectionDialog(ev, item);
                }

                function sendDuplicate() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showConfirmationDialogBeforeSendDuplicate(ev).then(function () {
                        AdminManager
                            .sendSolutionAgain( { sent_id: item.sent_id } )
                            .then(function (result) {
                                if (result && result.error) {
                                    return alert('Произошла ошибка: ' + result.error);
                                }
                            });
                    });
                }

                function refreshSolution() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showConfirmationDialogBeforeRefreshing(ev).then(function () {
                        AdminManager
                            .refreshSolution( { sent_id: item.sent_id } )
                            .then(function (result) {
                                if (result && result.error) {
                                    return alert('Произошла ошибка: ' + result.error);
                                }
                            });
                    });
                }

                function deleteSolution() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showConfirmationDialogBeforeDeleting(ev).then(function () {
                        AdminManager
                            .deleteSolution( { sent_id: item.sent_id } )
                            .then(function (result) {
                                if (result && result.error) {
                                    return alert('Произошла ошибка: ' + result.error);
                                }
                                updateSentsList();
                            });
                    });
                }

                var actions = {
                    'CHANGE_VERDICT': changeVerdict,
                    'SEND_DUPLICATE': sendDuplicate,
                    'REFRESH_SOLUTION': refreshSolution,
                    'SENT_DELETE': deleteSolution
                };

                if (action && action.id in actions) {
                    actions[action.id]();
                }
            };

            function showVerdictSelectionDialog(ev, item) {
                $mdDialog.show({
                    controller: ['$scope', 'sentItem', function ($scope, sentItem) {
                        //console.log(sentItem);
                        $scope.close = function () {
                            $mdDialog.hide();
                        };

                        $scope.verdicts = [{
                            id: 1,
                            name: 'Accepted',
                            scored: 0
                        }, {
                            id: 2,
                            name: 'Wrong Answer',
                            scored: 1
                        }, {
                            id: 3,
                            name: 'Compilation Error',
                            scored: 0
                        }, {
                            id: 4,
                            name: 'Runtime Error',
                            scored: 1
                        }, {
                            id: 5,
                            name: 'Presentation Error',
                            scored: 1
                        }, {
                            id: 6,
                            name: 'Time Limit Exceeded',
                            scored: 1
                        }, {
                            id: 7,
                            name: 'Memory Limit Exceeded',
                            scored: 1
                        }, {
                            id: 8,
                            name: 'Idleness Limit Exceeded',
                            scored: 1
                        }, {
                            id: 9,
                            name: 'Security Violated',
                            scored: 1
                        }, {
                            id: 10,
                            name: 'Unknown System Error',
                            scored: 0
                        }, {
                            id: 11,
                            name: 'Same solution',
                            scored: 0
                        }, {
                            id: 12,
                            name: 'Disqualification',
                            scored: 0
                        }];

                        $scope.selectedVerdictId = sentItem.verdict_id;

                        $scope.save = function () {
                            var sentId = sentItem.sent_id,
                                verdict = $scope.selectedVerdictId;
                            AdminManager
                                .setVerdictForSent( { sent_id: sentId, verdict_id: verdict } )
                                .then(function (result) {
                                    if (result && result.error) {
                                        return alert('Произошла ошибка: ' + result.error);
                                    }
                                    $mdDialog.hide();
                                    updateSentsList();
                                });
                        };
                    }],
                    templateUrl: templateUrl('contest-item/contest-status', 'contest-verdict-selection-dialog'),
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    locals: {
                        sentItem: item
                    }
                }).then(function(answer) {
                    $scope.status = 'You said the information was "' + answer + '".';
                }, function() {
                    $scope.status = 'You cancelled the dialog.';
                });
            }

            function showConfirmationDialogBeforeSendDuplicate(ev) {
                var confirm = $mdDialog.confirm()
                    .title('Подтверждение')
                    .content('Вы действительно хотите отправить это решение еще раз?')
                    .ariaLabel('Duplicate confirmation')
                    .ok('Да')
                    .cancel('Отмена')
                    .targetEvent(ev);
                return $mdDialog.show(confirm);
            }

            function showConfirmationDialogBeforeRefreshing(ev) {
                var confirm = $mdDialog.confirm()
                    .title('Подтверждение')
                    .content('Вы действительно хотите обновить это решение?')
                    .ariaLabel('Refresh confirmation')
                    .ok('Да')
                    .cancel('Отмена')
                    .targetEvent(ev);
                return $mdDialog.show(confirm);
            }

            function showConfirmationDialogBeforeDeleting(ev) {
                var confirm = $mdDialog.confirm()
                    .title('Подтверждение')
                    .content('Вы действительно хотите удалить это решение?')
                    .ariaLabel('Delete confirmation')
                    .ok('Да')
                    .cancel('Отмена')
                    .targetEvent(ev);
                return $mdDialog.show(confirm);
            }

            $scope.refreshAllSolutions = function (ev) {
                var confirm = $mdDialog.confirm()
                    .title('Подтверждение')
                    .content('Вы действительно хотите переотправить все решения в этом контесте?')
                    .ariaLabel('Refresh confirmation')
                    .ok('Да, хочу')
                    .cancel('Отмена')
                    .targetEvent(ev);
                $mdDialog.show(confirm).then(function () {
                    AdminManager.refreshAllSolutions({ contest_id: contestId }).then(function (result) {
                        if (result && result.error) {
                            return alert('Произошла ошибка: ' + result.error);
                        }
                    });
                });
            };
        }
    ])

    .controller('ContestItemCellStatusController', [
        '$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$timeout', 'UserManager', '$mdDialog', 'AdminManager', 'sents', '$originalDialogArgs', '$originalDialogScope',
        function ($scope, $rootScope, $state, ContestItemManager, _, $timeout, UserManager, $mdDialog, AdminManager, sents, $originalDialogArgs, $originalDialogScope) {
            $scope.close = function () {
                $mdDialog.hide();
            };

            $scope.sents = sents;

            $scope.currentUser = {};
            UserManager.getCurrentUser().then(function (user) {
                $scope.currentUser = user;
            });

            $scope.$on('verdict updated', function (ev, args) {
                var sents = $scope.sents;
                for (var i = 0; i < sents.length; ++i) {
                    if (sents[i].sent_id === args.solution_id) {
                        if (typeof args.time !== 'undefined') {
                            sents[i].execution_time = args.time;
                        }
                        if (typeof args.memory !== 'undefined') {
                            sents[i].memory = args.memory;
                        }
                        if (typeof args.testNum !== 'undefined') {
                            sents[i].test_num = args.testNum;
                        }
                        if (typeof args.verdict_id !== 'undefined') {
                            sents[i].verdict_id = args.verdict_id;
                        }
                        if (typeof args.verdict_name !== 'undefined') {
                            sents[i].verdict_name = args.verdict_name;
                        }
                        $scope.$apply();
                        break;
                    }
                }
            });

            $scope.$on('new solution', function (ev, data) {
                //console.log(data);
                var userId = data.contestant_id;
                if (userId !== $scope.currentUser.id) {
                    return;
                }
                var sents = $scope.sents;
                for (var i = 0; i < sents.length; ++i) {
                    if (sents[i].sent_id === data.sent_id) {
                        return;
                    }
                }
                $scope.sents.unshift( data );
            });

            $scope.actionsMenuItems = [{
                id: 'CHANGE_VERDICT',
                name: 'Изменить вердикт',
                svgIcon: '/img/icons/ic_edit_48px.svg'
            }, {
                id: 'SEND_DUPLICATE',
                name: 'Продублировать отправку',
                svgIcon: '/img/icons/ic_content_copy_48px.svg'
            }, {
                id: 'REFRESH_SOLUTION',
                name: 'Переотправить решение',
                svgIcon: '/img/icons/ic_refresh_48px.svg'
            }, {
                id: 'SENT_DELETE',
                name: 'Удалить отправку',
                svgIcon: '/img/icons/ic_delete_48px.svg'
            }];

            $scope.selectAction = function (ev, action, item) {
                function changeVerdict() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showVerdictSelectionDialog(ev, item);
                }

                function sendDuplicate() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showConfirmationDialogBeforeSendDuplicate(ev).then(function () {
                        $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );

                        AdminManager
                            .sendSolutionAgain( { sent_id: item.sent_id } )
                            .then(function (result) {
                                if (result && result.error) {
                                    return alert('Произошла ошибка: ' + result.error);
                                }
                            });
                    }, function () {
                        $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
                    });
                }

                function refreshSolution() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showConfirmationDialogBeforeRefreshing(ev).then(function () {
                        $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
                        AdminManager
                            .refreshSolution( { sent_id: item.sent_id } )
                            .then(function (result) {
                                if (result && result.error) {
                                    return alert('Произошла ошибка: ' + result.error);
                                }
                            });
                    }, function () {
                        $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
                    });
                }

                function deleteSolution() {
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    showConfirmationDialogBeforeDeleting(ev).then(function () {
                        $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
                        AdminManager
                            .deleteSolution( { sent_id: item.sent_id } )
                            .then(function (result) {
                                if (result && result.error) {
                                    return alert('Произошла ошибка: ' + result.error);
                                }
                            });
                    }, function () {
                        $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
                    });
                }

                var actions = {
                    'CHANGE_VERDICT': changeVerdict,
                    'SEND_DUPLICATE': sendDuplicate,
                    'REFRESH_SOLUTION': refreshSolution,
                    'SENT_DELETE': deleteSolution
                };

                if (action && action.id in actions) {
                    actions[action.id]();
                }
            };

            function showVerdictSelectionDialog(ev, item) {
                $mdDialog.show({
                    controller: ['$scope', 'sentItem', function ($scope, sentItem) {
                        //console.log(sentItem);
                        $scope.close = function () {
                            $mdDialog.hide();
                        };

                        $scope.verdicts = [{
                            id: 1,
                            name: 'Accepted',
                            scored: 0
                        }, {
                            id: 2,
                            name: 'Wrong Answer',
                            scored: 1
                        }, {
                            id: 3,
                            name: 'Compilation Error',
                            scored: 0
                        }, {
                            id: 4,
                            name: 'Runtime Error',
                            scored: 1
                        }, {
                            id: 5,
                            name: 'Presentation Error',
                            scored: 1
                        }, {
                            id: 6,
                            name: 'Time Limit Exceeded',
                            scored: 1
                        }, {
                            id: 7,
                            name: 'Memory Limit Exceeded',
                            scored: 1
                        }, {
                            id: 8,
                            name: 'Idleness Limit Exceeded',
                            scored: 1
                        }, {
                            id: 9,
                            name: 'Security Violated',
                            scored: 1
                        }, {
                            id: 10,
                            name: 'Unknown System Error',
                            scored: 0
                        }, {
                            id: 11,
                            name: 'Same solution',
                            scored: 0
                        }, {
                            id: 12,
                            name: 'Disqualification',
                            scored: 0
                        }];

                        $scope.selectedVerdictId = sentItem.verdict_id;

                        $scope.save = function () {
                            var sentId = sentItem.sent_id,
                                verdict = $scope.selectedVerdictId;
                            AdminManager
                                .setVerdictForSent( { sent_id: sentId, verdict_id: verdict } )
                                .then(function (result) {
                                    if (result && result.error) {
                                        return alert('Произошла ошибка: ' + result.error);
                                    }
                                    $mdDialog.hide();
                                });
                        };
                    }],
                    templateUrl: templateUrl('contest-item/contest-status', 'contest-verdict-selection-dialog'),
                    parent: angular.element(document.body),
                    targetEvent: $originalDialogArgs[0],
                    clickOutsideToClose: true,
                    locals: {
                        sentItem: item
                    }
                }).then(function(answer) {
                    $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
                }, function() {
                    $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
                });
            }

            function showConfirmationDialogBeforeSendDuplicate(ev) {
                var confirm = $mdDialog.confirm()
                    .title('Подтверждение')
                    .content('Вы действительно хотите отправить это решение еще раз?')
                    .ariaLabel('Duplicate confirmation')
                    .ok('Да')
                    .cancel('Отмена')
                    .targetEvent($originalDialogArgs[0]);
                return $mdDialog.show(confirm);
            }

            function showConfirmationDialogBeforeRefreshing(ev) {
                var confirm = $mdDialog.confirm()
                    .title('Подтверждение')
                    .content('Вы действительно хотите обновить это решение?')
                    .ariaLabel('Refresh confirmation')
                    .ok('Да')
                    .cancel('Отмена')
                    .targetEvent($originalDialogArgs[0]);
                return $mdDialog.show(confirm);
            }

            function showConfirmationDialogBeforeDeleting(ev) {
                var confirm = $mdDialog.confirm()
                    .title('Подтверждение')
                    .content('Вы действительно хотите удалить это решение?')
                    .ariaLabel('Delete confirmation')
                    .ok('Да')
                    .cancel('Отмена')
                    .targetEvent($originalDialogArgs[0]);
                return $mdDialog.show(confirm);
            }
        }
    ])

    .controller('ContestItemSourceController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$timeout',
        function ($scope, $rootScope, $state, ContestItemManager, _, $timeout) {
            $scope.$emit('change_title', {
                title: 'Исходный код | ' + _('app_name')
            });

            var contestId = $state.params.contestId;
            var sourceId = $state.params.sourceId;
            $scope.sourceId = sourceId;

            $scope.source = null;

            $rootScope.$broadcast('data loading');
            ContestItemManager.getSourceCode({ contest_id: contestId, source_id: sourceId })
                .then(function (result) {
                    $scope.source = result;
                    $timeout(function () {
                        $rootScope.$broadcast('data loaded');
                        if (!Rainbow) {
                            var tryRunRainbow = setInterval(function () {
                                if (!Rainbow) {
                                    return;
                                }
                                Rainbow.color();
                                $rootScope.$broadcast('data loaded');
                                clearInterval(tryRunRainbow);
                            }, 500);
                        } else {
                            $rootScope.$broadcast('data loaded');
                            Rainbow.color();
                        }
                    }, 200);
                }).catch(function () {
                    $rootScope.$broadcast('data loaded');
                });
        }
    ])

    .controller('RightSidenavCtrl', ['$scope', '$rootScope', '$timeout', '$mdSidenav', '$log', '$state', 'ContestItemManager',
        function ($scope, $rootScope, $timeout, $mdSidenav, $log, $state, ContestItemManager) {

            $scope.close = function () {
                $mdSidenav('right').close()
                    .then(function () {
                        $log.debug("close RIGHT is done");
                    });
            };

            $scope.isOpenRightSidenav = function(){
                return $mdSidenav('right').isOpen();
            };

            $scope.$on('toggleRightSidenav', function (ev, args) {
                var isOpenAction = $scope.isOpenRightSidenav();
                if (isOpenAction) {
                    $scope.isMessagesLoading = true;
                    $timeout(function () {
                        $scope.updateMessages(true);
                    }, 50);
                }
            });

            $scope.$on('inbox.messages.update', function (ev, args) {
                $timeout(function () {
                    $scope.updateMessages();
                }, 200);
            });

            //first initializing
            $timeout(function () {
                //if contest id is not specified - pass the update
                var contestId = $state.params.contestId;
                if (contestId) {
                    $scope.updateMessages();
                }
            });

            $scope.messages = {
                read: [],
                unread: []
            };

            $scope.updateMessages = buildDelayedFunc(function (isImplicitAction) {
                $scope.isMessagesLoading = true;
                var contestId = $state.params.contestId;
                ContestItemManager.getMessages({ contest_id: contestId || 1 })
                    .then(function (messages) {
                        $scope.isMessagesLoading = false;
                        if (messages.error) {
                            return alert('Error: ' + messages.error);
                        }
                        $scope.messages = messages;
                        $rootScope.$broadcast('inbox.messages.update-numbers', {
                            unreadMessagesNumber: (messages.unread || []).length,
                            allMessagesNumber: (messages.read || []).length + (messages.unread || []).length
                        });
                        if (isImplicitAction) {
                            ContestItemManager.markAsRead({ contest_id: contestId || 1 })
                                .then(function (res) {
                                    if (res.error) {
                                        return console.log(res);
                                    }
                                    $rootScope.$broadcast('inbox.messages.update-numbers', {
                                        unreadMessagesNumber: 0
                                    });
                                });
                        }
                    });
            });

            /**
             * Supplies a function that will continue to operate until the
             * time is up.
             */
            function debounce(func, wait, context) {
                var timer;
                return function debounced() {
                    var context = $scope,
                        args = Array.prototype.slice.call(arguments);
                    $timeout.cancel(timer);
                    timer = $timeout(function() {
                        timer = undefined;
                        func.apply(context, args);
                    }, wait || 10);
                };
            }

            /**
             * Build handler to open/close a SideNav; when animation finishes
             * report completion in console
             */
            function buildDelayedFunc(fn) {
                return debounce(function() {
                    fn.apply(this, arguments);
                }, 200);
            }
        }
    ])
;