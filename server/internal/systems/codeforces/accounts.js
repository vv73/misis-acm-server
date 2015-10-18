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

var ACCOUNT_TIMEOUT = 10 * 1000; // ms

var ACM_BASE_URI = 'http://codeforces.com';
var QUEUE_LENGTH_LIMIT = 2000;

module.exports = {
    init: Init,
    getIdle: GetIdle,
    refreshAccount: RefreshAccount
};

function Init(accounts, callback) {
    system_accounts = accounts;

    async.each(system_accounts, function(account, callback) {
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
        callback(null);
    });
}

function RefreshAccount(neededAccount, callback) {
    console.log('Refreshing account:', neededAccount.login);
    var loginUrl = ACM_BASE_URI,
        data = {
            action: 'enter',
            handle: neededAccount.login,
            password: neededAccount.password,
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
            neededAccount.rest = {
                csrf_token: csrf_token,
                cookieJar: cookieJar
            };
            console.log('Account was refreshed:', neededAccount.login);
            callback(null, neededAccount);
        });
    });
}

function GetIdle(callback) {
    if (processing_accounts.length >= system_accounts.length) {
        if (async_queue.length > QUEUE_LENGTH_LIMIT) {
            return callback(new Error('Queue length limit has exceeded.'));
        }
        console.log('Async queue: added element');
        async_queue.push({
            callback: callback,
            queueBeginTime: new Date().getTime()
        });
        console.log('Async queue length: ' + async_queue.length);
    } else {
        var found = false;
        system_accounts.forEach(function (account) {
            if (found) {
                return;
            }
            var busy = processing_accounts.some(function (processing) {
                return processing.account.login === account.login;
            });
            if (!busy) {
                var processing_account = {
                    beginTime: new Date().getTime(),
                    account: account
                };
                processing_accounts.push(processing_account);
                console.log('Added processing account', processing_account.account.login);
                found = true;

                var onAccountFinished = function (releasedAccount) {
                    var finishTime = new Date().getTime(),
                        elapsed = finishTime - releasedAccount.beginTime;

                    console.log('onAccountFinished', releasedAccount.account.login);

                    var releaseAccount = function (releasedAccount) {
                        console.log('Account returned into pool', releasedAccount.account.login);
                        var operationIndex = 0;
                        for (var i = 0; i < processing_accounts.length; ++i) {
                            if (processing_accounts[i].account.login === releasedAccount.account) {
                                operationIndex = i;
                                break;
                            }
                        }
                        processing_accounts.splice(operationIndex, 1);
                        async.nextTick(function () {
                            if (async_queue.length) {
                                GetIdle(async_queue.pop().callback);
                                console.log('Async queue length: ' + async_queue.length);
                            }
                        });
                    };

                    if (elapsed < ACCOUNT_TIMEOUT) {
                        var timeout = setTimeout(function () {
                            releaseAccount(releasedAccount);
                        }, ACCOUNT_TIMEOUT - elapsed);
                    } else {
                        releaseAccount(releasedAccount);
                    }

                }.bind(this, processing_account);
                callback(null, account, onAccountFinished);
            }
        });

        if (!found) {
            callback(new Error('Some error with accounts queue'));
        }
    }
}