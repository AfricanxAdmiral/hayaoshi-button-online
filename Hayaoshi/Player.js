module.exports = class Player {
    constructor(id, name, joinedOrder, isMaster) {
        this.isMaster = isMaster;
        this.id = id;
        this.name = name;
        this.pushedRank = null;
        this.joinedRank = joinedOrder;
        this.score = 0;
    }

    buttonPushed(rank) {
        this.pushedRank = rank;
    }

    wrongButtonPushed(rank) {
        if (this.pushedRank === 0) {
            this.pushedRank = null;
        } else if (this.pushedRank > 0) {
            this.pushedRank -= 1;
        }
    }

    scorePoint() {
        this.score += 1;
    }

    reset() {
        this.pushedRank = null;
    }

    createPlayerDetails() {
        return {
            id: this.id,
            name: this.name,
            pushedRank: this.pushedRank,
            joinedRank: this.joinedRank,
            isMaster: this.isMaster,
            score: this.score,
        }
    }
}
