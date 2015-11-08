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
        $scope.pageNumber = parseInt($state.params.pageNumber || 1);
        $scope.category = 'all';
        $scope.sort = 'byId';
        $scope.sort_order = 'desc';

        $scope.all_items_count = 0;

        var defaultCount = 20,
            itemsOffset = ($scope.pageNumber - 1) * defaultCount;

        function generatePaginationArray() {
            var pages = [],
                curPage = $scope.pageNumber,
                allItems = $scope.all_items_count,
                backOffsetPages = 5,
                upOffsetPages = 5,
                allPages = Math.floor(allItems / defaultCount) +
                    (allItems && allItems % defaultCount ? 1 : 0);
            for (var cur = Math.max(curPage - backOffsetPages, 1);
                 cur <= Math.min(curPage + upOffsetPages, allPages); ++cur) {
                pages.push({
                    number: cur,
                    active: cur === curPage
                });
            }
            return pages;
        }

        $scope.contestsList = [];
        $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
            $scope.pageNumber = toParams.pageNumber ?
                parseInt(toParams.pageNumber) : 1;
            itemsOffset = ($scope.pageNumber - 1) * defaultCount;
            console.log(itemsOffset);
        });
    }]);