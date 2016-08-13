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
var request = require('request');
var cheerio = require('cheerio');
var querystring = require('querystring');
var url = require('url');
var async = require('async');
var FormData = require('form-data');
var StreamFromString = require('string-to-stream');

var system_accounts = [];

var ACM_DOMAIN = '10.1.88.253';
var ACM_PORT = ''; // ':5046';
var ACM_PROTOCOL = 'http';
var ACM_BASE_URI = ACM_PROTOCOL + '://' + ACM_DOMAIN + ACM_PORT;

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
        SendAndGetContext(solution, acmAccount, function (err, context) {
            if (err) {
                onAccountFinished();
                return callback(err);
            }
            looper.watch({
                acmAccount: acmAccount,
                solution: solution,
                data: context
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

function extractParam(str, key) {
    if (typeof str !== 'string' || typeof key !== 'string') {
        return null;
    }
    return querystring.parse(url.parse(str).query)[ key ];
}

function loginAndGetContext(solution, account, callback) {
    var action_2 = 'Submit';
    var loginUrl = ACM_BASE_URI + '/cgi-bin/new-judge',
        data = {
            login: account.login,
            password: account.password,
            contest_id: solution.contest_id,
            role: account.role,
            locale_id: 0,
            action_2: action_2
        };

    var cookieJar = request.jar();

    var options = {
        jar: cookieJar,
        form: data,
        method: 'POST',
        followAllRedirects: true,
        followRedirect: true,
        encoding: 'utf8'
    };

    request.post(loginUrl, options, function (err, response, body) {
        var bodyResponse = body;
        if (!bodyResponse) {
            return callback(new Error('Resource no reached'));
        }
        var path = response.request && response.request.path;
        console.log('Path:', response.request.path);
        if (!path || !/(sid\=)/i.test(path)) {
            return callback(new Error('Access denied: probably wrong login or password.'))
        }
        var sid = extractParam(path, 'SID');
        callback(null, {
            cookieJar: cookieJar,
            sid: sid
        });
    });
}

function SendAndGetContext(solution, account, callback, numOfTry) {
    if (!solution || !account) {
        return callback(new TypeError('Arguments shouldn\'t be empty objects.'));
    }
    //for (var i = 0; i < 10; ++i)
    loginAndGetContext(solution, account, function (err, context) {
        if (err) {
            return callback(err);
        }
        var cookieSession = context.cookieJar.getCookieString(ACM_BASE_URI);
        var sid = context.sid,
            problem = solution.problem_index,
            lang_id = solution.lang_id,
            solution_text = solution.source,
            action_40 = 'Send!';

        var submitPath = '/cgi-bin/new-judge';

        var form = new FormData();

        form.append('SID', sid);
        form.append('problem', problem);
        form.append('lang_id', lang_id);
        form.append('file', StreamFromString(solution_text), {
            filename: 'source.txt',
            contentType: 'text/plain',
            knownLength: solution_text.length
        });
        form.append('action_40', action_40);

        var formOptions = {
            host: ACM_DOMAIN,
            path: submitPath,
            headers: {
                'Cookie': cookieSession
            },
            followAllRedirects: true,
            followRedirect: true,
            encoding: 'utf8'
        };
        if (ACM_PORT) {
            formOptions.port = ACM_PORT.replace(':', '');
        }
        form.submit(formOptions, function(err, res) {
            if (err) {
                return callback(err);
            }
            //obtaining id of solution
            var sentsUrl = ACM_BASE_URI + '/cgi-bin/new-judge?SID=' + sid;
            var options = {
                jar: context.cookieJar,
                followAllRedirects: true,
                followRedirect: true,
                encoding: 'utf8'
            };

            request.get(sentsUrl, options, function (err, response, body) {
                var bodyResponse = body;
                if (!bodyResponse) {
                    return callback(new Error('Resource no reached'));
                }
                var $ = cheerio.load(bodyResponse);
                var table = $('table.b1');
                if (!table.length) {
                    return callback(new Error('Something went wrong'));
                }
                var found = false,
                    sentId;
                table.find('tr').slice(1).each(function () {
                    if (found) {
                        return;
                    }
                    var _ = $(this);
                    var sentIdDirty = _.find('td').eq(0).text();
                    if (!sentIdDirty) {
                        return;
                    }
                    var probablySentId = Number(sentIdDirty.match(/(\d+)/i)[1]);
                    var username = _.find('td').eq(2).text().trim();
                    if (username.toLowerCase() !== account.login.trim().toLowerCase()) {
                        return;
                    }
                    var problem_symbol = _.find('td').eq(3).text().trim().toLowerCase();
                    if (problem_symbol !== getProblemSymbol(problem - 1)) {
                        return;
                    }
                    sentId = probablySentId;
                    found = true;
                    callback(null, {
                        sentId: sentId,
                        context: context
                    });
                });
            });
        });
    })
}

function getProblemSymbol(index) {
    var generator = createIndexGenerator();
    while (index--) {
        generator();
    }
    return generator();
}

function createIndexGenerator() {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split(''),
        curIndex = -1;
    return function () {
        curIndex++;
        var symbolsNumber = Math.floor(curIndex / alphabet.length) + 1;
        if (symbolsNumber === 1) {
            return alphabet[ curIndex ];
        } else {
            return alphabet[ symbolsNumber - 2 ] + alphabet[ curIndex % alphabet.length ];
        }
    }
}