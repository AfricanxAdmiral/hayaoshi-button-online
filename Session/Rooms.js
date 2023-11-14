const Session = require('./Session');
// const uuid = require('uuid');

module.exports = class Rooms {
    constructor(io) {
        this.io = io;
        this.rooms = [];
    }

    createNewRoom(options = {}) {
        // const id = uuid.v4();
        const id = '0af9eedf-0410-4ef7-8a12-e47a880d7463';
        this.rooms.push(new Session(this.io.of(`/session/${id}`), options));
        return id;
    }
}
