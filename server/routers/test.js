var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
    res.end('Test!');
});

router.get('/index', function(req, res) {
    res.end('Test index!');
});

router.get('/index/:id', function(req, res) {
    res.end('Test index ' + req.params.id);
});

module.exports = router;