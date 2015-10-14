var mysql = require('./db/mysql-connection');
var timus = require('./internal/systems/timus/timus');

module.exports = Init;

function Init() {
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            throw err;
        }
        connection.query('SELECT * FROM `system_accounts` WHERE `system_type` = ? AND `enabled` = ?', [ 'timus', 1], function (error, results, fields) {
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
            connection.release();
        });
    })
}