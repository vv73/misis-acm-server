/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

"use strict";

angular.module('Qemy.services.admin', [
    'Qemy.i18n'
])

    .service('AdminManager', ['$http', function ($http) {

        function dataEncode(data) {
            var paramPairs = [];
            for (var el in data) {
                if (!data.hasOwnProperty(el)) continue;
                paramPairs.push(el + '=' + data[el]);
            }
            return paramPairs.join('&');
        }

        function searchGroups(params) {
            return $http({
                method: 'get',
                url: '/api/admin/searchGroups?' + dataEncode(params)
            }).then(function (data) {
                return data.data;
            });
        }

        function searchProblems(params) {
            return $http({
                method: 'get',
                url: '/api/admin/searchProblems?' + dataEncode(params)
            }).then(function (data) {
                return data.data;
            });
        }

        function createContest(params) {
            return $http({
                method: 'post',
                url: '/api/admin/createContest',
                data: params
            }).then(function (data) {
                return data.data;
            });
        }

        function updateContest(params) {
            return $http({
                method: 'post',
                url: '/api/admin/updateContest',
                data: params
            }).then(function (data) {
                return data.data;
            });
        }

        function deleteContest(params) {
            return $http({
                method: 'post',
                url: '/api/admin/deleteContest',
                data: params
            }).then(function (data) {
                return data.data;
            });
        }

        function repairContest(params) {
            return $http({
                method: 'post',
                url: '/api/admin/repairContest',
                data: params
            }).then(function (data) {
                return data.data;
            });
        }

        function getContestInfo(params) {
            return $http({
                method: 'get',
                url: '/api/admin/getContestInfo?' + dataEncode(params)
            }).then(function (data) {
                return data.data;
            });
        }

        function getUsers(params) {
            return $http({
                method: 'get',
                url: '/api/admin/getUsers?' + dataEncode(params)
            }).then(function (data) {
                return data.data;
            });
        }

        function deleteUser(params) {
            return $http({
                method: 'post',
                url: '/api/admin/deleteUser',
                data: params
            }).then(function (data) {
                return data.data;
            });
        }

        return {
            searchGroups: searchGroups,
            searchProblems: searchProblems,
            createContest: createContest,
            deleteContest: deleteContest,
            repairContest: repairContest,
            getContestInfo: getContestInfo,
            updateContest: updateContest,
            getUsers: getUsers,
            deleteUser: deleteUser
        }
    }])
;