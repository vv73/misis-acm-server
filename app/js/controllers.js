'use strict';

/* Controllers */

angular.module('Qemy.controllers', [
    'Qemy.i18n'
])
    .controller('PageCtrl', ['$scope', '_', function($scope, _) {
        var defaultTitle = _('app_name');
        $scope.$on('change_title', function(e, args) {
            $scope.title = args.title !== undefined && args.title.length ? args.title : defaultTitle;
        });
    }])

    .controller('AppCtrl', ['$scope', function($scope) {
        $scope.isAuth = true;
        $scope.user = {
            first_name: 'Александр',
            last_name: 'Белов'
        }
    }])

    .controller('IndexCtrl', ['$scope', '_', '$state', function($scope, _, $state) {
        $scope.$emit('change_title', {
            title: _('app_name')
        });

        var isAuth = false;
        if (isAuth) {
            $state.go('contests.list');
        } else {
            $state.go('auth.form');
        }
    }])

    .controller('HeaderCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
        //...
        $scope.text = 'header';
    }])

    .controller('WrapperCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
        //...
        $scope.text = 'wrapper';
    }])
;