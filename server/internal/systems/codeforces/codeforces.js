/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var accounts_manager = require('./accounts');

var system_accounts = [];
var isInitialize = false;
var initQueue = [];

var ACM_BASE_URI = 'http://codeforces.com';

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
            return console.log('Error in Codeforces auth', err);
        }
        isInitialize = true;
        flushQueue();
    });
}


function GetAcmAccounts() {
    return system_accounts;
}


function SendSolution(solution, callback) {
    if (!isInitialize) {
        return initQueue.push([
            solution, callback
        ]);
    }
    //todo...
}


function flushQueue() {
    console.log('Codeforces queue flushing...');
    while (initQueue.length) {
        SendSolution.apply(this, initQueue.pop());
    }
}