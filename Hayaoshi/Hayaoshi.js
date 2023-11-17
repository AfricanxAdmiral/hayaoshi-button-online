const Player = require('./Player');

module.exports = class Hayaoshi {
    constructor() {
        this.players = [];
    }

    joinPlayers(id, name, isMaster) {
        console.log(`Player id: ${id} / name: ${name} / isMaster: ${isMaster} joining ...`);
        this.players.push(new Player(id, name, this.players.length+1, isMaster));
    }

    buttonPushed(pushedPlayerId) {
        const pushedPlayer = this.players.find(p => p.id === pushedPlayerId);
        if (!pushedPlayer) {
            throw new Error('存在しないプレイヤーです。');
        }

        const pushedPlayers = this.players.filter(p => p.pushedRank !== null);
        pushedPlayer.buttonPushed(pushedPlayers.length);

        return this.players
            .filter(p => p.pushedRank !== null)
            .sort((a, b) => {
                if (a.pushedRank === b.pushedRank) return 0;
                if (a.pushedRank === null) return -1;
                if (b.pushedRank === null) return 1;
                return a.pushedRank - b.pushedRank;
            }).map(p => p.createPlayerDetails());
    }

    correctButtonPushed() {
        const currentPlayer = this.players.find(p => p.pushedRank === 0);
        if (currentPlayer) {
            currentPlayer.scorePoint();
        }
    }

    wrongButtonPushed() {
        this.players.map(p => p.wrongButtonPushed())
        
        return this.players
            .filter(p => p.pushedRank !== null)
            .sort((a, b) => {
                if (a.pushedRank === b.pushedRank) return 0;
                if (a.pushedRank === null) return -1;
                if (b.pushedRank === null) return 1;
                return a.pushedRank - b.pushedRank;
            }).map(p => p.createPlayerDetails());
    }

    isPlayerIdExist(id) {
        return this.players.some(p => p.id === id);
    }

    isPlayerIdMaster(id) {
        return this.players.some(p => p.id === id && p.isMaster);
    }

    resetPlayers() {
        this.players.forEach(p => p.reset());
    }

    playerDisconnect(pushedPlayerId) {
        this.players = this.players.filter(p => p.id !== pushedPlayerId)
    }

    createPlayerDetails() {
        return this.players.map(p => p.createPlayerDetails());
    }
}
