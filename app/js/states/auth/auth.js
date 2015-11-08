/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 07.11.2015
 */

'use strict';

angular.module('Qemy.ui.auth', [
    'ui.router'
])
    .config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {

            $stateProvider
                .state('auth', {
                    url: '/auth',
                    templateUrl: templateUrl('user', 'auth-form'),
                    abstract: true
                })
                .state('auth.form', {
                    url: '',
                    controller: 'AuthFormController'
                })
        }
    ]);