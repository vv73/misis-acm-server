/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 05.12.2015
 */


var io,
    salt = 'misis_acm_belov';

var crypto = require('crypto');

module.exports = {
    create: Create,
    handle: Handle,
    getIo: GetIO,
    getHash: getHash,
    salt: salt
};

function Create(s_io) {
    io = s_io;
}

function GetIO() {
    return io;
}

function Handle(socket) {
    console.log('Connected:', socket.id);

    socket.on('join contest', function (data) {
        if (!data.contest_id) {
            return;
        }
        var contestHashKey = getHash(data.contest_id + salt);
        socket.join(contestHashKey);
    });

    socket.on('leave contest', function (data) {
        if (!data.contest_id) {
            return;
        }
        var contestHashKey = getHash(data.contest_id + salt);
        socket.leave(contestHashKey);
    });

    socket.on('disconnect', function (data) {
        console.log('Disconnected');
    });
}

function getHash(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}