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

var saveProblemsPer = 2;

module.exports = {
    scanTimusTasks: ScanTimusTasks,
    scanCodeforcesTasks: ScanCodeforcesTasks,
    scanCodeforcesTasksGyms: ScanCodeforcesTasksGyms
};

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function ScanTimusTasks(user, callback) {
    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db', 1001));
        }
        
        var _once = true;
        execute(connection, function (err, result) {
            if (_once) {
                connection.release();
                _once = false;
            }
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
                for (var i = 0; i < problems.length; ++i) {
                    for (var el in problems[i]) {
                        problems[i][el] = null;
                    }
                }
                problems = [];
            };

            callback(null, {
                result: true,
                all_items_count: problems.length
            });
            q.push(problems, function (err, problem) {
                if (err || !problem.number) {
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

function ScanCodeforcesTasks(user, callback) {
    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db', 1001));
        }
        var _once = true;
        execute(connection, function (err, result) {
            if (_once) {
                connection.release();
                _once = false;
            }
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
        var acmTasksUrl = 'http://codeforces.com/problemset/page/1',
            systemType = 'cf';
        restler.get(acmTasksUrl, {
            headers: {
                'Accept-Language': 'ru,en;q=0.8'
            },
            query: {
                locale: 'ru'
            }
        }).on('complete', function(data, response) {
            var bodyResponse = data;
            if (!bodyResponse) {
                return callback(new Error('Response has no body'));
            }
            var $ = cheerio.load(bodyResponse),
                problems = [];
            var allPagesElements = $('[pageindex]');
            if (!allPagesElements || !allPagesElements.length) {
                return callback(new Error('Pages counter not found'));
            }
            var allPages = allPagesElements.eq(allPagesElements.length - 1).attr('pageindex');

            var qPages = async.queue(function (page, cb) {
                var pageNumber = page.page;
                var pageUrl = 'http://codeforces.com/problemset/page/' + pageNumber;
                restler.get(pageUrl, {
                    headers: {
                        'Accept-Language': 'ru,en;q=0.8'
                    },
                    query: {
                        locale: 'ru'
                    }
                }).on('complete', function (data, response) {
                    if (!data) {
                        return cb(new Error('Resource has not been reached'));
                    }
                    var $ = cheerio.load(data),
                        content = $('.problems');
                    content.find('tr').slice(1).each(function () {
                        var _ = $(this),
                            tds = _.find('td');
                        if (!tds.length) {
                            return;
                        }
                        var taskNumber = tds.eq(0).text().trim();
                        var contestId, taskIndex;
                        try {
                            contestId = taskNumber.match(/(\d+)/i)[1];
                            taskIndex = taskNumber.match(/([a-zA-Z]+)/i)[1];
                            if (!contestId || !taskIndex) {
                                return;
                            }
                            var taskName = tds.eq(1).find('div').eq(0).text().trim();
                            problems.push({
                                index: taskIndex.toUpperCase(),
                                contest_id: contestId,
                                name: taskName
                            });
                        } catch (err) {
                            console.log(err);
                        }
                    });
                    cb();
                });
            }, 10);

            qPages.drain = function() {
                console.log('All pages have been processed');
                saveProblems(problems);
            };

            for (var i = 1; i <= allPages; ++i) {
                qPages.push({ page: i }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
            }

            function saveProblems(problems) {
                var q = async.queue(function (problem, cb) {
                    var pageUrl = 'http://codeforces.com/problemset/problem/' + problem.contest_id + '/' + problem.index;
                    restler.get(pageUrl, {
                        headers: {
                            'Accept-Language': 'ru,en;q=0.8'
                        },
                        query: {
                            locale: 'ru'
                        }
                    }).on('complete', function (data, response) {
                        if (!data) {
                            return cb(new Error('Resource has not been reached'));
                        }
                        var $ = cheerio.load(data),
                            content = $('.ttypography');
                        content.find('img').each(function () {
                            var imgThis = $(this),
                                src = imgThis.attr('src');
                            if (src && src.indexOf('http://codeforces.com') === -1) {
                                imgThis.attr('src', 'http://codeforces.com' + src);
                            }
                        });
                        content.find('*').each(function () {
                            var _ = $(this);
                            var classes = _.attr('class');
                            if (!classes) {
                                return;
                            }
                            classes = classes.split(' ');
                            for (var j = 0; j < classes.length; ++j) {
                                classes[j] = 'task__my-' + classes[j];
                            }
                            _.attr('class', classes.join(' '));
                        });

                        var newObjProblem = clone(problem);
                        newObjProblem.html = content.html();
                        newObjProblem.text = content.text();
                        newObjProblem.dispose = function () { for (var key in this) this[key] = null; };

                        cb(null, newObjProblem);
                    });
                }, saveProblemsPer);

                q.drain = function() {
                    console.log('All problems have been processed');
                    for (var i = 0; i < problems.length; ++i) {
                        for (var el in problems[i]) {
                            problems[i][el] = null;
                        }
                    }
                    problems = [];
                };

                callback(null, {
                    result: true,
                    all_items_count: problems.length
                });
                    
                q.push(problems, function (err, problem) {
                    if (err) {
                        console.log(err);
                    }
                    problem.number = 'problemset:' + problem.contest_id + problem.index;
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
                                        console.log('Finished processing item (update):', problem.number);
                                        problem.dispose();
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
                                        console.log('Finished processing item (insert):', problem.number);
                                        problem.dispose();
                                    }
                                );
                            }
                        }
                    );
                });
            }
        });
    }
}

