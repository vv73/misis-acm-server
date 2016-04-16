var mysql   = require('mysql');
var config  = require('../config/config');
var orm = require("orm");

config.db.connectionLimit = 50;
config.db.multipleStatements = true;

var pool = mysql.createPool(config.db);

function getConnection(callback) {

    pool.getConnection(function(err, connection) {
        callback(err, connection);
    });
}

function getOrm(callback) {

    getConnection(function (err, connection) {
        orm.use(connection, 'mysql', {}, callback);
    });
}

module.exports.connection = getConnection;
module.exports.orm = getOrm;
module.exports.pool = pool;