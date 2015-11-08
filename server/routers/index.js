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
    //console.log(req.session);
    //req.currentUser.updateRecentActionTime();
    //console.log(req.currentUser);


    contestManager.getContests(10, 0, 'all', 'byId', 'asc', function (err, result) {
        console.log(err, result);
    });

    res.render('index/index');

    /*if (!req.session.user_id) {
        auth.auth(req, res, 'Test2', '115563', function (err, user) {
            if (err) {
                res.end('<h1>Server running</h1>');
                return console.log(err);
            }
            console.log('Authed user:', user);
            res.end(user.getDisplayName());
        });
    } else {
        req.session.views = req.session.views ? req.session.views : 0;
        req.session.views++;
        console.log(req.currentUser.getObjectFactory());
        res.end(req.currentUser.getDisplayName());
    }*/


    /*test.create({
        username: 'Test3',
        password: '123456',
        first_name: 'Alexxxxx',
        last_name: 'Beloffffffffffffffffffff'
    }, function (err, user) {
        if (err) {
            return console.log(err);
        }
        console.log(user);
    });*/

    /*for (var i = 0; i < 1; ++i) {
        acmManager.send('timus', {
            language: 32,
            task_num: 1462,
            source: "import java.io.*;\nimport java.util.*;\nimport java.math.*;\n\npublic class Main {\n\npublic static BigInteger[] powMatrix(BigInteger[] a, BigInteger[] b) {\nBigInteger[] matr = new BigInteger[] {\nBigInteger.ONE,\nBigInteger.ONE,\nBigInteger.ONE,\nBigInteger.valueOf(2)\n};\nmatr[0] = a[0].multiply(b[0]).add(a[1].multiply(b[2]));\nmatr[1] = a[0].multiply(b[1]).add(a[1].multiply(b[3]));\nmatr[2] = a[2].multiply(b[0]).add(a[3].multiply(b[2]));\nmatr[3] = a[2].multiply(b[1]).add(a[3].multiply(b[3]));\n\nreturn matr;\n}\n\npublic static BigInteger[] pow(BigInteger[] matrix, int n) {\nBigInteger[] p = new BigInteger[]{\nBigInteger.ONE,\nBigInteger.ZERO,\nBigInteger.ZERO,\nBigInteger.ONE\n};\nwhile (n != 0) {\nif (n % 2 != 0)\np = powMatrix(p, matrix);\nmatrix = powMatrix(matrix, matrix);\nn = n / 2;\n}\nreturn p;\n}\n\n\npublic static void main(String[] args) throws IOException {\nScanner in = new Scanner(System.in);\nPrintWriter pw = new PrintWriter(System.out);\n\nint n = in.nextInt(), p2;\np2 = n - 2;\n\nBigInteger x, y, results, boxes, ans;\n\n\nx = BigInteger.ONE;\ny = BigInteger.valueOf(2);\n\nBigInteger[] arrr = pow(new BigInteger[]{BigInteger.ZERO, BigInteger.ONE, BigInteger.ONE, BigInteger.ONE}, p2);\nboxes = arrr[0].multiply(x).add(arrr[1].multiply(y));\n\narrr = powMatrix(arrr, arrr);\narrr = powMatrix(arrr, new BigInteger[]{BigInteger.ZERO, BigInteger.ONE, BigInteger.ONE, BigInteger.ONE});\narrr = powMatrix(arrr, new BigInteger[]{BigInteger.ZERO, BigInteger.ONE, BigInteger.ONE, BigInteger.ONE});\nresults = arrr[0].multiply(x).add(arrr[1].multiply(y));\nans = results.divide(boxes);\n\npw.println(ans);\npw.flush();\n}\n}" +
                getTestSpaces()
        }, function (err, verdict) {
            if (err) {
                return console.log(err);
            }
            console.log(verdict);
        }, function (progressCurrentTest) {
            console.log(progressCurrentTest);
        });
    }*/

    /*for (var i = 0; i < 1; ++i) {
        acmManager.send('sgu', {
            language: 'Visual Studio C++ 2010',
            task_num: 102,
            source: "#include <iostream> \n\n    using namespace std;\n    \n    int gcd(int a, int b) {\n        return !b ? a : gcd(b, a % b);\n    }\n    \n    int main() {\n        int n, k = 0;\n        cin >> n;\n        for (int i = 1; i <= n; ++i) {\n            if (gcd(i, n) == 1) k++;\n        }\n        cout << k << endl;\n        return 0;\n    }" +
                getTestSpaces()
        }, function (err, verdict) {
            if (err) {
                return console.log(err);
            }
            console.log(verdict);
        }, function (progressCurrentTest) {
            console.log(progressCurrentTest);
        });
    }*/

    /*for (var i = 0; i < 1; ++i) {
        acmManager.send('cf', {
            language: 1,
            task_type: 'problemset',
            contest_id: 508,
            problem_index: 'A',
            source: "#include <bits/stdc++.h>\nusing namespace std;\nint a[1234][1234], n, k, m,x,j,f=1e9;\nint main() {\ncin >> n >> m >> k;\nfor (int i = 0;i < k;i++)\n{\ncin >> x >> j;\na[x][j] = 1;\nif (a[x][j + 1] == 1 && a[x + 1][j] == 1 && a[x + 1][j + 1] == 1) {\nf = min(f, i + 1);\n}\nif (a[x-1][j] == 1 && a[x][j+1] == 1 && a[x - 1][j + 1] == 1) {\nf = min(f, i + 1);\n}\nif (a[x][j-1] == 1 && a[x+1][j -1] == 1 && a[x + 1][j] == 1) {\nf = min(f, i + 1);\n}\nif (a[x - 1][j-1] == 1 && a[x][j - 1] == 1 && a[x - 1][j] == 1) {\nf = min(f, i + 1);\n}\n}\nif (f != 1e9)\ncout << f;\nelse cout << 0;\ncin.get(), cin.get();\nreturn 0;\n}" +
                getTestSpaces()
        }, function (err, verdict) {
            if (err) {
                return console.log(err);
            }
            console.log(verdict);
        }, function (progressCurrentTest) {
            console.log(progressCurrentTest);
        });
    }*/

    /*for (var i = 0; i < 1; ++i) {
        acmManager.send('acmp', {
            language: 'CPP',
            task_num: 1,
            source: "#include <iostream>\n\n    using namespace std;\n\n    int main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n    }" +
                getTestSpaces()
        }, function (err, verdict) {
            if (err) {
                return console.log(err);
            }
            console.log(verdict);
        }, function (progressCurrentTest) {
            console.log(progressCurrentTest);
        });
    }*/


});

router.get('/index', function(req, res) {
    res.end('Index!');
});

router.all('/*', function(req, res, next) {
    // Just send the index.jade for other files to support html 5 mode in angular routing
    res.render('index/index');
});

module.exports = router;


function getTestSpaces() {
    var n = Math.floor(Math.random() * 10000);
    var buf = '';
    for (var i = 0; i < n; ++i) {
        buf += '\n';
    }
    return buf;
}