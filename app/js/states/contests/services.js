/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

"use strict";

angular.module('Qemy.services.contests', [
    'Qemy.i18n'
])
    .service('ContestsManager', ['$rootScope', 'Storage', '$http', '$timeout', function($rootScope, Storage, $http, $timeout) {

        function getContests(params) {
            return $http({ method: 'get', url: '/api/contests/get', data: params })
                .then(function (data) {
                    return data.data;
                });
        }

        return {
            getContests: getContests
        }
    }])
;