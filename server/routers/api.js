/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

'use strict';

var express = require('express');
var router = express.Router();
var app = express();

var authManager = require('../internal/user/auth/auth');
var contestManager = require('../internal/contest/manager');

router.all('/', function (req, res) {
    res.json({
        'current state': 'API RUNNING'
    });
});

router.all('/auth', function (req, res) {
    res.json({
        'current state': 'AUTH RUNNING'
    });
});

router.post('/auth/signIn', function (req, res) {

    execute({}, function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(data, callback) {
        var bodyRequest = req.body;
        authManager.auth(req, res, bodyRequest.username, bodyRequest.password, function (err, result) {
            if (err || !result) {
                return callback({ error: { error_message: err.toString() } });
            }
            callback(null, { result: true, user: result.getObjectFactory() });
        })
    }
});

router.post('/auth/logout', function (req, res) {

    execute({}, function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(data, callback) {
        authManager.logout(req, res, function (err, result) {
            if (err || !result) {
                return callback({ error: { error_message: err.toString() } });
            }
            callback(null, { result: result });
        })
    }
});

router.get('/auth/isAuth', function (req, res) {

    execute({}, function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(data, callback) {
        authManager.isAuth(req, res, function (err, result) {
            if (err || !result) {
                return callback({ error: { error_message: err.toString() } });
            }
            callback(null, result);
        })
    }
});

router.get('/contests/get', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query;
        contestManager.getContests(q.count, q.offset, q.category, q.sort, q.sort_order, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString
                });
            }
            callback(null, result);
        });
    }
});


router.get('/contests/getById', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query;
        contestManager.getContest({ contestId: q.contest_id }, function (err, contest) {
            if (err) {
                return callback({
                    error: err.toString
                });
            }
            callback(null, {
                contest: contest.getObjectFactory()
            });
        });
    }
});

router.get('/contests/canJoin', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        contestManager.getContest({ contestId: q.contest_id }, function (err, contest) {
            if (err) {
                return callback({
                    error: err.toString
                });
            }
            contestManager.canJoin({ contest: contest, user: user }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                callback(null, { result: result });
            });
        });
    }
});

module.exports = router;
