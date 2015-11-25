/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 07.11.2015
 */

'use strict';

angular.module('Qemy.ui.contest-item', [
    'ui.router',
    'Qemy.controllers.contest-item',
    'Qemy.services.contest-item',
    'Qemy.directives.contest-item'
])
    .config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {

            $stateProvider
                .state('contest', {
                    url: '/contest/{contestId:[0-9]+}',
                    template: '<ui-view/>',
                    abstract: true,
                    controller: 'ContestItemBaseController'
                })
                .state('contest.item', {
                    url: '',
                    templateUrl: templateUrl('contest-item', 'contest-info'),
                    controller: 'ContestItemController'
                })
                .state('contest.monitor', {
                    url: '/monitor',
                    templateUrl: templateUrl('contest-item', 'contest-monitor'),
                    controller: 'ContestItemMonitorController'
                })
                .state('contest.conditions', {
                    url: '/conditions',
                    templateUrl: templateUrl('contest-item', 'contest-conditions'),
                    controller: 'ContestItemConditionsController'
                })
                .state('contest.conditions-item', {
                    url: '/conditions/{problemIndex:[a-zA-Z]+}',
                    templateUrl: templateUrl('contest-item', 'contest-conditions-item'),
                    controller: 'ConditionsItemController'
                })
                .state('contest.send', {
                    url: '/send',
                    templateUrl: templateUrl('contest-item', 'contest-send'),
                    controller: 'ContestItemSendController'
                })
                .state('contest.status', {
                    url: '/status',
                    templateUrl: templateUrl('contest-item', 'contest-status'),
                    controller: 'ContestItemStatusController'
                })
                .state('contest.status-pagination', {
                    url: '/status/page/:pageNumber',
                    templateUrl: templateUrl('contest-item', 'contest-status'),
                    controller: 'ContestItemStatusController'
                })
        }
    ]);