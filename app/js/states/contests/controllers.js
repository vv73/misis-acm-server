/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 09.11.2015
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.contests', [])

    .controller('ContestsListCtrl', ['$scope', '$rootScope', '$state', function ($scope, $rootScope, $state) {
        $scope.pageNumber = $state.params.pageNumber || 1;
        $scope.category = 'all';
        $scope.sort = 'byId';
        $scope.sort_order = 'desc';

        $scope.all_items_count = 0;

        var defaultCount = 20,
            itemsOffset = ($scope.pageNumber - 1) * defaultCount;

        function generatePaginationArray() {
            var pages = [];

        }

        $scope.contestsList = [];

    }]);