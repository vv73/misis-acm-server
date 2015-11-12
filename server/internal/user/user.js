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
var stray = require('stray').bind(this, {
    set: 'alnum',
    size: 32
});

var ACCESS_KEYS_LIMIT = 5;
var noop = function() {};

function User() {
    this._userRow = {};
    this._containGroups = null;
}

User.prototype.setObjectRow = function (userRow) {
    if (typeof userRow !== 'object') {
        return;
    }
    this._userRow = userRow;
};

User.prototype.isEmpty = function () {
    return !Object.keys(this._userRow).length || !this._userRow.id;
};

User.prototype.allocate = function (user_id, callback) {
    callback = callback || noop;
    if (!user_id) {
        return callback(new Error('User id not specified'));
    }
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection'));
        }
        connection.query(
            'SELECT users.*, groups.group_name ' +
            'FROM `users` ' +
            'LEFT JOIN access_groups AS groups ON users.access_level = groups.access_level ' +
            'WHERE `id` = ? ' +
            'LIMIT 0, 1',
            [ user_id ],
            function (error, results, fields) {
                if (error) {
                    connection.release();
                    return callback(new Error('An error with db process'));
                }
                if (!results.length) {
                    connection.release();
                    return callback(new Error('User not found'));
                }
                _this._userRow = results[0];
                callback(null);
                connection.release();
            }
        );
    });
};

User.prototype.allocateByLogin = function (login, callback) {
    callback = callback || noop;
    if (!login) {
        return callback(new Error('Login not specified'));
    }
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection'));
        }
        connection.query(
            'SELECT users.*, groups.group_name ' +
            'FROM `users` ' +
            'LEFT JOIN access_groups AS groups ON users.access_level = groups.access_level ' +
            'WHERE `username` = ? ' +
            'LIMIT 0, 1',
            [ login ],
            function (error, results, fields) {
                if (error) {
                    connection.release();
                    return callback(new Error('An error with db process'));
                }
                if (!results.length) {
                    connection.release();
                    return callback(new Error('User not found'));
                }
                _this._userRow = results[0];
                callback(null);
                connection.release();
            }
        );
    });
};

User.prototype.allocateByAccessKey = function (accessKey, callback) {
    callback = callback || noop;
    if (!accessKey) {
        return callback(new Error('Access key not specified'));
    }
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection'));
        }
        connection.query(
            'SELECT users.*, groups.group_name ' +
            'FROM `users` ' +
            'LEFT JOIN access_groups AS groups ON users.access_level = groups.access_level ' +
            'WHERE `access_keys` LIKE ? ' +
            'LIMIT 0, 1',
            [ '%' + accessKey + '%' ],
            function (error, results, fields) {
                if (error) {
                    connection.release();
                    return callback(new Error('An error with db process'));
                }
                if (!results.length) {
                    connection.release();
                    return callback(new Error('User not found'));
                }
                _this._userRow = results[0];
                callback(null);
                connection.release();
            }
        );
    });
};

User.prototype.getId = function () {
    return this._userRow.id;
};

User.prototype.getUsername = function () {
    return this._userRow.username;
};

User.prototype.getFirstName = function () {
    return this._userRow.first_name;
};

User.prototype.getLastName = function () {
    return this._userRow.last_name;
};

User.prototype.getDisplayName = function () {
    return [this.getFirstName(), this.getLastName()].join(' ').trim();
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

User.prototype.getAccessGroup = function () {
    return {
        access_level: this._userRow.access_level,
        name: this._userRow.group_name
    };
};

User.prototype.getContainGroups = function (callback) {
    if (this._containGroups) {
        return callback(null, this._containGroups);
    }
    var _this = this;
    mysql.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db', 1001));
        }
        execute(connection, function (err, result) {
            connection.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });

    function execute(connection, callback) {
        connection.query(
            'SELECT groups.* ' +
            'FROM groups ' +
            'LEFT JOIN users_to_groups ON users_to_groups.group_id = groups.id ' +
            'WHERE users_to_groups.user_id = ?',
            [ _this.getId() ],
            function (error, results, fields) {
                if (error) {
                    return callback(new Error('An error with db process', 1001));
                }
                _this._containGroups = results;
                callback(null, results);
            }
        );
    }
};

User.prototype.getContainGroupIds = function (callback) {
    if (typeof callback !== 'function') {
        return;
    }
    this.getContainGroups(function (err, groups) {
        if (err) {
            return callback(err);
        }
        callback(null, groups.map(function (group) {
            return group.id;
        }));
    });
};

