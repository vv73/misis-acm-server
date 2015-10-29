var mysql   = require('mysql');
var config  = require('../config/config');

config.db.connectionLimit = 50;
config.db.multipleStatements = true;

var pool = mysql.createPool(config.db);

module.exports.connection = function(callback) {

    pool.getConnection(function(err, connection) {
        callback(err, connection);
    });
};

module.exports.pool = pool;