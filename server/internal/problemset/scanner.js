/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 29.11.2015
 */

"use strict";

var mysqlPool   = require('../../db/mysql-connection');
var mysql       = require('mysql');
var async       = require('async');
var Contest     = require('../contest/contest');
var Problem     = require('../problemset/problem');
var restler     = require('restler');
var cheerio     = require('cheerio');

module.exports = {
    scanTimusTasks: ScanTimusTasks
};


function ScanTimusTasks(user, callback) {
    mysqlPool.connection(function (err, connection) {
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
        if (user.getAccessGroup().access_level !== 5) {
            return callback(new Error('Access denied'));
        }
        var acmTasksUrl = 'http://acm.timus.ru/problemset.aspx',
            systemType = 'timus';
        restler.get(acmTasksUrl, {
            query: {
                space: 1,
                page: 'all'
            },
            headers: {
                'Accept-Language': 'ru-RU,ru;q=0.8,ru;q=0.6'
            }
        }).on('complete', function(data, response) {
            var bodyResponse = data;
            if (!bodyResponse) {
                return callback(new Error('Response has no body'));
            }
            var $ = cheerio.load(bodyResponse),
                problems = [];
            $('.problemset').find('.content').slice(1).each(function () {
                var _ = $(this),
                    tds = _.find('td');
                var taskNum = tds.eq(1).text();
                if (!taskNum) {
                    return;
                }
                taskNum = parseInt(taskNum);
                var taskName = _.find('.name').text();
                problems.push({
                    number: taskNum,
                    name: taskName
                });
            });

            var updateCounter = 0,
                insertCounter = 0;

            var q = async.queue(function (problem, callback) {
                var taskNum = problem.number,
                    taskUrl = 'http://acm.timus.ru/problem.aspx';
                restler.get(taskUrl, {
                    query: {
                        space: 1,
                        num: taskNum
                    },
                    headers: {
                        'Accept-Language': 'ru-RU,ru;q=0.8,ru;q=0.6'
                    }
                }).on('complete', function (data, response) {
                    if (!data) {
                        return callback(new Error('Resource has not been reached'));
                    }
                    var $ = cheerio.load(data),
                        content = $('.problem_content').parent().find('.problem_content');
                    content.find('img').each(function () {
                        var imgThis = $(this),
                            src = imgThis.attr('src');
                        if (src && src.indexOf('http://acm.timus.ru') === -1) {
                            imgThis.attr('src', 'http://acm.timus.ru' + src);
                        }
                    });
                    var taskFormattedText = '<div class="problem_content">' + content.html() + '</div>',
                        taskText = content.text();
                    problem.html = taskFormattedText;
                    problem.text = taskText;
                    callback(null, problem);
                })
            }, 40);

            q.drain = function() {
                console.log('All items have been processed');
                callback(null, {
                    result: true,
                    all_items_count: problems.length,
                    updated: updateCounter,
                    inserted: insertCounter
                });
            };

            q.push(problems, function (err, problem) {
                if (!problem.number) {
                    return;
                }
                connection.query(
                    'SELECT * ' +
                    'FROM problemset ' +
                    'WHERE foreign_problem_id = ? AND system_type = ?',
                    [ problem.number, systemType ],
                    function (err, results, fields) {
                        if (err) {
                            return console.log(err);
                        }
                        if (results.length) {
                            connection.query(
                                'UPDATE problemset ' +
                                'SET title = ?, formatted_text = ?, text = ?, creation_time = ? ' +
                                'WHERE foreign_problem_id = ? AND system_type = ?',
                                [ problem.name, problem.html, problem.text, new Date().getTime(), problem.number, systemType ],
                                function (err) {
                                    if (err) {
                                        return console.log(err);
                                    }
                                    updateCounter++;
                                    console.log('Finished processing item:', problem.number);
                                }
                            );
                        } else {
                            connection.query(
                                'INSERT INTO problemset ' +
                                '(system_type, foreign_problem_id, title, formatted_text, text, creation_time) ' +
                                'VALUES (?, ?, ?, ?, ?, ?)',
                                [ systemType, problem.number, problem.name, problem.html, problem.text, new Date().getTime() ],
                                function (err) {
                                    if (err) {
                                        return console.log(err);
                                    }
                                    insertCounter++;
                                    console.log('Finished processing item:', problem.number);
                                }
                            );
                        }
                    }
                );
            });
        });
    }
}