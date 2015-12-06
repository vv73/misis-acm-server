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
                .state('admin.create-contest', {
                    url: '/contests/create',
                    templateUrl: templateUrl('admin', 'admin-create-contest'),
                    controller: 'AdminCreateContestController'
                })
                .state('admin.users-list', {
                    url: '/users',
                    templateUrl: templateUrl('admin', 'admin-users-list'),
                    controller: 'AdminUsersListController'
                })
                .state('admin.users-pagination', {
                    url: '/users/page/:pageNumber',
                    templateUrl: templateUrl('admin', 'admin-users-list'),
                    controller: 'AdminUsersListController'
                })
                .state('admin.create-user', {
                    url: '/users/create',
                    templateUrl: templateUrl('admin', 'admin-users-create'),
                    controller: 'AdminCreateUserController'
                })
                .state('admin.problems', {
                    url: '/problems',
                    templateUrl: templateUrl('admin', 'admin-problems'),
                    controller: 'AdminProblemsController'
                })
                .state('admin.edit-user', {
                    url: '/users/edit/:userId',
                    templateUrl: templateUrl('admin', 'admin-users-edit'),
                    controller: 'AdminEditUserController'
                })
        }
    ]);