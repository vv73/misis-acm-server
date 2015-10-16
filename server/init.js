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
        });
    });

    /*var cookie = 'lastOnlineTimeUpdaterInvocation=' + (new Date().getTime()) + '; nocturne.language=ru; __atuvc=1%7C40; JSESSIONID=50DDDDCD5EFCCE8B56310B185320FEA8-n1; 39ce7=CFwaFZfe; evercookie_png=9yy33egseuoqd7vivw; evercookie_etag=9yy33egseuoqd7vivw; evercookie_cache=9yy33egseuoqd7vivw; 70a7c28f3de=9yy33egseuoqd7vivw; X-User=""; __utmt=1; __utma=71512449.134535337.1444174233.1444174233.1444915211.2; __utmb=71512449.110.10.1444915211; __utmc=71512449; __utmz=71512449.1444174233.1.1.utmcsr=vk.com|utmccn=(referral)|utmcmd=referral|utmcct=/mikemirzayanov';
    var csrf_token = '3181e94f5445d31d20e5f2b69f2230ac';

    var data = {
        'csrf_token': csrf_token,
        'ftaa': '9yy33egseuoqd7vivw',
        'bfaa': 'f3bce49d929535a378832f7bcdf18e2c',
        'action': 'submitSolutionFormSubmitted',
        'submittedProblemIndex': 'A',
        'programTypeId': '7',
        'source': "wew23wq23ew2e",
        'sourceFile': '',
        '_tta': '70'
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
    });*/
}