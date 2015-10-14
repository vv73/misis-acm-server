var express = require('express');
var router = express.Router();
var mysqlPool = require('../db/mysql-connection');
var timus = require('../internal/systems/timus/timus');

router.get('/', function(req, res) {
    timus.send({
        language    : '38',
        task_num    : '1000',
        source      : 'test123'
    }, function (err, verdict) {
        //...
    });
    res.end();
});

router.get('/index', function(req, res) {
    res.end('Index!');
});

module.exports = router;