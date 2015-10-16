var mysql = require('./db/mysql-connection');
var timus = require('./internal/systems/timus/timus');
var codeforces = require('./internal/systems/codeforces/codeforces');
var restler = require('restler');

module.exports = Init;

function Init() {
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            throw err;
        }
        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'timus', 1 ], function (error, results, fields) {
            if (error) {
                throw error;
            }
            timus.addAccounts( results.map(function iterator(object) {
                return {
                    login: object.system_login,
                    nickname: object.system_nickname,
                    password: object.system_password,
                    rest: object.rest_params
                };
            }) );
        });

        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'cf', 1 ], function (error, results, fields) {
            if (error) {
                throw error;
            }
            codeforces.addAccounts( results.map(function iterator(object) {
                return {
                    login: object.system_login,
                    nickname: object.system_nickname,
                    password: object.system_password,
                    rest: object.rest_params
                };
            }) );

            codeforces.send({
                language: 7,
                task_type: 'archive',
                problem_code: '456B',
                source: "n = input()\nif n % 4 == 0:\n    print(4)\nelse:\n    print(0) "
            }, function (err, verdict) {
                if (err) {
                    return console.log(err);
                }
                console.log(verdict);
            });
        });
    });

    return;
    var cookie = 'JSESSIONID=7AC8D205FC38FDF4C82030CAC05D0471-n1; 39ce7=CFwuo8WC';
    var csrf_token = '79616af380d4e8c478e4b3e07021485f';

    var data = {
        'csrf_token': csrf_token,
        'action': 'submitSolutionFormSubmitted',
        'submittedProblemIndex': 'A',
        'programTypeId': '7',
        'source': "code" + (Math.random() * 1000000000).toString().replace('.', ''),
        'sourceFile': ''
    };

    restler.post('http://codeforces.com/gym/100773/submit?csrf_token=' + csrf_token, {
        multipart: true,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*!/!*;q=0.8',
            'Cookie': cookie,
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'ru,en;q=0.8',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Content-Length': JSON.stringify(data).length,
            'Host': 'codeforces.com',
            'Origin': 'http://codeforces.com',
            'Referer': 'http://codeforces.com/problemset/submit',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 YaBrowser/15.9.2403.3043 Safari/537.36'
        },
        data: data
    }).on('complete', function(data) {
        console.log(data);
    });
}