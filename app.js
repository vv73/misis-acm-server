/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var formData = require("express-form-data");
var auth = require('./server/internal/user/auth/auth');
//var pmx = require('pmx');
var routes = require('./server/routers/router');
var serverInit = require('./server/init');

var app = express();

// view engine setup
app.set('views', __dirname + '/server/views');
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/app/img/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(formData.parse());
app.use(formData.json());
app.use(formData.stream());
app.use(formData.union());
app.use(cookieParser());
app.enable('trust proxy');
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'app')));
app.use(auth.restore);

/**
 * Fills acm accounts for async queue
 */
serverInit();

/*
 * Connecting routers
 */

app.get('/partials\/*:filename', routes.partials);
app.use('/', routes.index);
app.use('/api', routes.api);

app.all('/*', function(req, res, next) {
    // Just send the index.jade for other files to support html5 mode in angular routing
    res.render('index/index');
});

//app.use(pmx.expressErrorHandler());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.end();
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.end();
});


module.exports = app;
