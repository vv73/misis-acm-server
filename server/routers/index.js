/*
 * Acm testing system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var express = require('express');
var router = express.Router();
var mysqlPool = require('../db/mysql-connection');
var testingManager = require('../internal/systems/manager');

router.get('/', function(req, res) {
    var source = "" +
        "#include <iostream>\n    \nusing namespace std;\n    \nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}";

    testingManager.send('cf', {
        language: 7,
        task_type: 'gym',
        contest_id: 100773,
        problem_index: 'A',
        source: source
    }, function (err, verdict) {
        if (err) {
            return console.log(err);
        }
        console.log(verdict);
    });

    testingManager.send('cf', {
        language: 7,
        task_type: 'archive',
        problem_code: '33A',
        source: source
    }, function (err, verdict) {
        if (err) {
            return console.log(err);
        }
        console.log(verdict);
    });

    res.end();
});

router.get('/index', function(req, res) {
    res.end('Index!');
});

module.exports = router;