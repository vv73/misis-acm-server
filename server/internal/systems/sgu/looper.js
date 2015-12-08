/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var async = require('async');
var cheerio = require('cheerio');
var unirest = require('unirest');
var querystring = require('querystring');
var url = require('url');

var ACM_BASE_URI = 'http://acm.sgu.ru';
var looperTimeout = 500;
var MAX_WAITING_TIMEOUT = 2 * 60 * 1000;

module.exports = {
    watch: Watch
};

function Watch(params, callback, progressCallback) {
    var authorStatusUrl = ACM_BASE_URI + '/status.php?id=' + params.acmAccount.login,
        beginTime = new Date().getTime(),
        finish = false;

    async.forever(function (next) {
        var curTime = new Date().getTime();
        if (curTime - beginTime >= MAX_WAITING_TIMEOUT) {
            callback(new Error('Max timeout limit has exceeded.'));
            return next(true);
        } else if (finish) {
            return;
        }
        unirest.get(authorStatusUrl)
            .end(function (response) {
                var bodyResponse = response.body;
                if (!bodyResponse) {
                    setTimeout(function () {
                        next();
                    }, looperTimeout);
                    return;
                }
                var $ = cheerio.load(bodyResponse);
                var found, terminalExistence;

                $('.st1').parent().find('tr').slice(1).each(function () {
                    if (found) {
                        return;
                    }
                    var _ = $(this),
                        tds = _.find('td');

                    var lSolutionId = parseInt(tds.eq(0).text(), 10),
                        verdict = tds.eq(5).text(),
                        testNum = 0,
                        timeConsumed = parseInt(tds.eq(6).text().replace(/[^0-9]/gi, '')),
                        memoryConsumed = parseInt(tds.eq(7).text().replace(/[^0-9]/gi, '')),
                        loginId = extractParam(tds.eq(2).find('a').attr('href'), 'id');

                    if (loginId !== params.acmAccount.login || typeof verdict !== 'string') {
                        return;
                    }
                    found = true;
                    verdict = verdict.trim();
                    timeConsumed /= 1000;

                    if (/on\stest\s(\d+)/i.test(verdict)) {
                        testNum = verdict.match(/on\stest\s(\d+)/i)[1];
                        verdict = verdict.replace(/(\s?on\stest\s?\d+)/i, '');
                    } else if (/Running\:\s(\d+)/i.test(verdict)) {
                        testNum = verdict.match(/Running\:\s(\d+)/i)[1];
                        verdict = verdict.replace(/(\:\s\d+)$/i, '');
                    }
                    testNum = parseInt(testNum);

                    var terminalStates = [
                        'Accepted',
                        'Compilation error',
                        'Wrong answer',
                        'Time limit exceeded',
                        'Memory limit exceeded',
                        'Output limit exceeded',
                        'Idleness limit exceeded',
                        'Runtime error',
                        'Restricted function',
                        'Presentation Error',
                        'Global Error'
                    ];
                    terminalExistence = terminalStates.some(function (val) {
                        return verdict.toLowerCase().indexOf(val.toLowerCase()) !== -1;
                    });

                    if (terminalExistence) {
                        if (!finish) {
                            callback(null, {
                                solutionId: lSolutionId,
                                verdict: verdict,
                                testNum: testNum,
                                timeConsumed: timeConsumed,
                                memoryConsumed: memoryConsumed
                            });
                        }
                        finish = true;
                        return next(true);
                    } else if (typeof progressCallback === 'function') {
                        async.nextTick(function () {
                            progressCallback({
                                solutionId: lSolutionId,
                                verdict: verdict,
                                testNum: testNum,
                                timeConsumed: timeConsumed,
                                memoryConsumed: memoryConsumed
                            });
                        });
                    }
                });

                if (!terminalExistence) {
                    setTimeout(function () {
                        next();
                    }, looperTimeout);
                }
            });
    });
}

function extractParam(str, key) {
    if (typeof str !== 'string' || typeof key !== 'string') {
        return null;
    }
    return querystring.parse(url.parse(str).query)[ key ];
}