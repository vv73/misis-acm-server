/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var restler = require('restler');

var system_accounts = [];
var processing_accounts = [];
var async_queue = [];

var ACCOUNT_TIMEOUT = 5 * 1000; // ms

var ACM_BASE_URI = 'http://codeforces.com';
var ENTER_PATH = '/enter';

module.exports = {
    init: Init
};

function Init(accounts, callback) {
    system_accounts = accounts;

    var test = '\n\n';
    async.each(system_accounts, function(account, callback) {
        console.log('Processing account: ', account);
        var loginUrl = ACM_BASE_URI,
            data = {
                action: 'enter',
                handle: account.login,
                password: account.password,
                csrf_token: null
            };

        var cookieJar = request.jar();

        request.get({url: loginUrl, jar: cookieJar}, function (err, response, body) {
            var bodyResponse = body;
            if (!bodyResponse) {
                return callback(new Error('Resource no reached'));
            }
            var $ = cheerio.load(bodyResponse);
            var csrf_token = $('meta[name=X-Csrf-Token]').attr('content');

            if (!csrf_token || typeof csrf_token !== 'string') {
                return callback(new Error('Codeforces CSRF Token not found'));
            }
            data.csrf_token = csrf_token;

            var options = {
                jar: cookieJar,
                form: data,
                method: 'POST',
                followAllRedirects: true,
                followRedirect: true,
                encoding: 'utf8',
                headers: {
                    Host: 'codeforces.com',
                    Connection: 'keep-alive',
                    Origin: 'http://codeforces.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 YaBrowser/15.9.2403.3043 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded; utf-8',
                    Accept: '*/*',
                    'Accept-Language': 'ru,en;q=0.8'
                }
            };

            request.post(ACM_BASE_URI + '/enter', options, function (err, response, body) {
                if (response.statusCode !== 200 || err || !body) {
                    return callback(new Error('Auth failed'));
                }
                var $ = cheerio.load(body);
                var csrf_token = $('meta[name=X-Csrf-Token]').attr('content');
                account.rest = {
                    csrf_token: csrf_token,
                    cookieJar: cookieJar
                };
                callback();
            });
        });
    }, function(err) {
        if (err) {
            return callback(err);
        }
        console.log('All Codeforces accounts have been processed successfully');
        //console.log(system_accounts);
        callback(null);
    });
}