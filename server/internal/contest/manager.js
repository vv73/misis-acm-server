/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 05.11.2015
 */

"use strict";


var mysqlPool   = require('../../db/mysql-connection');
var mysql       = require('mysql');
var User        = require('../user/user');
var Contest     = require('../contest/contest');
var crypto      = require('crypto');
var async       = require('async');


var DEFAULT_CONTESTS_COUNT = 20;
var DEFAULT_CONTESTS_OFFSET = 0;
var DEFAULT_CONTESTS_CATEGORY = 'all';
var DEFAULT_CONTESTS_SORT = 'byId';
var DEFAULT_CONTESTS_SORT_ORDER = 'desc';

module.exports = {
    create: CreateContest,
    getContests: GetContests
};


function CreateContest(params, callback) {
    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db', 1001));
        }
        execute(connection, function (err, result) {
            connection.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });

    function execute(connection, callback) {
        connection.query(
            'INSERT INTO `contests` ' +
            '(name, virtual, start_time, relative_freeze_time, duration_time, user_id, creation_time, allowed_groups) ' +
            'VALUES (?, ?, ?, ?, ?, ?)',
            [ params.name, params.virtual, params.start_time, params.relative_freeze_time,
                params.duration_time, params.user_id, new Date().getTime(), params.allowed_groups ],
            function (err, result) {
                if (err || !result || !result.insertId) {
                    return callback(new Error('An error whith db process', 1001));
                }
                var contest = new Contest();
                contest.allocate(result.insertId, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, contest);
                });
            }
        );
    }
}

function GetContests(count, offset, category, sort, sort_order, callback) {
    if (typeof count === 'function') {
        callback = count;
        count = null;
    } else if (typeof offset === 'function') {
        callback = offset;
        offset = null;
    } else if (typeof category === 'function') {
        callback = category;
        category = null;
    } else if (typeof sort === 'function') {
        callback = sort;
        sort = null;
    } else if (typeof sort_order === 'function') {
        callback = sort_order;
        sort_order = null;
    }

    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db querying', 1001));
        }
        execute(connection, function (err, result) {
            connection.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });

    function execute(connection, callback) {
        count = count || DEFAULT_CONTESTS_COUNT;
        offset = offset || DEFAULT_CONTESTS_OFFSET;
        category = category || DEFAULT_CONTESTS_CATEGORY;
        sort = sort || DEFAULT_CONTESTS_SORT;
        sort_order = sort_order || DEFAULT_CONTESTS_SORT_ORDER;

        count = Math.max(Math.min(count, 200), 0);
        offset = Math.max(offset, 0);

        var categoryPredicate = [
            'all',
            'showOnlyVirtual',
            'showOnlyEnabled',
            'showOnlyDisabled',
            'showOnlyFinished',
            'showOnlyRemoved',
            'showOnlyFrozen',
            'showOnlyStarted'
        ];
        if (categoryPredicate.indexOf(category) === -1) {
            category = DEFAULT_CONTESTS_CATEGORY;
        }

        var availableSorts = {
            byId: 'contests.id',
            byStart: 'contests.start_time',
            byEnd: 'finish_time',
            byCreation: 'contests.creation_time'
        };
        if (!(sort in availableSorts)) {
            sort = DEFAULT_CONTESTS_SORT;
        }

        var readyWhereStatements = {},
            statementExistence = true,
            curDate = new Date();
        switch (category) {
            case 'all':
                readyWhereStatements.all = '';
                statementExistence = false;
                break;
            case 'showOnlyVirtual':
                readyWhereStatements.showOnlyVirtual = 'contests.virtual = 1';
                break;
            case 'showOnlyEnabled':
                readyWhereStatements.showOnlyEnabled = 'contests.enabled = 1';
                break;
            case 'showOnlyDisabled':
                readyWhereStatements.showOnlyDisabled = 'contests.enabled = 0';
                break;
            case 'showOnlyFinished':
                readyWhereStatements.showOnlyFinished = 'contests.start_time + ' +
                    'contests.duration_time < ' + curDate.getTime();
                break;
            case 'showOnlyRemoved':
                readyWhereStatements.showOnlyRemoved = 'contests.removed = 1';
                break;
            case 'showOnlyFrozen':
                readyWhereStatements.showOnlyFrozen = 'contests.start_time + ' +
                    'contests.relative_freeze_time <= ' +
                    curDate.getTime() + ' AND ' + curDate.getTime() +
                    ' <= contests.start_time + contests.duration_time';
                break;
            case 'showOnlyStarted':
                readyWhereStatements.showOnlyStarted = 'contests.start_time <= ' +
                    curDate.getTime() + ' AND ' + curDate.getTime() +
                    ' <= contests.start_time + contests.duration_time';
                break;
        }
        if (category !== 'showOnlyRemoved') {
            for (var statementIndex in readyWhereStatements) {
                readyWhereStatements[statementIndex] += statementExistence ? ' AND ' : '' + 'contests.removed = 0';
            }
        }

        var sql = 'SELECT contests.*, contests.start_time + contests.duration_time AS finish_time ' +
            'FROM contests ' +
            'WHERE ' + readyWhereStatements[category] + ' ' +
            'ORDER BY ?? ' + sort_order.toUpperCase() + ' ' +
            'LIMIT ?, ?; ' +
            'SELECT COUNT(contests.id) AS all_items_count ' +
            'FROM contests ' +
            'WHERE ' + readyWhereStatements[category] + ';';

        sql = mysql.format(sql, [
            availableSorts[sort],
            offset,
            count
        ]);

        connection.query(sql, function (err, results, fields) {
            if (err || !results || !Array.isArray(results) || !Array.isArray(results[0])) {
                return callback(err);
            }
            var contests = results[0].map(function (row) {
                var contest = new Contest();
                contest.setObjectRow(row);
                return contest;
            });
            var authorAllocates = [];
            contests.forEach(function (contest) {
                authorAllocates.push(
                    contest.allocateAuthor.bind(contest),
                    contest.allocateAllowedGroups.bind(contest)
                );
            });
            async.parallel(authorAllocates, function(err, asyncResults) {
                if (err) {
                    return callback(err);
                }
                var result = {
                    contests: contests.map(function (contest) {
                        return contest.getObjectFactory();
                    }),
                    all_items_count: results[1][0].all_items_count
                };
                callback(null, result);
            });
        })
    }
}
