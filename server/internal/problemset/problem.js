/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 15.11.2015
 */

'use strict';

var mysql = require('../../db/mysql-connection');

var noop = function() {};

function Problem() {
    this._problemRow = {};
}

Problem.prototype.setObjectRow = function (problemRow) {
    if (typeof problemRow !== 'object') {
        return;
    }
    this._problemRow = problemRow;
};

Problem.prototype.isEmpty = function () {
    return !Object.keys(this._problemRow).length || !this._problemRow.id;
};

Problem.prototype.allocate = function (problem_id, callback) {
    callback = callback || noop;
    if (!problem_id) {
        return callback(new Error('Problem id not specified'));
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
            [ 'problemset', 'id', problem_id ],
            function (err, results, fields) {
                if (err) {
                    return callback(new Error('An error with db', 1001));
                } else if (!results.length) {
                    return callback(new Error('Problem not found', 2001));
                }
                _this._problemRow = results[0];
                callback(null, _this._problemRow);
            }
        );
    }
};

Problem.prototype.getId = function () {
    return this._problemRow.id;
};

Problem.prototype.getTitle = function () {
    return this._problemRow.title;
};

Problem.prototype.getSystemType = function () {
    return this._problemRow.system_type;
};

Problem.prototype.getForeignProblemNumber = function () {
    return this._problemRow.foreign_problem_id;
};

Problem.prototype.getFormattedText = function () {
    return this._problemRow.formatted_text;
};

Problem.prototype.getClearText = function () {
    return this._problemRow.text;
};

Problem.prototype.getCreationTimeMs = function () {
    return this._problemRow.creation_time;
};

Problem.prototype.getAttachmentsJson = function () {
    return this._problemRow.attachments ?
        this._problemRow.attachments : '';
};

Problem.prototype.getAttachmentsObject = function () {
    var json = this.getAttachmentsJson();
    try {
        var jsonObject = JSON.parse(json);
        return jsonObject;
    } catch (e) {
        return {};
    }
};

Problem.prototype.getObjectFactory = function () {
    if (this.isEmpty()) {
        return {};
    }
    return {
        id: this.getId(),
        title: this.getTitle(),
        system_type: this.getSystemType(),
        system_problem_number: this.getForeignProblemNumber(),
        formatted_text: this.getFormattedText(),
        cleared_text: this.getClearText(),
        creation_time: this.getCreationTimeMs(),
        attachments: this.getAttachmentsObject()
    };
};


module.exports = Problem;