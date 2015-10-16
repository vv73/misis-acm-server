/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var accounts_manager = require('./accounts');
var request = require('request');
var restler = require('restler');
var cheerio = require('cheerio');
var cookieParser = require('cookie');

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

    var account = system_accounts[0];

    // ----
    var cookieJar = account.rest.cookieJar;

    var a = cookieJar._jar.store.idx['codeforces.com']['/'];
    var cookieBuf = [];
    for (var el in a) {
        a[el] = a[el] + '';
        if (!a[el] || typeof a[el] !== 'string') continue;
        var partialCookie = a[el].match(/([a-zA-Z0-9_-]+\=[a-zA-Z0-9_\"-]*).*/i)[1];
        cookieBuf.push(partialCookie);
    }
    var csrf_token = account.rest.csrf_token;
    var cookie = cookieBuf.join('; ');

    var data = {
        'csrf_token': csrf_token,
        'action': 'submitSolutionFormSubmitted',
        'submittedProblemCode': solution.problem_code,
        'programTypeId': solution.language,
        'source': solution.source,
        'sourceFile': ''
    };

    restler.post('http://codeforces.com/problemset/submit?csrf_token=' + csrf_token, {
        multipart: true,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*!/!*;q=0.8',
            'Cookie': cookie,
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'ru,en;q=0.8',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Content-Length': JSON.stringify(data).length,
            'Host': 'codeforces.com',
            'Origin': 'http://codeforces.com',
            'Referer': 'http://codeforces.com/problemset/submit',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 YaBrowser/15.9.2403.3043 Safari/537.36'
        },
        data: data
    }).on('complete', function(data, response) {
        //console.log(data, response);
        console.log('Solution was sent.');
    });
}


function flushQueue() {
    console.log('Codeforces queue flushing...');
    while (initQueue.length) {
        SendSolution.apply(this, initQueue.pop());
    }
    console.log('Codeforces queue flushing ended.');
}