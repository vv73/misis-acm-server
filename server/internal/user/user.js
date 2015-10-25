/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 */

'use strict';

var mysql = require('../../db/mysql-connection');
var crypto = require('crypto');

var ACCESS_KEYS_LIMIT = 5;

function User() {
    this._userRow = {};
}

User.prototype.isEmpty = function () {
    return !Object.keys(this._userRow).length || !this._userRow.id;
};

User.prototype.allocate = function (user_id, callback) {
    if (!user_id) {
        return callback(new Error('User id not specified'));
    }
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            return callback(new Error('An error with db connection'));
        }
        connection.query('SELECT * FROM `users` WHERE `id` = ? LIMIT 0, 1', [ user_id ], function (error, results, fields) {
            if (err) {
                return callback(new Error('An error with db process'));
            }
            if (!results.length) {
                return callback(new Error('User not found'));
            }
            _this._userRow = results[0];
            callback(null);
        });
    });
};

User.prototype.allocateByAccessKey = function (accessKey, callback) {
    if (!user_id) {
        return callback(new Error('User id not specified'));
    }
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            return callback(new Error('An error with db connection'));
        }
        connection.query('SELECT * FROM `users` WHERE `access_keys` LIKE ? LIMIT 0, 1', [ '%' + accessKey + '%' ], function (error, results, fields) {
            if (err) {
                return callback(new Error('An error with db process'));
            }
            if (!results.length) {
                return callback(new Error('User not found'));
            }
            _this._userRow = results[0];
            callback(null);
        });
    });
};

User.prototype.getId = function () {
    return this._userRow.id;
};

User.prototype.getUsername = function () {
    return this._userRow.username;
};

User.prototype.getPasswordHash = function () {
    return this._userRow.password;
};

User.prototype.getAccessKeys = function () {
    if (!this._userRow.access_keys || !this._userRow.access_keys.length) {
        return [];
    }
    return this._userRow.access_keys.split(',');
};

User.prototype.getSolvedCount = function () {
    return this._userRow.solved_count;
};

User.prototype.setUsername = function (username, callback) {
    if (!username) {
        return;
    }
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            return callback(new Error('An error with db connection'));
        }
        connection.query('UPDATE `users` SET `username` = ? WHERE `id` = ?', [ username, _this.getId() ], function (error, results, fields) {
            if (err) {
                return callback(new Error('An error with db process'));
            }
            _this._userRow.username = username;
            callback(null, username);
        });
    });
};

User.prototype.setPassword = function (password, callback) {
    if (!password) {
        return;
    }
    var passwordHash = crypto.createHash('md5').update(password).digest('hex'),
        _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            return callback(new Error('An error with db connection'));
        }
        connection.query('UPDATE `users` SET `password` = ? WHERE `id` = ?', [ passwordHash, _this.getId() ], function (error, results, fields) {
            if (err) {
                return callback(new Error('An error with db process'));
            }
            _this._userRow.password = passwordHash;
            callback(null, passwordHash);
        });
    });
};

User.prototype.addAccessKey = function (accessKey, callback) {
    if (!password) {
        return;
    }
    var _this = this,
        accessKeys = this.getAccessKeys();
    accessKeys.push(accessKey);
    while (accessKeys.length > ACCESS_KEYS_LIMIT) {
        accessKeys.shift();
    }
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            return callback(new Error('An error with db connection'));
        }
        connection.query('UPDATE `users` SET `access_keys` = ? WHERE `id` = ?', [ accessKeys.join(','), _this.getId() ], function (error, results, fields) {
            if (err) {
                return callback(new Error('An error with db process'));
            }
            _this._userRow.access_keys = accessKeys.join(',');
            callback(null, accessKeys);
        });
    });
};

User.prototype.deleteAccessKey = function (accessKey, callback) {
    if (!password) {
        return;
    }
    var _this = this,
        accessKeys = this.getAccessKeys();
    var deleteIndex = accessKeys.indexOf(accessKey);
    if (deleteIndex == -1) {
        return callback(null);
    }
    accessKeys.splice(deleteIndex, 1);
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            return callback(new Error('An error with db connection'));
        }
        connection.query('UPDATE `users` SET `access_keys` = ? WHERE `id` = ?', [ accessKeys.join(','), _this.getId() ], function (error, results, fields) {
            if (err) {
                return callback(new Error('An error with db process'));
            }
            _this._userRow.access_keys = accessKeys.join(',');
            callback(null, accessKey);
        });
    });
};

User.prototype.incrementSolvedCount = function (callback) {
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            return callback(new Error('An error with db connection'));
        }
        connection.query('UPDATE `users` SET `solved_count` = `solved_count` + 1 WHERE `id` = ?', [ _this.getId() ], function (error, results, fields) {
            if (err) {
                return callback(new Error('An error with db process'));
            }
            _this._userRow.solved_count++;
            callback(null, _this._userRow.solved_count);
        });
    });
};


module.exports = User;