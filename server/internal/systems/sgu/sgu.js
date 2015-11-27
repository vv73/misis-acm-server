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
var unirest = require('unirest');
var cheerio = require('cheerio');
var url = require('url');
var async = require('async');

var system_accounts = [];

var ACM_BASE_URI = 'http://acm.sgu.ru';

module.exports = {
    addAccounts : AddAcmAccounts,
    getAccounts : GetAcmAccounts,
    send: SendSolution
};


function AddAcmAccounts(accounts) {
    if (!Array.isArray(accounts) || !accounts.length) {
        return;
    }

    system_accounts = accounts;
    accounts_manager.init(system_accounts);
}


function GetAcmAccounts() {
    return system_accounts;
}


function SendSolution(solution, callback, progressCallback) {
    if (!solution) {
        return callback(new Error('Solution must be an object'));
    }
    accounts_manager.getIdle(function (err, acmAccount, onAccountFinished) {
        if (err) {
            return callback(err);
        }
        TrySend(solution, acmAccount, function (err) {
            if (err) {
                onAccountFinished();
                return callback(err);
            }
            looper.watch({
                acmAccount: acmAccount,
                solution: solution
            }, function (err, verdict) {
                onAccountFinished();
                if (err) {
                    return callback(err);
                }
                callback(null, verdict);
            }, progressCallback);
        });
    });
}

function TrySend(solution, account, callback) {
    if (!solution || !account) {
        return callback(new TypeError('Arguments shouldn\'t be empty objects.'));
    }
    var submitUrl = ACM_BASE_URI + '/sendfile.php?contest=0',
        body = {
            id: account.login,
            pass: account.password,
            problem: solution.task_num,
            elang: solution.language,
            source: solution.source
        };

    unirest.post(submitUrl)
        .send(body)
        .end(function (response) {
            var bodyResponse = response.body;
            if (!bodyResponse) {
                return callback(new Error('Resource no reached'));
            } else if (response.statusCode !== 200) {
                return callback(new Error('Wrong status code.'));
            }
            callback(null);
        });
}