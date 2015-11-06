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

function GetContests(count, offset, sort, sort_order, callback) {
    if (typeof count === 'function') {
        callback = count;
        count = null;
    } else if (typeof offset === 'function') {
        callback = offset;
        offset = null;
    }  else if (typeof sort === 'function') {
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
        sort = sort || DEFAULT_CONTESTS_SORT;
        sort_order = sort_order || DEFAULT_CONTESTS_SORT_ORDER;

        count = Math.max(Math.min(count, 200), 0);
        offset = Math.max(offset, 0);

        //todo: сделать выборку по начатым контестам, замороженным, а также показать только завершенные и т.д.
        var availableSorts = {
            byId: 'users.id',
            byName: 'display_name',
            byCategory: 'users.access_level',
            byRecent: 'users.recent_action_time'
        };

        var sql = 'SELECT users.*, groups.group_name, CONCAT(users.first_name, ?, users.last_name) AS display_name ' +
            'FROM users ' +
            'LEFT JOIN access_groups AS groups ON users.access_level = groups.access_level ' +
            'WHERE users.access_level IN (?) ' +
            'ORDER BY ?? ' + sort_order.toUpperCase() + ' ' +
            'LIMIT ?, ?; ' +
            'SELECT COUNT(id) AS count ' +
            'FROM users ' +
            'WHERE access_level IN (?)';

        sql = mysql.format(sql, [
            ' ',
            accessCategories[category],
            availableSorts[sort],
            offset,
            count,
            accessCategories[category]
        ]);

        connection.query(sql, function (err, results, fields) {
            if (err || !results || !Array.isArray(results) || !Array.isArray(results[0])) {
                return callback(err);
            }
            var result = {
                users: results[0].map(function (row) {
                    var user = new User();
                    user.setObjectRow(row);
                    return user;
                }),
                all_items_count: results[1][0].count
            };
            callback(null, result);
        })
    }
}
