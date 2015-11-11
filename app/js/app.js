'use strict';

angular.module('Qemy', [
    'ng',
    'ngRoute',
    'ui.router',
    'ngSanitize',
    'ngMaterial',
    'ngAnimate',
    'ngAria',
    'ngMessages',

    'Qemy.directives',

    'Qemy.ui.contests',
    'Qemy.ui.auth',

    'Qemy.controllers',
    'Qemy.controllers.auth',

    'Qemy.services'
])
    .config(['$locationProvider', 'StorageProvider', '$stateProvider', '$urlRouterProvider', '$mdThemingProvider',
        function($locationProvider, StorageProvider, $stateProvider, $urlRouterProvider, $mdThemingProvider) {
            if (Config.Modes.test) {
                StorageProvider.setPrefix('t_');
            }
            $mdThemingProvider.theme('default')
                .primaryPalette('blue')
                .accentPalette('teal');

            $locationProvider.hashPrefix('!');
            $locationProvider.html5Mode(true);

            $urlRouterProvider
                .otherwise('/');

            $stateProvider
                .state('index', {
                    url: '/',
                    templateUrl: templateUrl('index', 'index'),
                    controller: 'IndexCtrl'
                })
        }
    ]);