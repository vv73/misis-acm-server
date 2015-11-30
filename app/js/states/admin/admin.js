/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 07.11.2015
 */

'use strict';

angular.module('Qemy.ui.admin', [
    'ui.router',
    'Qemy.controllers.admin',
    'Qemy.services.admin',
    'Qemy.directives.admin',
    'Qemy.filters.admin'
])
    .config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {

            $stateProvider
                .state('admin', {
                    url: '/admin',
                    templateUrl: templateUrl('admin', 'admin-base'),
                    abstract: true,
                    controller: 'AdminBaseController'
                })
                .state('admin.index', {
                    url: '/contests',
                    templateUrl: templateUrl('admin', 'admin-index'),
                    controller: 'AdminIndexController'
                })
                .state('admin.index-pagination', {
                    url: '/contests/page/:pageNumber',
                    templateUrl: templateUrl('admin', 'admin-index'),
                    controller: 'AdminIndexController'
                })
                .state('admin.edit-contest', {
                    url: '/contests/edit/:contestId',
                    templateUrl: templateUrl('admin', 'admin-edit-contest'),
                    controller: 'AdminEditContestController'
                })
        }
    ]);