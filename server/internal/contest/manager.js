/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 05.11.2015
 */

"use strict";


var mysqlPool   = require('../../db/mysql-connection');
var mysql       = require('mysql');
var User        = require('../user/user');
var Contest     = require('../contest/contest');
var crypto      = require('crypto');
var async       = require('async');
var problemsetManager = require('../problemset/manager');
var Problem = require('../problemset/problem');
var acmManager = require('../systems/manager');


var DEFAULT_CONTESTS_COUNT = 20;
var DEFAULT_CONTESTS_OFFSET = 0;
var DEFAULT_CONTESTS_CATEGORY = 'all';
var DEFAULT_CONTESTS_SORT = 'byId';
var DEFAULT_CONTESTS_SORT_ORDER = 'desc';

module.exports = {
    create: CreateContest,
    getContests: GetContests,
    getContest: GetContest,
    canJoin: CanJoin,
    join: Join,
    sendSolution: SendSolution
};


function CreateContest(params, callback) {
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
        var sql = mysql.format('INSERT INTO `contests` ' +
            '(name, virtual, start_time, relative_freeze_time, duration_time, user_id, creation_time, allowed_groups) ' +
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [ params.name, params.virtual, params.start_time, params.relative_freeze_time,
                params.duration_time, params.user_id, new Date().getTime(), params.allowed_groups ]
        );
        connection.query(
            sql,
            function (err, result) {
                console.log(err);
                if (err || !result || !result.insertId) {
                    return callback(new Error('An error whith db process', 1001));
                }
                var contest = new Contest();
                contest.allocate(result.insertId, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, contest);
                });
            }
        );
    }
}

function GetContests(count, offset, category, sort, sort_order, callback) {
    if (typeof count === 'function') {
        callback = count;
        count = null;
    } else if (typeof offset === 'function') {
        callback = offset;
        offset = null;
    } else if (typeof category === 'function') {
        callback = category;
        category = null;
    } else if (typeof sort === 'function') {
        callback = sort;
        sort = null;
    } else if (typeof sort_order === 'function') {
        callback = sort_order;
        sort_order = null;
    }

    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db querying', 1001));
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
        count = count || DEFAULT_CONTESTS_COUNT;
        offset = offset || DEFAULT_CONTESTS_OFFSET;
        category = category || DEFAULT_CONTESTS_CATEGORY;
        sort = sort || DEFAULT_CONTESTS_SORT;
        sort_order = sort_order || DEFAULT_CONTESTS_SORT_ORDER;

        count = Math.max(Math.min(count, 200), 0);
        offset = Math.max(offset, 0);

        var categoryPredicate = [
            'all',
            'showOnlyVirtual',
            'showOnlyEnabled',
            'showOnlyDisabled',
            'showOnlyFinished',
            'showOnlyRemoved',
            'showOnlyFrozen',
            'showOnlyStarted'
        ];
        if (categoryPredicate.indexOf(category) === -1) {
            category = DEFAULT_CONTESTS_CATEGORY;
        }

        var availableSorts = {
            byId: 'contests.id',
            byStart: 'contests.start_time',
            byEnd: 'finish_time',
            byCreation: 'contests.creation_time'
        };
        if (!(sort in availableSorts)) {
            sort = DEFAULT_CONTESTS_SORT;
        }

        var readyWhereStatements = {},
            statementExistence = true,
            curDate = new Date();
        switch (category) {
            case 'all':
                readyWhereStatements.all = '';
                statementExistence = false;
                break;
            case 'showOnlyVirtual':
                readyWhereStatements.showOnlyVirtual = 'contests.virtual = 1';
                break;
            case 'showOnlyEnabled':
                readyWhereStatements.showOnlyEnabled = 'contests.enabled = 1';
                break;
            case 'showOnlyDisabled':
                readyWhereStatements.showOnlyDisabled = 'contests.enabled = 0';
                break;
            case 'showOnlyFinished':
                readyWhereStatements.showOnlyFinished = 'contests.start_time + ' +
                    'contests.duration_time < ' + curDate.getTime();
                break;
            case 'showOnlyRemoved':
                readyWhereStatements.showOnlyRemoved = 'contests.removed = 1';
                break;
            case 'showOnlyFrozen':
                readyWhereStatements.showOnlyFrozen = 'contests.start_time + ' +
                    'contests.relative_freeze_time <= ' +
                    curDate.getTime() + ' AND ' + curDate.getTime() +
                    ' <= contests.start_time + contests.duration_time';
                break;
            case 'showOnlyStarted':
                readyWhereStatements.showOnlyStarted = 'contests.start_time <= ' +
                    curDate.getTime() + ' AND ' + curDate.getTime() +
                    ' <= contests.start_time + contests.duration_time';
                break;
        }
        if (category !== 'showOnlyRemoved') {
            for (var statementIndex in readyWhereStatements) {
                readyWhereStatements[statementIndex] += (statementExistence ? ' AND ' : '') + 'contests.removed = 0';
            }
        }

        var sql = 'SELECT contests.*, contests.start_time + contests.duration_time AS finish_time ' +
            'FROM contests ' +
            'WHERE ' + readyWhereStatements[category] + ' ' +
            'ORDER BY ?? ' + sort_order.toUpperCase() + ' ' +
            'LIMIT ?, ?; ' +
            'SELECT COUNT(contests.id) AS all_items_count ' +
            'FROM contests ' +
            'WHERE ' + readyWhereStatements[category] + ';';

        sql = mysql.format(sql, [
            availableSorts[sort],
            offset,
            count
        ]);

        connection.query(sql, function (err, results, fields) {
            if (err || !results || !Array.isArray(results) || !Array.isArray(results[0])) {
                console.log(err);
                return callback(err);
            }
            var contests = results[0].map(function (row) {
                var contest = new Contest();
                contest.setObjectRow(row);
                return contest;
            });
            var authorAllocates = [];
            contests.forEach(function (contest) {
                authorAllocates.push(
                    contest.allocateAuthor.bind(contest),
                    contest.allocateAllowedGroups.bind(contest)
                );
            });
            async.parallel(authorAllocates, function(err, asyncResults) {
                if (err) {
                    return callback(err);
                }
                var result = {
                    contests: contests.map(function (contest) {
                        return contest.getObjectFactory();
                    }),
                    all_items_count: results[1][0].all_items_count
                };
                callback(null, result);
            });
        })
    }
}

