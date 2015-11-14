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
            ContestsManager.canJoin({ contest_id: contestId })
                .then(function (response) {
                    if (!response || !response.result
                        || !response.result.can || !response.result.joined) {
                        $state.go('index');
                    }
                    console.log('Доступ к контесту разрешен. Идет загрузка данных...');
                    ContestsManager.getContest({ contest_id: contestId })
                        .then(function (response) {
                            if (!response) {
                                $state.go('contests.list');
                            }
                            $scope.contest = response.contest;
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
        }
    ])

    .controller('ContestItemController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_',
        function ($scope, $rootScope, $state, ContestsManager, _) {
            $scope.$emit('change_title', {
                title: 'Информация о контесте | ' + _('app_name')
            });
            console.log('Основной контроллер для контеста. Информация.');
        }
    ])

    .controller('ContestItemMonitorController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_',
        function ($scope, $rootScope, $state, ContestsManager, _) {
            $scope.$emit('change_title', {
                title: 'Таблица результатов | ' + _('app_name')
            });
            console.log('Таблица контеста.');
        }
    ])

    .controller('ContestItemConditionsController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_',
        function ($scope, $rootScope, $state, ContestsManager, _) {
            $scope.$emit('change_title', {
                title: 'Условия | ' + _('app_name')
            });
            console.log('Условия контеста');
        }
    ])

    .controller('ContestItemSendController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_',
        function ($scope, $rootScope, $state, ContestsManager, _) {
            $scope.$emit('change_title', {
                title: 'Отправить решение | ' + _('app_name')
            });
            console.log('Отправка задачи');
        }
    ])

    .controller('ContestItemStatusController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_',
        function ($scope, $rootScope, $state, ContestsManager, _) {
            $scope.$emit('change_title', {
                title: 'Все посылки | ' + _('app_name')
            });
            console.log('Отправки задач');
        }
    ])
;