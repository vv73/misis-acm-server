/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 07.11.2015
 */

'use strict';

angular.module('Qemy.ui.contests', [
    'ui.router'
])
    .config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {

            $stateProvider
                .state('contests', {
                    url: '/contests',
                    template: 'New layer:' +
                    '<br>' +
                    '<a ui-sref="contests.list">Next</a> <div ui-view></div>',
                    abstract: true
                })
                .state('contests.list', {
                    url: '',
                    template: '<br>' +
                    '<a ui-sref="contests.smth">Next</a> <div ui-view></div>'
                })
                .state('contests.smth', {
                    url: '/test',
                    template: '<br>' +
                    '<a ui-sref="contests.list">Back</a> <div ui-view></div>'
                })
        }
    ]);