/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var accounts_manager = require('./accounts');
var looper = require('./looper');
var restler = require('restler');
var extend = require('node.extend');
var cheerio = require('cheerio');
var request = require('request');

var system_accounts = [];
var isInitialize = false;
var initQueue = [];

var ACM_BASE_URI = 'http://acmp.ru';

module.exports = {
    addAccounts : AddAcmAccounts,
    getAccounts : GetAcmAccounts,
    send        : SendSolution
};


function AddAcmAccounts(accounts) {
    if (!Array.isArray(accounts) || !accounts.length) {
        return;
    }

    system_accounts = accounts;
    accounts_manager.init(system_accounts, function (err) {
        if (err) {
            return console.log('Error in Acmp auth', err);
        }
        isInitialize = true;
        flushQueue();
    });
}


function GetAcmAccounts() {
    return system_accounts;
}


function SendSolution(solution, callback, progressCallback) {
    if (!isInitialize) {
        var args = Array.prototype.slice.call(arguments);
        return initQueue.push(args);
    }

    accounts_manager.getIdle(function (err, acmAccount, onAccountFinished) {
        if (err) {
            return callback(err);
        }
        console.log('Taken idle account:', acmAccount.login);
        TrySend(solution, acmAccount, function (err, statusCode) {
            if (err) {
                console.log(err);
                accounts_manager.refreshAccount(acmAccount, function (err, refreshedAccount) {
                    onAccountFinished();
                    if (err) {
                        return console.log('Error in refreshing account', err);
                    }
                    console.log('ACMP account has been refreshed');
                });
                return callback(new Error('Wrong status code: ' + statusCode));
            }
            
            looper.watch({
                acmAccount: acmAccount,
                solution: solution
            }, function (err, verdict) {
                onAccountFinished();
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                callback(null, verdict);
            }, progressCallback);
        });
    });
}


function flushQueue() {
    while (initQueue.length) {
        SendSolution.apply(this, initQueue.shift());
    }
}


function TrySend(solution, acmAccount, callback) {
    if (!acmAccount) {
        return callback(new Error('ACMP account not found'));
    }

    request.post({url: ACM_BASE_URI, jar: acmAccount.rest.cookieJar, followRedirect: true}, function (err, response, body) {
        if (!body || err) {
            return callback(new Error('Resource no reached.'));
        } else if (response.statusCode !== 302 && response.statusCode !== 200) {
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
            return callback(new Error('ACM_ACCOUNT_REFRESH_NEEDED'));
        }
        
        var submitUrl = ACM_BASE_URI + '/?main=update&mode=upload&id_task=' + solution.task_num,
            cookieJar = acmAccount.rest.cookieJar;
        var data = {
            lang: solution.language,
            source: solution.source,
            fname: ''
        };
    
        request.post({url: submitUrl, jar: cookieJar, formData: data}, function (err, response, body) {
            if (!body || err) {
                return callback(new Error('Resource no reached'));
            }
            callback(null, response.statusCode);
        });
    });
}