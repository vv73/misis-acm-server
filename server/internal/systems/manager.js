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
var sgu = require('./sgu/sgu');
var acmp = require('./acmp/acmp');

module.exports = {
    send: SendSolution
};

var timeoutAttempts = 1000; // ms

function SendSolution(system_type, solution, callback, progressCallback) {
    if (typeof system_type !== 'string') {
        return callback(new Error('System type should be a string.'));
    }
    var args = Array.prototype.slice.call(arguments);
    var differentHandlers = {
        'timus': SendToTimus,
        'sgu': SendToSgu,
        'cf': SendToCodeforces,
        'acmp': SendToAcmp
    };
    if (system_type in differentHandlers) {
        differentHandlers[system_type].apply(this, args);
    } else {
        return callback(new Error('The type of system does not exist.'));
    }
}

function SendToTimus(system_type, solution, callback, progressCallback) {
    var numOfAttempts = 1;

    var internalCallback = function (err, verdict) {
        if (err) {
            if (numOfAttempts > 2) {
                console.log('Reached maximum number of attempts to send solution.', solution);
                return callback(new Error('Reached maximum number of attempts to send solution.'));
            }
            console.log('[' + system_type + '] Try to send the solution one more time: ', numOfAttempts);
            return setTimeout(function () {
                numOfAttempts++;
                timus.send(solution, internalCallback, progressCallback);
            }, timeoutAttempts);
        }
        callback(null, verdict);
    };

    timus.send(solution, internalCallback, progressCallback);
}


function SendToSgu(system_type, solution, callback, progressCallback) {
    var numOfAttempts = 1;

    var internalCallback = function (err, verdict) {
        if (err) {
            if (numOfAttempts > 2) {
                console.log('Reached maximum number of attempts to send solution.', solution);
                return callback(new Error('Reached maximum number of attempts to send solution.'));
            }
            console.log('[' + system_type + '] Try to send the solution one more time: ', numOfAttempts);
            return setTimeout(function () {
                numOfAttempts++;
                sgu.send(solution, internalCallback, progressCallback);
            }, timeoutAttempts);
        }
        callback(null, verdict);
    };

    sgu.send(solution, internalCallback, progressCallback);
}


function SendToCodeforces(system_type, solution, callback, progressCallback) {
    var numOfAttempts = 1;

    var internalCallback = function (err, verdict) {
        if (err) {
            console.log(err);
            if (numOfAttempts > 2) {
                console.log('Reached maximum number of attempts to send solution.', solution);
                return callback(new Error('Reached maximum number of attempts to send solution.'));
            }
            console.log('[' + system_type + '] Try to send the solution one more time: ', numOfAttempts);
            return setTimeout(function () {
                numOfAttempts++;
                codeforces.send(solution, internalCallback, progressCallback);
            }, timeoutAttempts);
        }
        callback(null, verdict);
    };

    codeforces.send(solution, internalCallback, progressCallback);
}


function SendToAcmp(system_type, solution, callback, progressCallback) {
    var numOfAttempts = 1;

    var internalCallback = function (err, verdict) {
        if (err) {
            console.log(err);
            if (numOfAttempts > 2) {
                console.log('Reached maximum number of attempts to send solution.', solution);
                return callback(new Error('Reached maximum number of attempts to send solution.'));
            }
            console.log('[' + system_type + '] Try to send the solution one more time: ', numOfAttempts);
            return setTimeout(function () {
                numOfAttempts++;
                acmp.send(solution, internalCallback, progressCallback);
            }, timeoutAttempts);
        }
        callback(null, verdict);
    };

    acmp.send(solution, internalCallback, progressCallback);
}