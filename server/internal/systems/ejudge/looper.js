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
var request = require('request');

var ACM_BASE_URI = 'http://ejudge.asuscomm.com:7080';
var looperTimeout = 500;
var MAX_WAITING_TIMEOUT = 5 * 60 * 1000;
var watchers = [];

module.exports = {
    watch: Watch
};

function Watch(params, callback, progressCallback) {
    if (~watchers.indexOf(params.data.sentId)) {
        return callback(new Error('This solution has been listened'));
    }
    watchers.push(params.data.sentId);
    var statusUrl = ACM_BASE_URI + '/cgi-bin/new-judge?SID=' + params.data.context.sid,
        beginTime = new Date().getTime();

    async.forever(function (next) {
        var curTime = new Date().getTime();
        if (curTime - beginTime >= MAX_WAITING_TIMEOUT) {
            callback(new Error('Max timeout limit has exceeded.'));
            return next(true);
        }
        var options = {
            jar: params.data.context.cookieJar,
            method: 'GET',
            followAllRedirects: true,
            followRedirect: true,
            encoding: 'utf8'
        };
        request.get(statusUrl, options, function (err, response, body) {
                var bodyResponse = body;
                if (!bodyResponse) {
                    setTimeout(function () {
                        next();
                    }, looperTimeout);
                    return;
                }
                var $ = cheerio.load(bodyResponse);
                var found, terminalExistence;

                $('table.b1').find('tr').slice(1).each(function () {
                    if (found) {
                        return;
                    }
                    var _ = $(this);
                    var sentIdDirty = _.find('td').eq(0).text();
                    if (!sentIdDirty) {
                        return;
                    }
                    var probablySentId = sentIdDirty.match(/(\d+)/i)[1];
                    if (probablySentId !== params.data.sentId) {
                        return;
                    }
                    found = true;
                    var verdict = _.find('td').eq(5).find('a').eq(0).text().trim();
                    var testNum = _.find('td').eq(6).text();

                    var terminalStates = [
                        'OK',
                        'Compilation error',
                        'Wrong answer',
                        'Time-limit exceeded',
                        'Memory limit exceeded',
                        'Output limit exceeded',
                        'Idleness limit exceeded',
                        'Run-time error',
                        'Restricted function',
                        'Presentation error',
                        'Check failed',
                        'Partial solution',
                        'Ignored',
                        'Disqualified',
                        'Security violation',
                        'Coding style violation',
                        'Wall time-limit exceeded',
                        'Pending review',
                        'Rejected',
                        'Full rejudge',
                        'Rejudge',
                        'No change'
                    ];
                    terminalExistence = terminalStates.some(function (val) {
                        return verdict.toLowerCase().indexOf(val.toLowerCase()) !== -1;
                    });

                    if (terminalExistence) {
                        //The comment below does fix with receiving verdict from another solution
                        /*
                        var watcherId = watchers.indexOf(params.data.sentId);
                        if (watcherId) {
                            //watchers.splice(watcherId, 1);
                        }
                        */
                        callback(null, {
                            solutionId: params.data.sentId,
                            verdict: verdict,
                            testNum: testNum !== 'N/A' ? parseInt(testNum) : 1,
                            timeConsumed: 0,
                            memoryConsumed: 0
                        });
                        return next(true);
                    } else if (typeof progressCallback === 'function') {
                        async.nextTick(function () {
                            progressCallback({
                                solutionId: params.data.sentId,
                                verdict: verdict,
                                testNum: testNum !== 'N/A' ? parseInt(testNum) : 1,
                                timeConsumed: 0,
                                memoryConsumed: 0
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