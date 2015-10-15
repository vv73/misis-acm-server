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
var querystring = require('querystring');
var url = require('url');
var async = require('async');

var system_accounts = [];

var ACM_BASE_URI = 'http://acm.timus.ru';

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


function SendSolution(solution, callback) {
    if (!solution) {
        return callback(new Error('Solution must be an object'));
    }
    accounts_manager.getIdle(function (err, acmAccount, onAccountFinished) {
        if (err) {
            return callback(err);
        }
        SendAndGetExternalAcmSolutionId(solution, acmAccount, function (err, externalId) {
            onAccountFinished();
            if (err) {
                return callback(err);
            }
            looper.watch({
                acmAccount: acmAccount,
                solution: solution,
                externalId: externalId
            }, function (err, verdict) {
                if (err) {
                    return callback(err);
                }
                callback(null, verdict);
            });
        });
    });
}

function extractParam(str, key) {
    if (typeof str !== 'string' || typeof key !== 'string') {
        return null;
    }
    return querystring.parse(url.parse(str).query)[ key ];
}

function SendAndGetExternalAcmSolutionId(solution, account, callback, numOfTry) {
    if (!solution || !account) {
        return callback(new TypeError('Arguments shouldn\'t be empty objects.'));
    }
    var submitUrl = ACM_BASE_URI + '/submit.aspx?space=1',
        body = {
            'Action': 'submit',
            'SpaceID': '1',
            'Language': solution.language,
            'JudgeID': account.login,
            'ProblemNum': solution.task_num,
            'Source': solution.source
        };

    unirest.post(submitUrl)
        .send(body)
        .end(function (response) {
            var bodyResponse = response.body;
            if (!bodyResponse) {
                return callback(new Error('Resource no reached'));
            }
            var $ = cheerio.load(bodyResponse);
            var found = false;

            $('table.status').find('tr').slice(1).each(function () {
                if (found) {
                    return;
                }
                var _ = $(this);
                var lAccountId = extractParam(_.find('.coder a').attr('href'), 'id'),
                    lNickname = _.find('.coder a').text(),
                    lProblem = extractParam(_.find('.problem a').attr('href'), 'num'),
                    lSolutionId = _.find('.id').text();

                if (account.id) {
                    if (lAccountId != account.id || lProblem != solution.task_num) {
                        return;
                    }
                } else if (lNickname != account.nickname || lProblem != solution.task_num) {
                    return;
                } else if (lAccountId) {
                    account.id = parseInt(lAccountId, 10);
                }

                found = true;
                callback(null, parseInt(lSolutionId, 10));
            });

            if (!found) {
                if (numOfTry && numOfTry > 5) {
                    return callback(new Error('Table no contains the row'));
                }
                setTimeout(function () {
                    console.log('Try one more time. Times: ' + numOfTry || 0);
                    numOfTry = numOfTry || 1;
                    SendAndGetExternalAcmSolutionId(solution, account, callback, ++numOfTry);
                }, 1000);
            }
        });
}