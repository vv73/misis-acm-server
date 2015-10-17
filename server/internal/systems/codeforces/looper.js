/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var codeforcesApi = require('./api/api');
var async = require('async');
var unirest = require('unirest');

var looperTimeout = 200;
var MAX_WAITING_TIMEOUT = 2 * 60 * 1000;

module.exports = {
    watch: Watch
};

function Watch(params, callback, progressCallback) {
    var beginTime = new Date().getTime(),
        accountHandle = params.acmAccount.login;

    params.acmAccount.lastSentSolutionId = params.acmAccount.lastSentSolutionId || 0;

    async.forever(function (next) {
        var curTime = new Date().getTime();
        if (curTime - beginTime >= MAX_WAITING_TIMEOUT) {
            callback(new Error('Max timeout limit has exceeded.'));
            return next(true);
        }
        codeforcesApi.contest.status({
            contestId: params.solution.contest_id,
            from: 1,
            count: 100
        }, function (err, response) {
            if (err) {
                callback(err);
                return next(true);
            }
            var resultArray = response.result,
                currentSolution,
                found = false;
            for (var solutionIndex in resultArray) {
                if (!resultArray.hasOwnProperty(solutionIndex)) continue;
                if (found) {
                    break;
                }
                currentSolution = resultArray[solutionIndex];
                var author = currentSolution.author;
                if (!author) {
                    continue;
                }
                var solutionMembers = author.members;
                if (!solutionMembers || !Array.isArray(solutionMembers)) {
                    continue;
                }
                for (var memberIndex in solutionMembers) {
                    if (!solutionMembers.hasOwnProperty(memberIndex)) continue;
                    var member = solutionMembers[memberIndex];
                    if (member.handle
                        && member.handle.toLowerCase() === accountHandle.toLowerCase()
                        && params.acmAccount.lastSentSolutionId !== resultArray[solutionIndex].id) {
                        if (currentSolution.verdict
                            && currentSolution.verdict !== 'TESTING') {
                            params.acmAccount.lastSentSolutionId = currentSolution.id;
                            callback(null, {
                                solutionId: currentSolution.id,
                                verdict: currentSolution.verdict,
                                testNum: currentSolution.passedTestCount,
                                timeConsumed: currentSolution.timeConsumedMillis,
                                memoryConsumed: currentSolution.memoryConsumedBytes
                            });
                            return next(true);
                        }
                        if (typeof progressCallback === 'function') {
                            progressCallback({
                                solutionId: currentSolution.id,
                                verdict: currentSolution.verdict,
                                testNum: currentSolution.passedTestCount,
                                timeConsumed: currentSolution.timeConsumedMillis,
                                memoryConsumed: currentSolution.memoryConsumedBytes
                            });
                        }
                        found = true;
                        break;
                    }
                }
            }
            setTimeout(function () {
                next();
            }, looperTimeout);
        });
    });
}