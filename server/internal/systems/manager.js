/*
 * Acm testing system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var timus = require('./timus/timus');
var codeforces = require('./codeforces/codeforces');

module.exports = {
    send: SendSolution
};

var timeoutAttempts = 1000; // ms

function SendSolution(system_type, solution, callback) {
    if (typeof system_type !== 'string') {
        return callback(new Error('System type should be a string.'));
    }
    var differentHandlers = {
        'timus': SendToTimus,
        'cf': SendToCodeforces
    };
    if (system_type in differentHandlers) {
        differentHandlers[system_type](system_type, solution, callback);
    } else {
        return callback(new Error('The type of system does not exist.'));
    }
}

function SendToTimus(system_type, solution, callback) {
    var numOfTries = 1;

    var internalCallback = function (err, verdict) {
        if (err) {
            if (numOfTries > 5) {
                console.log('Reached maximum number of attempts to send solution.', solution);
                return callback(new Error('Reached maximum number of attempts to send solution.'));
            }
            console.log('[' + system_type + '] Try to send the solution one more time: ', numOfTries);
            setTimeout(function () {
                numOfTries++;
                timus.send(solution, internalCallback);
            }, timeoutAttempts);
            return console.log(err);
        }
        callback(null, verdict);
    };

    timus.send(solution, internalCallback);
}

function SendToCodeforces(system_type, solution, callback) {
    var numOfTries = 1;

    var internalCallback = function (err, verdict) {
        if (err) {
            if (numOfTries > 5) {
                console.log('Reached maximum number of attempts to send solution.', solution);
                return callback(new Error('Reached maximum number of attempts to send solution.'));
            }
            console.log('[' + system_type + '] Try to send the solution one more time: ', numOfTries);
            setTimeout(function () {
                numOfTries++;
                codeforces.send(solution, internalCallback);
            }, timeoutAttempts);
            return console.log(err);
        }
        callback(null, verdict);
    };

    codeforces.send(solution, internalCallback);
}