function ScanCodeforcesTasksGyms(user, callback) {
    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db', 1001));
        }
        var _once = true;
        execute(connection, function (err, result) {
            if (_once) {
                connection.release();
                _once = false;
            }
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
        var acmTasksUrl = 'http://codeforces.com/gyms/page/1',
            systemType = 'cf';
        restler.get(acmTasksUrl, {
            headers: {
                'Accept-Language': 'ru,en;q=0.8'
            },
            query: {
                locale: 'ru'
            }
        }).on('complete', function(data, response) {
            var bodyResponse = data;
            if (!bodyResponse) {
                return callback(new Error('Response has no body'));
            }
            var $ = cheerio.load(bodyResponse),
                problems = [],
                contests = [];

            var allPagesElements = $('[pageindex]');
            if (!allPagesElements || !allPagesElements.length) {
                return callback(new Error('Pages counter not found'));
            }
            var allPages = allPagesElements.eq(allPagesElements.length - 1).attr('pageindex');

            var qPages = async.queue(function (page, cb) {
                var pageNumber = page.page;
                var pageUrl = 'http://codeforces.com/gyms/page/' + pageNumber;
                restler.get(pageUrl, {
                    headers: {
                        'Accept-Language': 'ru,en;q=0.8'
                    },
                    query: {
                        locale: 'ru'
                    }
                }).on('complete', function (data, response) {
                    if (!data) {
                        return cb(new Error('Resource has not been reached'));
                    }
                    var $ = cheerio.load(data),
                        content = $('.datatable');
                    content.find('tr[data-contestid]').each(function () {
                        var _ = $(this);
                        var contestId = _.attr('data-contestid');
                        contests.push({
                            id: parseInt(contestId)
                        });
                    });
                    cb();
                });
            }, 10);

            qPages.drain = function() {
                console.log('All pages have been processed');
                handleContests(contests);
            };

            for (var i = 1; i <= allPages; ++i) {
                qPages.push({ page: i }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
            }

            function handleContests(contests) {
                var q = async.queue(function (contest, cb) {
                    var pageUrl = 'http://codeforces.com/gym/' + contest.id;
                    restler.get(pageUrl, {
                        headers: {
                            'Accept-Language': 'ru,en;q=0.8'
                        },
                        query: {
                            locale: 'ru'
                        }
                    }).on('complete', function (data, response) {
                        if (!data) {
                            return cb(new Error('Resource has not been reached'));
                        }
                        var $ = cheerio.load(data),
                            content = $('.problems');

                        content.find('tr').slice(1).each(function () {
                            var _ = $(this),
                                tds = _.find('td');
                            if (!tds.length) {
                                return;
                            }
                            var taskIndex = tds.eq(0).text().trim(),
                                taskName;
                            try {
                                taskName = tds.eq(1).find('div').eq(0).find('div').eq(0).find('a').text().trim();
                                problems.push({
                                    index: taskIndex.toUpperCase(),
                                    contest_id: contest.id,
                                    name: taskName
                                });
                            } catch (err) {
                                console.log(err);
                            }
                        });
                        cb();
                    });
                }, 10);

                q.drain = function() {
                    console.log('All contests have been processed');
                    saveProblems(problems);
                };

                for (var i = 0; i < contests.length; ++i) {
                    q.push(contests[i], function (err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }

                function saveProblems(problems) {
                    var q = async.queue(function (problem, cb) {
                        var pageUrl = 'http://codeforces.com/gym/' + problem.contest_id + '/problem/' + problem.index;
                        restler.get(pageUrl, {
                            headers: {
                                'Accept-Language': 'ru,en;q=0.8'
                            },
                            query: {
                                locale: 'ru'
                            }
                        }).on('complete', function (data, response) {
                            if (!data) {
                                return cb(new Error('Resource has not been reached'));
                            }
                            var $ = cheerio.load(data),
                                content = $('.ttypography');
                            if (!content.length) {
                                //pdf
                                content = $('.datatable table').parent();
                                content.find('a').each(function () {
                                    var hrefThis = $(this),
                                        href = hrefThis.attr('href');
                                    if (href && href.indexOf('http://codeforces.com') === -1) {
                                        hrefThis.attr('href', 'http://codeforces.com' + href);
                                    }
                                });
                                content.find('img').each(function () {
                                    var imgThis = $(this),
                                        src = imgThis.attr('src');
                                    if (src && src.indexOf('http://codeforces.com') === -1) {
                                        imgThis.attr('src', 'http://codeforces.com' + src);
                                    }
                                });
                                content.find('*').each(function () {
                                    var _ = $(this);
                                    var classes = _.attr('class');
                                    if (!classes) {
                                        return;
                                    }
                                    classes = classes.split(' ');
                                    for (var j = 0; j < classes.length; ++j) {
                                        classes[j] = 'task__my-' + classes[j];
                                    }
                                    _.attr('class', classes.join(' '));
                                });

                                var newObjProblem = clone(problem);
                                newObjProblem.html = content.html();
                                newObjProblem.text = '';
                                newObjProblem.dispose = function () { for (var key in this) this[key] = null; };

                                cb(null, newObjProblem);
                            } else {
                                //problem html
                                content.find('img').each(function () {
                                    var imgThis = $(this),
                                        src = imgThis.attr('src');
                                    if (src && src.indexOf('http://codeforces.com') === -1) {
                                        imgThis.attr('src', 'http://codeforces.com' + src);
                                    }
                                });
                                content.find('*').each(function () {
                                    var _ = $(this);
                                    var classes = _.attr('class');
                                    if (!classes) {
                                        return;
                                    }
                                    classes = classes.split(' ');
                                    for (var j = 0; j < classes.length; ++j) {
                                        classes[j] = 'task__my-' + classes[j];
                                    }
                                    _.attr('class', classes.join(' '));
                                });

                                newObjProblem = clone(problem);
                                newObjProblem.html = content.html();
                                newObjProblem.text = content.text();
                                newObjProblem.dispose = function () { for (var key in this) this[key] = null; };

                                cb(null, newObjProblem);
                            }
                        });
                    }, saveProblemsPer);

                    q.drain = function() {
                        console.log('All problems have been processed');
                        for (var i = 0; i < problems.length; ++i) {
                            for (var el in problems[i]) {
                                problems[i][el] = null;
                            }
                        }
                        problems = [];
                    };

                    callback(null, {
                        result: true,
                        all_items_count: problems.length
                    });
                    
                    q.push(problems, function (err, problem) {
                        if (err) {
                            return console.log(err);
                        }
                        problem.number = 'gym:' + problem.contest_id + problem.index;
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
                                            console.log('Finished processing item (update):', problem.number);
                                            problem.dispose();
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
                                            console.log('Finished processing item (insert):', problem.number);
                                            problem.dispose();
                                        }
                                    );
                                }
                            }
                        );
                    });
                }
            }
        });
    }
}