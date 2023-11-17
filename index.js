const express = require('express');
const Rooms = require('./Session/Rooms');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const getStore = require('./Store/Store');

app.use(express.static('static'));

const rooms = new Rooms(io);

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const isResetButtonMasterOnly = false;
const isSoundButtonMasterOnly = false;
const isSimpleBackground = true;
const roomId = rooms.createNewRoom({ isResetButtonMasterOnly, isSoundButtonMasterOnly, isSimpleBackground });

app.get('/', (req, res) => {
    res.redirect(`/session.html?sessionId=${roomId}`);
});

const serverOpenDate = new Date().toString();
app.get('/analytics', (req, res) => {
    const store = getStore();
    res.json({
        roomCount: rooms.rooms.length,
        openDate: serverOpenDate,
        ...store.data()
    });
});

const SERVER_PORT = 3000;

http.listen(SERVER_PORT);
console.log('Server listening on ' + SERVER_PORT);
