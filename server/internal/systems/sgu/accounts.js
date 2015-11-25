/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var async = require('async');

var system_accounts = [];
var processing_accounts = [];
var async_queue = [];

var ACCOUNT_TIMEOUT = 30 * 1000; // ms
var QUEUE_LENGTH_LIMIT = 2000;

module.exports = {
    init: Init,
    getIdle: GetIdle
};

function Init(accounts) {
    system_accounts = accounts;
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
            callback(new Error('Some error with accounts\' queue.'));
        }
    }
}