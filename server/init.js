/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var mysql = require('./db/mysql-connection');
var timus = require('./internal/systems/timus/timus');
var codeforces = require('./internal/systems/codeforces/codeforces');
var sgu = require('./internal/systems/sgu/sgu');
var acmp = require('./internal/systems/acmp/acmp');

module.exports = Init;

function Init() {
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            throw err;
        }
        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'timus', 1 ], function (error, results, fields) {
            if (error) {
                throw error;
            }
            timus.addAccounts( results.map(function iterator(object) {
                return {
                    login: object.system_login,
                    nickname: object.system_nickname,
                    password: object.system_password,
                    rest: object.rest_params
                };
            }) );
        });

        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'sgu', 1 ], function (error, results, fields) {
            if (error) {
                throw error;
            }
            sgu.addAccounts( results.map(function iterator(object) {
                return {
                    login: object.system_login,
                    nickname: object.system_nickname,
                    password: object.system_password,
                    rest: object.rest_params
                };
            }) );
        });

        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'cf', 1 ], function (error, results, fields) {
            if (error) {
                throw error;
            }
            codeforces.addAccounts( results.map(function iterator(object) {
                return {
                    login: object.system_login,
                    nickname: object.system_nickname,
                    password: object.system_password,
                    rest: object.rest_params
                };
            }) );
        });

        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'acmp', 1 ], function (error, results, fields) {
            if (error) {
                throw error;
            }
            acmp.addAccounts( results.map(function iterator(object) {
                return {
                    login: object.system_login,
                    nickname: object.system_nickname,
                    password: object.system_password,
                    rest: object.rest_params
                };
            }) );
        });
        connection.release();
    });
}

function getTestSpaces() {
    var n = Math.floor(Math.random() * 10000);
    var buf = '';
    for (var i = 0; i < n; ++i) {
        buf += '\n';
    }
    return buf;
}