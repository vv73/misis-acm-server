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

var ACM_BASE_URI = 'http://acm.timus.ru';
var looperTimeout = 500;
var MAX_WAITING_TIMEOUT = 2 * 60 * 1000;

module.exports = {
    watch: Watch
};

function Watch(params, callback, progressCallback) {
    var authorStatusUrl = ACM_BASE_URI + '/status.aspx?author=' + params.acmAccount.id,
        beginTime = new Date().getTime();

    async.forever(function (next) {
        var curTime = new Date().getTime();
        if (curTime - beginTime >= MAX_WAITING_TIMEOUT) {
            callback(new Error('Max timeout limit has exceeded.'));
            return next(true);
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

                $('table.status').find('tr').slice(1).each(function () {
                    if (found) {
                        return;
                    }
                    var _ = $(this);
                    var lSolutionId = parseInt(_.find('.id').text(), 10),
                        verdict = _.find('.verdict_wt, .verdict_ac, .verdict_rj').text(),
                        testNum = _.find('.test').text(),
                        timeConsumed = _.find('.runtime').text() || 0,
                        memoryConsumed = _.find('.memory').text().replace(/[^0-9]/gi, '') || 0;

                    if (lSolutionId !== params.externalId || typeof verdict !== 'string') {
                        return;
                    }
                    found = true;
                    verdict = verdict.trim();
                    testNum = testNum ? parseInt(testNum, 10) : 0;
                    timeConsumed = parseFloat(timeConsumed);
                    memoryConsumed = parseInt(memoryConsumed);

                    var terminalStates = [
                        'Accepted',
                        'Compilation error',
                        'Wrong answer',
                        'Time limit exceeded',
                        'Memory limit exceeded',
                        'Output limit exceeded',
                        'Idleness limit exceeded',
                        'Runtime error',
                        'Restricted function'
                    ];
                    terminalExistence = terminalStates.some(function (val) {
                        return verdict.toLowerCase().indexOf(val.toLowerCase()) !== -1;
                    });
                    verdict = verdict.replace(/(\s\(.*\))$/i, '');

                    if (terminalExistence) {
                        callback(null, {
                            solutionId: lSolutionId,
                            verdict: verdict,
                            testNum: testNum,
                            timeConsumed: timeConsumed,
                            memoryConsumed: memoryConsumed
                        });
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