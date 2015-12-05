/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 01.12.2015
 */

"use strict";


var mysqlPool   = require('../../db/mysql-connection');
var mysql       = require('mysql');
var User        = require('../user/user');
var async       = require('async');
var Problem     = require('../problemset/problem');
var contestManager = require('../contest/manager');
var Contest     = require('../contest/contest');
var usersManager = require('../user/manager');

module.exports = {
    searchGroups: SearchGroups,
    searchProblems: SearchProblems,
    createContest: CreateContest,
    deleteContest: DeleteContest,
    repairContest: RepairContest,
    getContestInfo: GetContestInfo,
    updateContest: UpdateContest,
    getUsers: GetUsers,
    deleteUser: DeleteUser,
    createUser: CreateUser
};

function SearchGroups(q, callback) {
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
        connection.query(
            'SELECT * ' +
            'FROM groups ' +
            'WHERE name LIKE "%' + connection.escape(q).replace(/(\')/gi, '') + '%" ' +
            'LIMIT 0, 10',
            [ ],
            function (err, results, fields) {
                if (err) {
                    return callback(new Error('An error with db', 1001));
                }
                callback(null, results);
            }
        );
    }
}

function SearchProblems(q, system_type, callback) {
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
        system_type = system_type || 'all';
        if (!q || !q.length) {
            return callback(null, { q: q, items: [] });
        }
        var sqlQuery = mysql.format(
                'SELECT problemset.* ' +
                'FROM problemset ' +
                'WHERE ' +
                (system_type !== 'all' ? 'problemset.system_type = ' + connection.escape(system_type) + ' AND' : '') + ' ' +
                '(problemset.title LIKE "%' + connection.escape(q).replace(/(\')/gi, '') + '%" OR ' +
                'problemset.text LIKE "%' + connection.escape(q).replace(/(\')/gi, '') + '%") ' +
                'LIMIT 0, 20'
            );
        /*
         sqlQuery = mysql.format(
         'SELECT problemset.*, ' +
         'MATCH (problemset.title, problemset.text) ' +
         'AGAINST ("+' + connection.escape(q).replace(/(\')/gi, '') + '" IN BOOLEAN MODE) as REL ' +
         'FROM problemset ' +
         'WHERE ' +
         (system_type !== 'all' ? 'problemset.system_type = ' + connection.escape(system_type) + ' AND' : '') + ' ' +
         'MATCH (problemset.title, problemset.text) ' +
         'AGAINST ("+' + connection.escape(q).replace(/(\')/gi, '') + '" IN BOOLEAN MODE) ' +
         'ORDER BY REL DESC ' +
         'LIMIT 0, 50'
         )
         */
        connection.query(
            sqlQuery,
            [ ],
            function (err, results, fields) {
                if (err) {
                    return callback(new Error('An error with db', 1001));
                }
                if (!results.length) {
                    return callback(null, { q: q, items: [] });
                }
                callback(null, {
                    items: results.map(function (row) {
                        var problem = new Problem();
                        problem.setObjectRow(row);
                        return problem.getObjectFactory();
                    }),
                    q: q
                });
            }
        );
    }
}

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
        var sD = params.contestStartTime;
        var startDate = new Date(sD.year, sD.month, sD.day, sD.hours - (process.env.IP ? 3 : 0), sD.minutes);
        var durationTime = params.contestRelativeFinishTime * 60 * 60 * 1000;
        var relativeFreezeTime = durationTime - params.contestFreezeTime * 60 * 60 * 1000;
        var practiceDurationTime = params.contestPracticeTime * 60 * 60 * 1000;
        var user_id = params.user.getId();
        var creationParams = {
            name: params.contestName,
            start_time: startDate.getTime(),
            relative_freeze_time: relativeFreezeTime,
            duration_time: durationTime,
            practice_duration_time: practiceDurationTime,
            user_id: user_id,
            allowed_groups: (params.groups || []).join(',')
        };
        contestManager.create(creationParams, function (err, contest) {
            if (err) {
                return callback(err);
            }
            if (contest.isEmpty()) {
                return callback(new Error('Contest is empty'));
            }

            if (!params.problems.length) {
                return callback(null, { result: true });
            }

            var problemsIds = params.problems.reverse(),
                contestId = contest.getId(),
                problemsRows = problemsIds.map(function (problemId) {
                    return [ contestId, problemId ];
                });
            connection.query(
                'INSERT INTO problems_to_contest (contest_id, problem_id) ' +
                'VALUES ?',
                [ problemsRows ],
                function (err) {
                    if (err) {
                        return callback(new Error('An error with db'));
                    }
                    callback(null, { result: true });
                }
            );
        })
    }
}

function UpdateContest(params, callback) {
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
        var contestId = params.contest_id;
        var sD = params.contestStartTime;
        var startDate = new Date(sD.year, sD.month, sD.day, sD.hours - (process.env.IP ? 3 : 0), sD.minutes);
        var durationTime = params.contestRelativeFinishTime * 60 * 60 * 1000;
        var relativeFreezeTime = durationTime - params.contestFreezeTime * 60 * 60 * 1000;
        var practiceDurationTime = params.contestPracticeTime * 60 * 60 * 1000;
        var user_id = params.user.getId();
        var allowed_groups = (params.groups || []).join(',');
        var creationParams = {
            name: params.contestName,
            start_time: startDate.getTime(),
            relative_freeze_time: relativeFreezeTime,
            duration_time: durationTime,
            practice_duration_time: practiceDurationTime,
            allowed_groups: allowed_groups
        };
        contestManager.update(contestId, creationParams, function (err, contest) {
            if (err) {
                return callback(err);
            }
            if (contest.isEmpty()) {
                return callback(new Error('Contest is empty'));
            }

            var problemsIds = params.problems.reverse(),
                contestId = contest.getId(),
                problemsRows = problemsIds.map(function (problemId) {
                    return [ contestId, problemId ];
                });
            connection.query(
                'DELETE FROM problems_to_contest ' +
                'WHERE contest_id = ?',
                [ contestId ],
                function (err) {
                    if (err) {
                        return callback(new Error('An error with db', 1001));
                    }
                    if (!params.problems.length) {
                        return callback(null, { result: true });
                    }
                    connection.query(
                        'INSERT INTO problems_to_contest (contest_id, problem_id) ' +
                        'VALUES ?',
                        [ problemsRows ],
                        function (err) {
                            if (err) {
                                return callback(new Error('An error with db'));
                            }
                            callback(null, { result: true });
                        }
                    );
                }
            );
        })
    }
}

function DeleteContest(params, callback) {
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
        var contestId = params.contest_id;
        connection.query(
            'UPDATE contests ' +
            'SET removed = 1 ' +
            'WHERE id = ?',
            [ contestId ],
            function (err, results) {
                if (err) {
                    return callback(new Error('An error with db', 1001));
                }
                callback(null, { result: true });
            }
        );
    }
}

