/*
 * Acm module
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var async = require('async');
var unirest = require('unirest');
var request = require('request');
var cheerio = require('cheerio');

var system_accounts = [];
var processing_accounts = [];
var async_queue = [];

var ACCOUNT_TIMEOUT = 5 * 1000; // ms

var ACM_BASE_URI = 'http://codeforces.com';
var ENTER_PATH = '/enter';

module.exports = {
    init: Init
};

function Init(accounts, callback) {
    system_accounts = accounts;

    async.each(system_accounts, function(account, callback) {
        console.log('Processing account: ', account);
        var loginUrl = ACM_BASE_URI + ENTER_PATH,
            data = {
                action: 'enter',
                handle: account.login,
                password: account.password,
                csrf_token: null
            };

        var CookieJar = unirest.jar();

        unirest.get(loginUrl)
            .jar(CookieJar)
            .end(function (response) {
                var bodyResponse = response.body;
                if (!bodyResponse) {
                    return callback(new Error('Resource no reached'));
                }
                var $ = cheerio.load(bodyResponse);
                var csrf_token = $('meta[name=X-Csrf-Token]').attr('content');

                if (!csrf_token || typeof csrf_token !== 'string') {
                    return callback(new Error('Codeforces CSRF Token not found'));
                }
                data.csrf_token = csrf_token;
                data.cookies = {
                    JSESSIONID: response.cookies['JSESSIONID'] || '',
                    toString: function () {
                        var buffer = [];
                        for (var el in this) {
                            if (typeof this[el] === 'function' || typeof this[el] === 'object') continue;
                            buffer.push(el + '=' + this[el]);
                        }
                        return buffer.join('; ');
                    }
                };

                setTimeout(function () {
                    Auth(loginUrl, data, function (err, authedRestParams) {
                        if (err) {
                            return callback(new Error('Authorization was not successful.'));
                        }
                        account.rest = authedRestParams;
                    });
                }, 1000);
            });
    }, function(err){
        if (err) {
            return callback(err);
        }
        console.log('All Codeforces accounts have been processed successfully');
        callback(null);
    });
}

function Auth(loginUrl, data, callback) {
    var dataObj = {
        action: data.action,
        handle: data.handle,
        password: data.password,
        csrf_token: data.csrf_token
    };

    var contentLength = JSON.stringify(dataObj).length;

    var options = {
        form: dataObj,
        headers: {
            Host: 'codeforces.com',
            Connection: 'keep-alive',
            //'Content-Length': contentLength,
            Origin: 'chrome-extension://hgmloofddffdnphfgcellkdfbfbjeloo',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 YaBrowser/15.9.2403.3043 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; utf-8',
            Accept: '*/*',
            'accept-charset': 'utf-8',
            encoding: null,
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'ru,en;q=0.8',
            Cookie: 'JSESSIONID=' + data.cookies.JSESSIONID
        }
    };

    request.post('http://codeforces.com/enter', options, function (err, response, body) {
        console.log('Response has been received.');
        var setCookies = response.headers['set-cookie'][0];
        var newCookie = setCookies.match(/([a-zA-Z0-9_-]+\=[a-zA-Z0-9_-]+)/i)[0];
        var readyCookie = 'lastOnlineTimeUpdaterInvocation=' + new Date().getTime() + '; JSESSIONID=' + data.cookies.JSESSIONID + '; ' + newCookie + '';
        var options = {
            url: 'http://codeforces.com/',
            method: 'GET',
            headers: {
                Cookie: readyCookie
            }
        };
        request.get('http://codeforces.com/', options, function (err, response, r) {
            console.log('Body:', new Buffer(r).toString());
        });
    });

    /*var Request = unirest.post(loginUrl);
    Request
        .jar(data.cookieJar)
        .form({
            action: 'enter',
            handle: data.login,
            password: data.password,
            csrf_token: data.csrf_token
        })
        .end(function (response) {
            var bodyResponse = response.body;
            if (!bodyResponse) {
                return callback(new Error('Resource no reached'));
            }
            if (response.statusCode !== 200) {
                return callback(new Error('Auth failed'));
            }
            var $ = cheerio.load(bodyResponse);
            var found = false;

            //console.log(bodyResponse);

            $('.lang-chooser a').each(function () {
                if (found) {
                    return;
                }
                var _ = $(this),
                    href = _.attr('href');
                console.log(href);
                if (href.indexOf('/profile/' + data.login) !== -1) {
                    found = true;
                    console.log('Successfully authed in codeforces:', data.login);
                    var csrf_token = $('meta[name=X-Csrf-Token]').attr('content');
                    return callback(null, {
                        csrf_token: csrf_token || data.csrf_token,
                        cookieJar: data.cookieJar
                    })
                }
            });

            if (!found) {
                return callback(new Error('Incorrect login or password.'));
            }
        });*/
}