User.prototype.setUsername = function (username, callback) {
    callback = callback || noop;
    if (!username) {
        return;
    }
    var _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection', 1001));
        }
        connection.query('UPDATE `users` SET `username` = ? WHERE `id` = ?', [ username, _this.getId() ], function (error, results, fields) {
            if (error) {
                connection.release();
                return callback(new Error('An error with db process', 1001));
            }
            _this._userRow.username = username;
            callback(null, username);
            connection.release();
        });
    });
};

User.prototype.setPassword = function (password, callback) {
    callback = callback || noop;
    if (!password) {
        return;
    }
    var passwordHash = crypto.createHash('md5').update(password).digest('hex'),
        _this = this;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection', 1001));
        }
        connection.query('UPDATE `users` SET `password` = ? WHERE `id` = ?', [ passwordHash, _this.getId() ], function (error, results, fields) {
            if (error) {
                connection.release();
                return callback(new Error('An error with db process', 1001));
            }
            _this._userRow.password = passwordHash;
            callback(null, passwordHash);
            connection.release();
        });
    });
};

User.prototype.addAccessKey = function (accessKey, callback) {
    callback = callback || noop;
    if (!accessKey) {
        return callback(new Error('Access key is empty'));
    }
    var _this = this,
        accessKeys = this.getAccessKeys();
    accessKeys.push(accessKey);
    while (accessKeys.length > ACCESS_KEYS_LIMIT) {
        accessKeys.shift();
    }
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection', 1001));
        }
        connection.query('UPDATE `users` SET `access_keys` = ? WHERE `id` = ?', [ accessKeys.join(','), _this.getId() ], function (error, results, fields) {
            if (error) {
                connection.release();
                return callback(new Error('An error with db process', 1001));
            }
            _this._userRow.access_keys = accessKeys.join(',');
            callback(null, accessKeys);
            connection.release();
        });
    });
};

User.prototype.deleteAccessKey = function (accessKey, callback) {
    callback = callback || noop;
    if (!accessKey) {
        return callback(new Error('Access key is empty'));
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
            connection.release();
            return callback(new Error('An error with db connection', 1001));
        }
        connection.query('UPDATE `users` SET `access_keys` = ? WHERE `id` = ?', [ accessKeys.join(','), _this.getId() ], function (error, results, fields) {
            if (error) {
                connection.release();
                return callback(new Error('An error with db process', 1001));
            }
            _this._userRow.access_keys = accessKeys.join(',');
            callback(null, accessKey);
            connection.release();
        });
    });
};

User.prototype.incrementSolvedCount = function (callback) {
    var _this = this;
    callback = callback || noop;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection', 1001));
        }
        connection.query(
            'UPDATE `users` SET `solved_count` = `solved_count` + 1 WHERE `id` = ?', [ _this.getId() ],
            function (error, results, fields) {
                if (error) {
                    connection.release();
                    return callback(new Error('An error with db process', 1001));
                }
                _this._userRow.solved_count++;
                callback(null, _this._userRow.solved_count);
                connection.release();
            }
        );
    });
};

User.prototype.updateLastLoggedTime = function (callback) {
    var _this = this;
    callback = callback || noop;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection', 1001));
        }
        var curDate = new Date();
        connection.query(
            'UPDATE `users` SET `last_logged_time` = ? WHERE `id` = ?', [ curDate.getTime(), _this.getId() ],
            function (error) {
                if (error) {
                    connection.release();
                    return callback(new Error('An error with db process', 1001));
                }
                _this._userRow.last_logged_time = curDate.getTime();
                callback(null, _this._userRow.last_logged_time);
                connection.release();
            }
        );
    });
};

User.prototype.updateRecentActionTime = function (callback) {
    var _this = this;
    callback = callback || noop;
    mysql.connection(function getConnection(err, connection) {
        if (err) {
            connection.release();
            return callback(new Error('An error with db connection', 1001));
        }
        var curDate = new Date();
        connection.query(
            'UPDATE `users` SET `recent_action_time` = ? WHERE `id` = ?', [ curDate.getTime(), _this.getId() ],
            function (error) {
                if (error) {
                    connection.release();
                    return callback(new Error('An error with db process', 1001));
                }
                _this._userRow.recent_action_time = curDate.getTime();
                callback(null, _this._userRow.recent_action_time);
                connection.release();
            }
        );
    });
};

User.prototype.generateAccessKey = function () {
    return stray();
};

User.prototype.isPasswordEquals = function (anotherPassword) {
    if (this.isEmpty()) {
        return false;
    }
    return this.getPasswordHash() === crypto.createHash('md5').update(anotherPassword).digest('hex');
};

User.prototype.getObjectFactory = function () {
    if (this.isEmpty()) {
        return {};
    }
    return {
        id: this.getId(),
        username: this.getUsername(),
        first_name: this.getFirstName(),
        last_name: this.getLastName(),
        rate: this.getSolvedCount(),
        access_group: this.getAccessGroup()
    }
};


module.exports = User;