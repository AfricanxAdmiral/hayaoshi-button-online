const Hayaoshi = require('../Hayaoshi/Hayaoshi');
const getStore = require('../Store/Store');

module.exports = class Session {
    constructor(ioRoom, options) {
        console.log('Creating new session ...');
        this.hayaoshi = new Hayaoshi();
        this.masterId = null;
        this.isResetButtonMasterOnly = options.isResetButtonMasterOnly ?? false;
        this.isSoundButtonMasterOnly = options.isSoundButtonMasterOnly ?? false;
        this.isSimpleBackground = options.isSimpleBackground ?? false;
        this.room = ioRoom;
        this.playSound = true;
        this.room.on('connection', socket => this.connection(socket));
    }

    connection(socket) {
        socket.use(packet => {
            console.log(packet);
            const apiName = packet[0];

            if (apiName === 'editingName' && !this.masterId) {
                // 一番最初にコネクション張った人はマスター
                console.log(`this.masterId: ${this.masterId}, socket.id: ${socket.id}`);
                this.masterId = socket.id;
            }

            if (apiName === 'joinSession') {
                this.joinSession(socket, packet[1], this.masterId === socket.id);
            }

            if (apiName === 'reset') {
                this.reset(socket);
            }

            if (apiName === 'pushButton') {
                this.pushButton(socket);
            }

            if (apiName === 'playSound') {
                this.emitPlaySound(socket, packet[1]);
            }

            if (apiName === 'pushCorrectButton') {
                this.correctButton(socket);
            }

            if (apiName === 'pushWrongButton') {
                this.wrongButton(socket);
            }
        })

        socket.on('disconnect', () => {
            this.emitDisconnect(socket)

            if (socket.id === this.masterId) {
                // ルームマスターが切断された
                if (this.isResetButtonMasterOnly) {
                    this.isResetButtonMasterOnly = false;
                }
                if (this.isSoundButtonMasterOnly) {
                    this.isSoundButtonMasterOnly = false;
                }
            }
            this.emitSessionStatus();
        })
    }

    joinSession(socket, name, isMaster) {
        this.hayaoshi.joinPlayers(socket.id, name, isMaster);
        this.emitSessionStatus(socket);
        const store = getStore();
        store.countUser();
    }

    pushButton(socket) {
        if (this.hayaoshi.isPlayerIdExist(socket.id)) {
            const pushedPlayerDetail = this.hayaoshi.buttonPushed(socket.id);
            console.log(`pushButton pushedPlayerDetail: ${JSON.stringify(pushedPlayerDetail)}`)
            this.emitButtonPushed(socket, pushedPlayerDetail);
            const store = getStore();
            store.countPush();
        }
    }

    correctButton(socket) {
        this.hayaoshi.correctButtonPushed();
    }

    wrongButton(socket) {
        const pushedPlayerDetail = this.hayaoshi.wrongButtonPushed();
        console.log(`emitWrongButton pushedPlayerDetail: ${JSON.stringify(pushedPlayerDetail)}`)
        this.emitWrongButtonPushed(socket, pushedPlayerDetail);
    }

    reset(socket) {
        if (!this.isResetButtonMasterOnly || this.hayaoshi.isPlayerIdMaster(socket.id)) {
            this.hayaoshi.resetPlayers();
            this.emitReset();
        }
        this.emitSessionStatus(socket);
    }

    emitSessionStatus() {
        this.room.emit('sessionStatus', {
            isResetButtonMasterOnly: this.isResetButtonMasterOnly,
            isSoundButtonMasterOnly: this.isSoundButtonMasterOnly,
            isSimpleBackground: this.isSimpleBackground,
            players: this.hayaoshi.createPlayerDetails()
        });
    }

    emitButtonPushed(socket, playerDetail) {
        this.room.emit('buttonPushed', playerDetail);
    }

    emitWrongButtonPushed(socket, playerDetail) {
        this.room.emit('wrongButtonPushed', playerDetail);
    }

    emitReset() {
        this.room.emit('reset');
    }

    emitDisconnect(socket) {
        if (this.hayaoshi.isPlayerIdExist(socket.id)) {
            this.hayaoshi.playerDisconnect(socket.id);
        }
    }

    emitPlaySound(socket, soundUrl) {
        if (this.playSound && (!this.isSoundButtonMasterOnly || this.hayaoshi.isPlayerIdMaster(socket.id))) {
            this.playSound = false;
            this.room.emit('playSound', soundUrl);
            setTimeout(() => {
                this.playSound = true;
            }, 1500);
        }
    }
}
