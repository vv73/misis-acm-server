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
                    $scope.conditions = result;
                });
        }
    ])

    .controller('ContestItemSendController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Отправить решение | ' + _('app_name')
            });
            console.log('Отправка задачи');
        }
    ])

    .controller('ContestItemStatusController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
        function ($scope, $rootScope, $state, ContestItemManager, _) {
            $scope.$emit('change_title', {
                title: 'Все посылки | ' + _('app_name')
            });
            console.log('Отправки задач');
        }
    ])
;