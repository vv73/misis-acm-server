var express = require('express');
var router = express.Router();
var mysqlPool = require('../db/mysql-connection');
var timus = require('../internal/systems/timus/timus');

router.get('/', function(req, res) {
    var source = "" +
        "#include <iostream>\n    \nusing namespace std;\n    \nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}";

    var callback = function (err, verdict) {
        if (err) {
            console.log('Try to send the solution one more time');
            setTimeout(function () {
                timus.send({
                    language    : '38',
                    task_num    : '1000',
                    source      : source
                }, callback);
            }, 1000);
            return console.log(err);
        }
        console.log(verdict);
    };

    timus.send({
        language    : '38',
        task_num    : '1000',
        source      : source
    }, callback);
    res.end();
});

router.get('/index', function(req, res) {
    res.end('Index!');
});

module.exports = router;