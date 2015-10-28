/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var mysql = require('../../db/mysql-connection');
var User = require('../user/user');
var crypto = require('crypto');

module.exports = {
    create: CreateUser
};


function CreateUser(params, callback) {
    mysql.connection(function (err, connection) {
        if (err) {
            connection.release();
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