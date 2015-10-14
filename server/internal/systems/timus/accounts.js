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

module.exports = {
    init: Init,
    getIdle: GetIdle
};

function Init(accounts) {
    system_accounts = accounts;
}

function GetIdle(callback) {
    if (processing_accounts.length >= system_accounts.length) {
        async_queue.push({
            callback: callback,
            queuePutTime: new Date().getTime()
        });
    } else {
        var inactiveAccounts = [];

        //todo: implement the queue
        callback(null, system_accounts[0]);
    }
}