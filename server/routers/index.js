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
var acmManager = require('../internal/systems/manager');
var test = require('../internal/user/manager');
var auth = require('../internal/user/auth/auth');
var contestManager = require('../internal/contest/manager');

router.get('/', function(req, res) {
    res.render('index/index');
});

module.exports = router;