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
                    controller: 'ContestItemBase'
                })
                .state('contest.item', {
                    url: '',
                    template: '<h3>Contest item</h3>',
                    controller: 'ContestItem'
                })
                .state('contest.monitor', {
                    url: '/monitor',
                    template: '<h3>Contest table</h3>',
                    controller: ['$scope', function ($scope) {
                        console.log('Основной контроллер для таблицы');
                    }]
                })
        }
    ]);