function GetContest(params, callback) {
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
        var contestId = params.contestId;
        if (!contestId) {
            return callback(new Error('Contest ID is not specified as parameter'));
        }
        connection.query(
            'SELECT * ' +
            'FROM ?? ' +
            'WHERE ?? = ? ' +
            'LIMIT 0, 1',
            [ 'contests', 'id', contestId ],
            function (err, result) {
                if (err || !result) {
                    return callback(new Error('An error whith db process', 1001));
                }
                var contest = new Contest();
                contest.setObjectRow(result[0]);
                var authorAllocates = [];
                authorAllocates.push(
                    contest.allocateAuthor.bind(contest),
                    contest.allocateAllowedGroups.bind(contest)
                );
                async.parallel(authorAllocates, function(err, asyncResults) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, contest);
                });
            }
        );
    }
}

function CanJoin(params, callback) {
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
        var contest = params.contest,
            user = params.user;
        if (!contest || !user || user.isEmpty() || contest.isEmpty()) {
            return callback(new Error('Access denied', 400));
        }
        user.getContainGroupIds(function (err, groupIds) {
            if (err || !Array.isArray(groupIds)) {
                return callback(err);
            }
            if (user.getAccessGroup().access_level === 5) {
                return contest.isUserJoined(user.getId(), function (err, isJoined) {
                    if (err) {
                        return callback(err);
                    }
                    if (isJoined) {
                        return callback(null, {
                            can: true,
                            joined: true,
                            confirm: false
                        });
                    }
                    callback(null, {
                        can: true,
                        joined: false,
                        confirm: false
                    });
                });
            }
            if (!contest.isAllowed(groupIds) || !contest.isEnabled() || contest.isRemoved()) {
                return callback(null, {
                    can: false,
                    reason: 'ACCESS_DENIED'
                });
            }
            contest.isUserJoined(user.getId(), function (err, isJoined) {
                if (err) {
                    return callback(err);
                }
                if (isJoined) {
                    return callback(null, {
                        can: true,
                        joined: true,
                        confirm: false
                    });
                }
                var currentStatus = contest.getStatus();
                if (currentStatus === 'FINISHED' || currentStatus === 'WAITING') {
                    return callback(null, {
                        can: false,
                        reason: 'NOT_IN_TIME'
                    });
                }
                callback(null, {
                    can: true,
                    joined: false,
                    confirm: true
                });
            });
        });
    }
}