function RepairContest(params, callback) {
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
        var contestId = params.contest_id;
        connection.query(
            'UPDATE contests ' +
            'SET removed = 0 ' +
            'WHERE id = ?',
            [ contestId ],
            function (err, results) {
                if (err) {
                    return callback(new Error('An error with db', 1001));
                }
                callback(null, { result: true });
            }
        );
    }
}

function GetContestInfo(params, user, callback) {
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
        var contestId = params.contest_id,
            contest = new Contest();
        contest.allocate(contestId, function (err, result) {
            if (err) {
                return callback(err);
            }
            contest.allocateAllowedGroups(function () {
                if (err) {
                    return callback(err);
                }
                var contestObject = contest.getObjectFactory();
                connection.query(
                    'SELECT problemset.* ' +
                    'FROM problemset ' +
                    'LEFT JOIN problems_to_contest ON problems_to_contest.problem_id = problemset.id ' +
                    'LEFT JOIN contests ON problems_to_contest.contest_id = contests.id ' +
                    'WHERE contests.id = ?',
                    [ contestId ],
                    function (err, results, fields) {
                        if (err) {
                            return callback(new Error('An error with db', 1001));
                        }
                        if (!results.length) {
                            contestObject.problems = [];
                            return callback(null, contestObject);
                        }
                        contestObject.problems = results.map(function (row) {
                            var problem = new Problem();
                            problem.setObjectRow(row);
                            return problem.getObjectFactory();
                        });
                        callback(null, contestObject);
                    }
                );
            });
        });
    }
}

function GetUsers(count, offset, callback) {
    usersManager.getUsers(count, offset, function (err, result) {
        if (err) {
            return callback(err);
        }
        result.users = result.users.map(function (user) {
            return user.getObjectFactory();
        });
        callback(null, result);
    });
}

function DeleteUser(userId, callback) {
    usersManager.deleteUser(userId, function (err, result) {
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
}

function CreateUser(params, callback) {

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
        if (!params.firstName || !params.lastName || !params.username || !params.password) {
            return callback(new Error('Params not specified.'));
        }
        params.groups = params.groups || [];
        connection.query(
            'SELECT * ' +
            'FROM users ' +
            'WHERE username = ?',
            [ params.username.trim() ],
            function (err, results, fields) {
                if (err) {
                    return callback(new Error('An error with db.'));
                }
                if (results.length) {
                    return callback(new Error('Current username exists.'));
                }
                usersManager.create({
                    username: params.username.trim(),
                    first_name: params.firstName.trim(),
                    last_name: params.lastName.trim(),
                    password: params.password.trim()
                }, function (err, user) {
                    if (err) {
                        return callback(err);
                    }
                    if (user.isEmpty()) {
                        return callback(new Error('User is empty'));
                    }

                    if (!params.groups.length) {
                        return callback(null, { result: true });
                    }

                    var groupIds = params.groups,
                        userId = user.getId(),
                        usersRows = groupIds.map(function (groupId) {
                            return [ userId, groupId ];
                        });
                    connection.query(
                        'INSERT INTO users_to_groups (user_id, group_id) ' +
                        'VALUES ?',
                        [ usersRows ],
                        function (err) {
                            if (err) {
                                return callback(new Error('An error with db'));
                            }
                            callback(null, { result: true });
                        }
                    );
                })
            }
        );
    }
}