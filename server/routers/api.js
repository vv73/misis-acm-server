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
var problemsetManager = require('../internal/problemset/manager');
var scanner = require('../internal/problemset/scanner');

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
                    error: err.toString()
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
        var user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not authorized'));
        }
        var q = req.query;
        contestManager.getContest({ contestId: q.contest_id }, function (err, contest) {
            if (err) {
                return callback({
                    error: err.toString()
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
                    error: err.toString()
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

router.post('/contests/join', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.body,
            user = req.currentUser;
        contestManager.join({ contestId: q.contest_id, user: user }, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.get('/problemset/getForContest', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        problemsetManager.getForContest({ contestId: q.contest_id, user: user }, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.get('/problemset/getByInternalIndex', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        problemsetManager.getByInternalIndex({ contestId: q.contest_id, user: user, problemIndex: q.problem_index }, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.post('/contest/send', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var body = req.body,
            user = req.currentUser;
        user._ip = req.ip || req.ips;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        contestManager.sendSolution({
            contestId: body.contest_id,
            user: user,
            problemIndex: body.internal_index,
            solution: body.solution,
            langId: body.lang_id
        }, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.get('/contest/getLangs', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        problemsetManager.getLangs({
            contestId: q.contest_id,
            problemIndex: q.problem_index,
            user: user
        }, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.get('/contest/getSents', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err);
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        if (typeof q.contest_id === 'undefined') {
            return callback(new Error('Params is not specified'));
        }
        contestManager.getSents(q.contest_id, user, q.select, q.count, q.offset, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.get('/contest/getSourceCode', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err.error ? err : {
                error: err.toString()
            });
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        if (typeof q.contest_id === 'undefined' || typeof q.source_id === 'undefined') {
            return callback(new Error('Params are not specified'));
        }
        contestManager.getSourceCode(q.contest_id, user, q.source_id, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.get('/contest/getSourceCodeRaw', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err.error ? err : {
                error: err.toString()
            });
        }
        res.end(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        if (typeof q.contest_id === 'undefined' || typeof q.source_id === 'undefined') {
            return callback(new Error('Params are not specified'));
        }
        contestManager.getSourceCodeRaw(q.contest_id, user, q.source_id, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

router.get('/contest/getTable', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err.error ? err : {
                error: err.toString()
            });
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        if (typeof q.contest_id === 'undefined') {
            return callback(new Error('Params are not specified'));
        }
        contestManager.getTable(q.contest_id, user, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});


router.get('/admin/scanTimus', function (req, res) {

    execute(function (err, result) {
        if (err) {
            return res.json(err.error ? err : {
                error: err.toString()
            });
        }
        res.json(result);
    });

    function execute(callback) {
        var q = req.query,
            user = req.currentUser;
        if (!user || user.isEmpty()) {
            return callback(new Error('User is not specified'));
        }
        scanner.scanTimusTasks(user, function (err, result) {
            if (err) {
                return callback({
                    error: err.toString()
                });
            }
            callback(null, result);
        });
    }
});

module.exports = router;