function Join(params, callback) {
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
        var contestId = params.contestId,
            contest = new Contest(),
            user = params.user;
        contest.allocate(contestId, function (err, result) {
            if (err) {
                return callback(err);
            }
            CanJoin({ contest: contest, user: user }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (!result.can) {
                    return callback(new Error('Access denied'));
                }
                if (result.joined) {
                    return callback(null, { result: true });
                }
                connection.query(
                    'INSERT INTO ?? (`user_id`, `contest_id`, `join_time`) ' +
                    'VALUES (?, ?, ?)',
                    [ 'user_enters', user.getId(), contest.getId(), new Date().getTime() ],
                    function (err, result) {
                        if (err) {
                            return callback(new Error('An error whith db process', 1001));
                        }
                        callback(null, { result: true });
                    }
                );
            });
        });
    }
}

function SendSolution(params, callback) {
    mysqlPool.connection(function (err, connection) {
        if (err) {
            return callback(new Error('An error with db', 1001));
        }
        var onceInvoke = true;
        execute(connection, function (err, result) {
            if (!onceInvoke) {
                return;
            }
            onceInvoke = false;
            connection.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });

    function execute(connection, callback) {
        var contestId = params.contestId,
            contest = new Contest(),
            problemIndex = params.problemIndex,
            solution = params.solution,
            user = params.user,
            offset = getNumberByInternalIndex(problemIndex),
            langId = params.langId;
        contest.allocate(contestId, function (err, result) {
            if (err) {
                return callback(err);
            }
            CanJoin({ contest: contest, user: user }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                if (!result.can || !result.joined) {
                    return callback(new Error('Access denied'));
                }
                if ([ 'NOT_ENABLED', 'REMOVED', 'FINISHED', 'WAITING' ].indexOf(contest.getStatus()) !== -1) {
                    return callback(new Error('Access denied'));
                }
                connection.query(
                    'SELECT problemset.* ' +
                    'FROM problemset ' +
                    'LEFT JOIN problems_to_contest ON problems_to_contest.problem_id = problemset.id ' +
                    'LEFT JOIN contests ON problems_to_contest.contest_id = contests.id ' +
                    'WHERE contests.id = ? ' +
                    'LIMIT ?, 1',
                    [ contestId, offset ],
                    function (err, results, fields) {
                        if (err) {
                            return callback(new Error('An error with db', 1001));
                        }
                        if (!results.length) {
                            return callback(new Error('Problem not found'));
                        }
                        var mapped = results.map(function (row) {
                            var problem = new Problem();
                            problem.setObjectRow(row);
                            var readyObject = problem.getObjectFactory();
                            readyObject.internal_index = problemIndex.toUpperCase();
                            return readyObject;
                        });
                        var problem = mapped[0];

                        connection.query(
                            'SELECT * ' +
                            'FROM system_langs ' +
                            'WHERE id = ?',
                            [ parseInt(langId) ],
                            function (err, results, fields) {
                                if (err) {
                                    return callback(new Error('An error with db', 1001));
                                }
                                if (!results.length) {
                                    return callback(new Error('Langs not found', 1001));
                                }
                                var lang = results[0],
                                    curTime = new Date().getTime();
                                connection.query(
                                    'INSERT INTO sent_solutions ' +
                                    '(user_id, problem_id, sent_time, contest_id, source_code, lang_id, ip) ' +
                                    'VALUES (?, ?, ?, ?, ?, ?, ?)', [
                                        user.getId(),
                                        problem.id,
                                        curTime,
                                        contest.getId(),
                                        solution,
                                        lang.id,
                                        user._ip ? user._ip : ''
                                    ], function (err, result) {
                                        if (err) {
                                            return callback(new Error('An error with db', 1001));
                                        }
                                        callback(null, {
                                            result: true
                                        });

                                        var insertedId = result.insertId;
                                        function saveResult(verdict) {
                                            console.log(verdict);
                                            var verdictId = getVerdictId(verdict.verdict);
                                            connection.query(
                                                'UPDATE sent_solutions ' +
                                                'SET verdict_id = ?, ' +
                                                'verdict_time = ?, ' +
                                                'execution_time = ?, ' +
                                                'memory = ?, ' +
                                                'test_num = ? ' +
                                                'WHERE id = ?',
                                                [ verdictId, new Date().getTime(), verdict.timeConsumed, verdict.memoryConsumed, verdict.testNum, insertedId ],
                                                function (err) {
                                                    if (err) {
                                                        console.log(err);
                                                    }
                                                }
                                            );
                                        }

                                        switch (problem.system_type) {
                                            case 'timus':
                                                acmManager.send(problem.system_type, {
                                                    language: lang.foreign_id,
                                                    task_num: problem.system_problem_number,
                                                    source: solution
                                                }, function (err, verdict) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    saveResult(verdict);
                                                }, function (progressCurrentTest) {
                                                    console.log(progressCurrentTest);
                                                });
                                                break;
                                            case 'cf':
                                                var pairCode = problem.system_problem_number.split(':');
                                                if (pairCode.length !== 2) {
                                                    return callback(new Error('Something went wrong.'));
                                                }
                                                var taskType = pairCode[0],
                                                    problemCode = pairCode[1];
                                                if (!/^\d+[a-zA-Z]{1,}/i.test(problemCode)) {
                                                    return callback(new Error('Something went wrong. Please contact your administrator.'));
                                                }
                                                var iContestId = problemCode.match(/^(\d+)/i)[1],
                                                    iProblemIndex = problemCode.match(/([a-zA-Z]+)$/i)[1];
                                                acmManager.send(problem.system_type, {
                                                    language: lang.foreign_id,
                                                    task_type: taskType,
                                                    contest_id: iContestId,
                                                    problem_index: iProblemIndex,
                                                    source: solution
                                                }, function (err, verdict) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    saveResult(verdict);
                                                }, function (progressCurrentTest) {
                                                    console.log(progressCurrentTest);
                                                });
                                                break;
                                            case 'acmp':
                                                acmManager.send(problem.system_type, {
                                                    language: lang.foreign_id,
                                                    task_num: problem.system_problem_number,
                                                    source: solution
                                                }, function (err, verdict) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    saveResult(verdict);
                                                }, function (progressCurrentTest) {
                                                    console.log(progressCurrentTest);
                                                });
                                                break;
                                            case 'sgu':
                                                acmManager.send(problem.system_type, {
                                                    language: lang.name,
                                                    task_num: problem.system_problem_number,
                                                    source: solution
                                                }, function (err, verdict) {
                                                    if (err) {
                                                        return callback(err);
                                                    }
                                                    saveResult(verdict);
                                                }, function (progressCurrentTest) {
                                                    console.log(progressCurrentTest);
                                                });
                                                break;
                                            default:
                                                return callback(new Error('System is not defined.'));
                                                break;
                                        }

                                        function getVerdictId(verdictName) {
                                            verdictName = verdictName.toLowerCase();
                                            if (verdictName === 'ok' || verdictName === 'accepted') {
                                                return 1;
                                            } else if ([ 'wrong answer', 'wrong_answer' ].indexOf(verdictName) !== -1) {
                                                return 2;
                                            } else if ([ 'compilation error', 'compilation_error' ].indexOf(verdictName) !== -1) {
                                                return 3;
                                            } else if ([ 'runtime error', 'runtime_error', 'output limit exceeded' ].indexOf(verdictName) !== -1) {
                                                return 4;
                                            } else if ([ 'presentation error', 'presentation_error' ].indexOf(verdictName) !== -1) {
                                                return 5;
                                            } else if ([ 'time limit exceeded', 'time_limit_exceeded' ].indexOf(verdictName) !== -1) {
                                                return 6;
                                            } else if ([ 'memory limit exceeded', 'memory_limit_exceeded' ].indexOf(verdictName) !== -1) {
                                                return 7;
                                            } else if ([ 'idleness limit exceeded', 'idleness_limit_exceeded' ].indexOf(verdictName) !== -1) {
                                                return 8;
                                            } else if ([ 'security violated', 'restricted function', 'security_violated' ].indexOf(verdictName) !== -1) {
                                                return 9;
                                            } else {
                                                return 10;
                                            }
                                        }
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    }
}

function getNumberByInternalIndex(index) {
    if (!index || typeof index !== 'string' || !index.length) {
        return 0;
    }
    index = index.toLowerCase().replace(/[^a-z]/gi, '');
    if (!index) {
        return 0;
    }
    var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    if (index.length === 1) {
        return alphabet.indexOf(index);
    } else if (index.length === 2) {
        return alphabet.length * (alphabet.indexOf(index[0]) + 1) + alphabet.indexOf(index[1]);
    }
}
