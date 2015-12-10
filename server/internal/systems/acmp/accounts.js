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
var querystring = require('querystring');
var url = require('url');

var system_accounts = [];
var processing_accounts = [];
var async_queue = [];

var initedAccounts = 0;

var ACCOUNT_TIMEOUT = 10 * 1000; // ms

var ACM_BASE_URI = 'http://acmp.ru';
var QUEUE_LENGTH_LIMIT = 2000;

module.exports = {
    init: Init,
    getIdle: GetIdle,
    refreshAccount: RefreshAccount
};

function Init(accounts, callback) {
    system_accounts = accounts;

    async.each(system_accounts, function(account, callback) {
        var loginUrl = ACM_BASE_URI + '/index.asp?main=enter&r=' + Math.floor(Math.random() * 1000000000),
            data = {
                lgn: account.login,
                password: account.password
            };

        var cookieJar = request.jar();

        request.post({url: loginUrl, jar: cookieJar, form: data, followRedirect: true}, function (err, response, body) {
            if (!body || err) {
                return callback(new Error('Resource no reached.'));
            } else if (response.statusCode !== 302 && response.statusCode !== 200) {
                return callback(new Error('Wrong status code: ' + response.statusCode));
            }
            request.post({url: ACM_BASE_URI, jar: cookieJar, followRedirect: true}, function (err, response, body) {
                if (!body || err) {
                    return callback(new Error('Resource no reached.'));
                } else if (response.statusCode !== 302 && response.statusCode !== 200) {
                    return callback(new Error('Wrong status code: ' + response.statusCode));
                }

                var $ = cheerio.load(body);
                var curjQueryObj = $('.menu_title'),
                    accountId = 1;
                if (curjQueryObj.length) {
                    curjQueryObj = curjQueryObj.eq(0).parent().parent();
                    if (curjQueryObj.length) {
                        var links = curjQueryObj.find('a'),
                            curHref;
                        for (var i = 0; i < links.length; ++i) {
                            curHref = links.eq(i).attr('href');
                            if (!/main\=user\&id\=(\d+)/i.test(curHref)) {
                                continue;
                            }
                            accountId = curHref.match(/main\=user\&id\=(\d+)/i)[1];
                            initedAccounts++;
                            break;
                        }
                    }
                }
                account.id = accountId;
                account.rest = {
                    cookieJar: cookieJar
                };
                callback();
            });
        });
    }, function(err) {
        if (err) {
            return callback(err);
        }
        console.log('All ACMP.ru accounts have been processed successfully');
        callback(null);
    });
}

function RefreshAccount(neededAccount, callback) {
    console.log('Refreshing account:', neededAccount.login);
    var loginUrl = ACM_BASE_URI + '/index.asp?main=enter&r=' + Math.floor(Math.random() * 1000000000),
        data = {
            lgn: neededAccount.login,
            password: neededAccount.password
        };

    var cookieJar = request.jar();

    request.post({url: loginUrl, jar: cookieJar, form: data, followRedirect: true}, function (err, response, body) {
        if (!body || err) {
            return callback(new Error('Resource no reached.'));
        } else if (response.statusCode !== 302) {
            return callback(new Error('Wrong status code: ' + response.statusCode));
        }
        request.post({url: ACM_BASE_URI, jar: cookieJar, followRedirect: true}, function (err, response, body) {
            if (!body || err) {
                return callback(new Error('Resource no reached.'));
            } else if (response.statusCode !== 200) {
                return callback(new Error('Wrong status code: ' + response.statusCode));
            }

            var $ = cheerio.load(body);
            var curjQueryObj = $('.menu_title'),
                accountId = false;
            if (curjQueryObj.length) {
                curjQueryObj = curjQueryObj.eq(0).parent().parent();
                if (curjQueryObj.length) {
                    var links = curjQueryObj.find('a'),
                        curHref;
                    for (var i = 0; i < links.length; ++i) {
                        curHref = links.eq(i).attr('href');
                        if (!/main\=user\&id\=(\d+)/i.test(curHref)) {
                            continue;
                        }
                        accountId = curHref.match(/main\=user\&id\=(\d+)/i)[1];
                        break;
                    }
                }
            }
            if (!accountId) {
                return callback(new Error('Account id not found'));
            }
            neededAccount.id = accountId;
            neededAccount.rest = {
                cookieJar: cookieJar
            };
            callback();
        });
    });
}

function GetIdle(callback) {
    if (!initedAccounts) {
        return callback(new Error('No ready accounts'));
    }
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
                                GetIdle(async_queue.shift().callback);
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

function extractParam(str, key) {
    if (typeof str !== 'string' || typeof key !== 'string') {
        return null;
    }
    return querystring.parse(url.parse(str).query)[ key ];
}