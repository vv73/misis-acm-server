/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.auth', [
    'Qemy.i18n'
])
    .controller('AuthFormController', ['$scope', '_', function($scope, _) {
        $scope.form = {};

        $scope.submitForm = function () {
            console.log($scope.form);
        };
    }])
;