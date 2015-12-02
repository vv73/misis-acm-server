/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var mysqlPool   = require('../../db/mysql-connection');
var mysql       = require('mysql');
var User        = require('../user/user');
var crypto      = require('crypto');


var DEFAULT_USERS_COUNT = 20;
var DEFAULT_USERS_OFFSET = 0;
var DEFAULT_USERS_CATEGORY = 'all';
var DEFAULT_USERS_SORT = 'byRate';
var DEFAULT_USERS_SORT_ORDER = 'desc';

module.exports = {
    create: CreateUser,
    getUsers: GetUsers,
    deleteUser: DeleteUser
};


function CreateUser(params, callback) {
    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error when creating user', 1000));
        }
        var username = params.username;
        var passwordHash = crypto.createHash('md5').update(params.password).digest('hex');
        connection.query(
            'SELECT * FROM users WHERE username = ?', [ username ],
            function (error, results, fields) {
                if (err) {
                    connection.release();
                    return callback(new Error('An error with db process', 1001));
                }
                if (results.length > 0) {
                    connection.release();
                    return callback(new Error('User already exists', 1002));
                }
                connection.query(
                    'INSERT INTO users (username, password, first_name, last_name, access_keys, creation_time) ' +
                    'VALUES (?, ?, ?, ?, ?, ?)',
                    [ params.username, passwordHash, params.first_name, params.last_name, '', new Date().getTime() ],
                    function (err, result) {
                        connection.release();
                        if (err || !result || !result.insertId) {
                            return callback(new Error('An error whith db process', 1001));
                        }
                        var user = new User();
                        user.allocate(result.insertId, function (err) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, user);
                        });
                    }
                );
            }
        );
    });
}

function GetUsers(count, offset, category, sort, sort_order, callback) {
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
        count = count || DEFAULT_USERS_COUNT;
        offset = offset || DEFAULT_USERS_OFFSET;
        category = category || DEFAULT_USERS_CATEGORY;
        sort = sort || DEFAULT_USERS_SORT;
        sort_order = sort_order || DEFAULT_USERS_SORT_ORDER;

        count = Math.max(Math.min(count, 200), 0);
        offset = Math.max(offset, 0);

        var accessCategories = {
            user: [ 1 ],
            admin: [ 5 ],
            all: [
                1, 5
            ]
        };

        var availableSorts = {
            byRate: 'users.solved_count',
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

function DeleteUser(user_id, callback) {
    if (!user_id) {
        return callback(new Error('User id not specified', 1006));
    }

    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error occurred when getting db connection', 0x3e9));
        }
        execute(connection, function (err, result) {
            connection.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        })
    });

    function execute(connection, callback) {
        connection.query('DELETE FROM users WHERE id = ?', [ user_id ], function (err, result) {
            if (err) {
                return callback(err);
            }
            callback(null, { result: true });
        });
    }
}







