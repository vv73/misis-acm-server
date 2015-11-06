/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 05.11.2015
 */

'use strict';

var mysql = require('../../db/mysql-connection');
var crypto = require('crypto');
var stray = require('stray').bind(this, {
    set: 'alnum',
    size: 32
});
var User = require('../user/user');

var noop = function() {};

function Contest() {
    this._contestRow = {};
    this._author = null;
}

Contest.prototype.setObjectRow = function (contestRow) {
    if (typeof contestRow !== 'object') {
        return;
    }
    this._contestRow = contestRow;
};

Contest.prototype.isEmpty = function () {
    return !Object.keys(this._contestRow).length || !this._contestRow.id;
};

Contest.prototype.allocate = function (contest_id, callback) {
    callback = callback || noop;
    if (!contest_id) {
        return callback(new Error('Contest id not specified'));
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
            'SELECT * ' +
            'FROM ?? ' +
            'WHERE ?? = ? ' +
            'LIMIT 0, 1',
            [ 'contests', 'id', contest_id ],
            function (err, results, fields) {
                if (err) {
                    return callback(new Error('An error with db', 1001));
                } else if (!results.length) {
                    return callback(new Error('Contest not found', 2001));
                }
                _this._contestRow = results[0];
                callback(null, _this._contestRow);
            }
        );
    }
};

Contest.prototype.getId = function () {
    return this._contestRow.id;
};

Contest.prototype.getName = function () {
    return this._contestRow.name;
};

Contest.prototype.isVirtual = function () {
    return this._contestRow.virtual === 1;
};

Contest.prototype.getStartTimeMs = function () {
    return this._contestRow.start_time;
};

Contest.prototype.getRelativeFreezeTimeMs = function () {
    return this._contestRow.relative_freeze_time;
};

Contest.prototype.getAbsoluteFreezeTimeMs = function () {
    return this.getStartTimeMs() + this.getRelativeFreezeTimeMs();
};

Contest.prototype.getRelativeDurationTimeMs = function () {
    return this._contestRow.duration_time;
};

Contest.prototype.getAbsoluteDurationTimeMs = function () {
    return this.getStartTimeMs() + this.getRelativeDurationTimeMs();
};

Contest.prototype.getAuthorId = function () {
    return this._contestRow.user_id;
};

Contest.prototype.getAuthor = function (callback) {
    if (this._author) {
        return callback(null, this._author);
    }
    var _this = this,
        userId = this.getAuthorId(),
        author = new User();
    author.allocate(userId, function (err) {
        if (err) {
            return callback(err);
        }
        _this._author = author;
        callback(null, author);
    });
};

Contest.prototype.getAuthorObject = function (callback) {
    if (typeof callback !== 'function') {
        return;
    }
    this.getAuthor(function (err, author) {
        if (err) {
            return callback(err);
        }
        callback(null, author.getObjectFactory());
    });
};

Contest.prototype.isEnabled = function () {
    return this._contestRow.enabled === 1;
};

Contest.prototype.getCreationTimeMs = function () {
    return this._contestRow.creation_time;
};

Contest.prototype.isRemoved = function () {
    return this._contestRow.removed === 1;
};

Contest.prototype.getAllowedGroupsId = function () {
    var allowedGroups = this._contestRow.allowed_groups;
    if (!allowedGroups || !allowedGroups.length) {
        return [];
    }
    return allowedGroups.split(',');
};

Contest.prototype.getAllowedGroups = function (callback) {
    var allowedGroupsId = this.getAllowedGroupsId();
    if (!allowedGroupsId.length) {
        return callback(null, []);
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
            'SELECT * ' +
            'FROM ?? ' +
            'WHERE ?? IN (?)',
            [ 'groups', 'id', allowedGroupsId ],
            function (err, results, fields) {
                if (err) {
                    return callback(new Error('An error with db', 1001));
                }
                var groups = results;
                if (!groups) {
                    groups = [];
                }
                callback(null, groups);
            }
        );
    }
};

Contest.prototype.isAllowed = function (userGroups) {
    if (!Array.isArray(userGroups)) {
        return;
    }
    var allowedGroups = this._contestRow.allowed_groups;
    if (!allowedGroups || !allowedGroups.length) {
        return true;
    }
    var allowedGroupsArray = allowedGroups.split(',');
    return allowedGroupsArray.some(function (val) {
        return userGroups.indexOf(val) != -1;
    });
};



Contest.prototype.getObjectFactory = function () {
    if (this.isEmpty()) {
        return {};
    }
    return {
        id: this.getId(),
        name: this.getName(),
        isVirtual: this.isVirtual(),
        startTime: this.getStartTimeMs(),
        relativeFreezeTime: this.getRelativeFreezeTimeMs(),
        absoluteFreezeTime: this.getAbsoluteFreezeTimeMs(),
        relativeDurationTime: this.getRelativeDurationTimeMs(),
        absoluteDurationTime: this.getAbsoluteDurationTimeMs(),
        author: this.getAuthorId(),
        isEnabled: this.isEnabled(),
        creationTime: this.getCreationTimeMs(),
        isRemoved: this.isRemoved(),
        allowedGroups: this.getAllowedGroupsId()
    }
};


module.exports = Contest;