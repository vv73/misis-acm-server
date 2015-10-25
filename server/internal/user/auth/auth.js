/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var User = require('../user');
var crypto = require('crypto');

var AUTH_COOKIE_NAME = 'auth.sid';

module.exports = {
    restore: RestoreUser
};

function RestoreUser(req, res, next) {
    var session = req.session;
    req.session.user_id = 1;
    if (!session || !session.user_id) {
        return RestoreUserByCookie.apply(this, arguments);
    }
    GetUserById(session.user_id, function (err, user) {
        if (err) {
            return next();
        }
        req.currentUser = user;
        next();
    });
}

function RestoreUserByCookie(req, res, next) {
    var cookies = req.cookies;
    if (!(AUTH_COOKIE_NAME in cookies)) {
        return next();
    }
    GetUserByAccessKey(cookies[AUTH_COOKIE_NAME], function (err, user) {
        if (err) {
            console.log(err);
            return next();
        }
        req.currentUser = user;
        req.session.user_id = user.id;
        next();
    });
}

function GetUserByAccessKey(accessKey, callback) {
    var user = new User();
    user.allocateByAccessKey(accessKey, function (err) {
        if (err) {
            return callback(err);
        }
        callback(null, user);
    });
}

function GetUserById(user_id, callback) {
    var user = new User();
    user.allocate(user_id, function (err) {
        if (err) {
            return callback(err);
        }
        callback(null, user);
    });
}