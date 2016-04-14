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
var ejudge = require('./internal/systems/ejudge/ejudge');

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

        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'ejudge', 1 ], function (error, results, fields) {
            if (error) {
                throw error;
            }
            ejudge.addAccounts( results.map(function iterator(object) {
                return {
                    login: object.system_login,
                    nickname: object.system_nickname,
                    password: object.system_password,
                    rest: object.rest_params
                };
            }) );

            /*for (var i = 0; i < 1; ++i) {
                ejudge.send({
                    contest_id: 25,
                    problem_index: 1,
                    source: '#include <bits/stdc++.h>\n using namespace std;\n #define fs first\n #define sc second\n #define lb lower_bound\n #define pb push_back\n #define mp make_pair\n #define ll long long\n #define vi vector<int>\n #define vvi vector<vi >\n #define mit map<int, vi>::iterator\n #define sit set<int>::iterator\n #define all(x) x.begin(), x.end()\n ll a, b;\n ll gcd(ll a, ll b) {\n return (b > 0 ? gcd(b, a % b) : a); } ll lcm(ll a, ll b) { return (a / gcd(a, b)) * b; } int main() { ios_base::sync_with_stdio(false); cin >> a >> b; cout << gcd(a, b) << " " << lcm(a, b) << endl; return 0; }',
                    lang_id: 3
                }, function (err, result) {
                    console.log(result);
                }, function (result) {
                    console.log(result);
                });
            }*/

        });

        connection.release();
    });
}