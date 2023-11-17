const store = {
    isMute: false,
    audioInstance: null,
    isButtonEnabled: false,
    isActiveResetButton: true,
    isActiveSoundButton: true,
    isCoolDownSoundButton: false,
    isSimpleBackground: null,
}

const getSessionId = () => new URLSearchParams(location.href.split('?')[1]).get('sessionId');

const execCopy = (string) => {
    // 空div 生成
    const tmp = document.createElement("div");
    // 選択用のタグ生成
    const pre = document.createElement('pre');

    // 親要素のCSSで user-select: none だとコピーできないので書き換える
    pre.style.webkitUserSelect = 'auto';
    pre.style.userSelect = 'auto';
    tmp.appendChild(pre).textContent = string;

    // 要素を画面外へ
    const s = tmp.style;
    s.position = 'fixed';
    s.right = '200%';

    // body に追加
    document.body.appendChild(tmp);
    // 要素を選択
    document.getSelection().selectAllChildren(tmp);

    // クリップボードにコピー
    document.execCommand("copy");

    // 要素削除
    document.body.removeChild(tmp);
}

const socket = io.connect('/session/' + getSessionId());
const playerNameInput = document.getElementById('playerName');
const joinButton = document.getElementById('join');
const pushButton = document.getElementById('push');
const resetButton = document.getElementById('reset');
const displayPushedPlayers = document.getElementById('displayPushedPlayers');

const enableButton = (bool) => {
    store.isButtonEnabled = bool;
    pushButton.className = (bool)
        ? pushButton.className.replace('disabled', 'pushable')
        : pushButton.className.replace('pushable', 'disabled');
}

const soundButtons = [
    [document.getElementById('sound_pinpon'), '/sound/pinpon.wav'],
    [document.getElementById('sound_boboo'), '/sound/boboo.wav']
];
const correctButton = document.getElementById('sound_pinpon');
const wrongButton = document.getElementById('sound_boboo');

socket.on('sessionStatus', ({ players, isResetButtonMasterOnly, isSoundButtonMasterOnly, isSimpleBackground }) => {
    const ownData = players.find(p => p.id === socket.id);

    // TODO: 権限周り増える度しんどくなるのでリファクタしたい
    const isActiveResetButton = !isResetButtonMasterOnly || ownData.isMaster;
    store.isActiveResetButton = isActiveResetButton;
    resetButton.classList.toggle('btn-square-pop--off', !isActiveResetButton);
    resetButton.title = isActiveResetButton ? '' : '部屋作成者のみリセットできます';

    store.isActiveSoundButton = !store.isCoolDownSoundButton && (!isSoundButtonMasterOnly || ownData.isMaster);
    soundButtons.forEach(([element]) => {
        element.classList.toggle('btn-square-pop--off', !store.isActiveSoundButton);
        element.title = isActiveResetButton ? '' : '部屋作成者のみ再生できます';
    })

    if (store.isSimpleBackground == null) {
        // 初回だけ記憶
        store.isSimpleBackground = isSimpleBackground;
        if (!store.isSimpleBackground) {
            document.body.style.backgroundImage = `url("https://source.unsplash.com/random?q=${Math.random()}")`;
        } else {
            // クロマキー用に影を無効化する
            document.querySelectorAll("[class*='--shadow']").forEach((e) => {
                const cls = e.classList;
                const target = [...cls].find(l => l.endsWith("--shadow"));
                cls.remove(target);
            })
        }
    }

    if (ownData) {
        document.getElementById('playGame').style.display = "flex";
        [joinButton, playerNameInput].forEach(e => e.disabled = true);
    }

    // Draw the Score Table
    console.log(`sessionStatus players: ${JSON.stringify(players)}`)
    
    const table = document.getElementById("scoreTable");
    let newTbody = document.createElement('tbody')

    // The First Row with Title
    let row = newTbody.insertRow(-1);
    const id = document.createElement('th');
    const name = document.createElement('th');
    const score = document.createElement('th');
    id.setAttribute('width', '10%')
    score.setAttribute('width', '20%')
    name.innerText = "Name"
    score.innerText = "Score"
    let c1 = row.appendChild(id);
    let c2 = row.appendChild(name);
    let c3 = row.appendChild(score);

    // create and populate new rows by looping through database query results
    players.map(player => {
        let row = newTbody.insertRow(-1); // We are adding at the end
        row.id = `player_${player.joinedRank}`

        // Create table cells
        const id = document.createElement('th');
        id.innerText = player.joinedRank
        let c1 = row.appendChild(id);
        let c2 = row.insertCell(1).appendChild(document.createTextNode(player.name));
        let c3 = row.insertCell(2).appendChild(document.createTextNode(player.score));
    });
    
    // replace existing placeholder tbody with the populated one
    table.replaceChild(newTbody, table.tBodies[0])
});

// soundButtons.forEach(([element, url]) => {
//     element.addEventListener('click', () => {
//         if (store.isActiveSoundButton) {
//             socket.emit('playSound', url);
//         }
//     })
// })
const correctButtonPushed = () => {
    socket.emit('pushCorrectButton');

    if (store.isActiveSoundButton) {
        socket.emit('playSound', '/sound/pinpon.wav');
    }
    
    // Someone get the correct answer so move to the next question
    if (store.isActiveResetButton) {
        socket.emit('reset');
    }
}

const wrongButtonPushed = () => {
    socket.emit('pushWrongButton');

    if (store.isActiveSoundButton) {
        socket.emit('playSound', '/sound/boboo.wav');
    }
}

correctButton.addEventListener('click', correctButtonPushed)
wrongButton.addEventListener('click', wrongButtonPushed)

socket.on('playSound', (soundUrl) => {
    if (store.audioInstance) {
        store.audioInstance.src = soundUrl;
        store.audioInstance.load();
        store.audioInstance.play();
    }
    soundButtons.forEach(([element]) => {
        if (store.isActiveSoundButton) {
            store.isCoolDownSoundButton = true;
            element.classList.add('btn-square-pop--off');
            setTimeout(() => {
                store.isActiveSoundButton = true;
                store.isCoolDownSoundButton = false;
                element.classList.remove('btn-square-pop--off');
            }, 1500);
        }
    })
});

socket.on('buttonPushed', (players) => {
    if (store.audioInstance) {
        store.audioInstance.src = '/sound/buzzer.wav';
        store.audioInstance.load();
        store.audioInstance.play();
    }

    const texts = players
        .filter(player => player.pushedRank !== null)
        .map(player => {
            if (player.id === socket.id) {
                enableButton(false);
            }
            const elm = document.createElement('p');
            elm.className = 'displayPushedPlayerName';
            elm.textContent = `${player.pushedRank+1}. ${player.name}`;
            return elm;
        });

    displayPushedPlayers.innerHTML = '';
    displayPushedPlayers.append(...texts);
});

socket.on('wrongButtonPushed', (players) => {
    const texts = players
        .filter(player => player.pushedRank !== null)
        .map(player => {
            if (player.id === socket.id) {
                enableButton(false);
            }
            const elm = document.createElement('p');
            elm.className = 'displayPushedPlayerName';
            elm.textContent = `${player.pushedRank+1}. ${player.name}`;
            return elm;
        });

    displayPushedPlayers.innerHTML = '';
    displayPushedPlayers.append(...texts);
});

socket.on('reset', () => {
    enableButton(true);
    displayPushedPlayers.innerHTML = '';
});

const alertConnectionError = () => alert('接続に失敗しました。ページを再読み込みしてもうまくいかない場合、部屋を作り直してください。')

socket.on('error', alertConnectionError);
socket.on('connect_error', alertConnectionError);

joinButton.addEventListener('click', () => {
    const playerName = playerNameInput.value;
    const loginScreen = document.getElementById('loginScreenWrap');
    loginScreen.style.display = 'none';
    socket.emit('joinSession', playerName);
    enableButton(true);
});

const tryPushButton = () => {
    if (store.isButtonEnabled) {
        socket.emit('pushButton');
    }
}

const resetButtonPushed = () => {
    if (store.isActiveResetButton) {
        socket.emit('reset');
    }
}

pushButton.addEventListener('click', tryPushButton)
resetButton.addEventListener('click', resetButtonPushed)

document.getElementById('volume_button').addEventListener('click', () => {
    console.log('click volumn button.')
    const muteIconClass = 'fas fa-volume-mute';
    const unmuteIconClass = 'fas fa-volume-up';
    store.isMute = !store.isMute;
    if (!store.isMute) {
        store.audioInstance = new Audio('/sound/pochi.wav');
        store.audioInstance.play();
    } else {
        store.audioInstance = null;
    }
    document.getElementById('volume_button_icon').className = store.isMute ? muteIconClass : unmuteIconClass;
});

const simpleBackgroundList = [
    document.body.style.backgroundColor, // Default
    '#602dcf',
    '#008000',
];

document.addEventListener('keydown', ({ code }) => {
    if (code === 'Space' || code === 'Enter') tryPushButton();
    if (code === 'Backspace' || code === 'Delete') resetButtonPushed();
});

document.addEventListener('keyup', (event) => {
    const code = event.code;
    if (code === 'Space' || code === 'Enter') {
        event.preventDefault(); // ほかのボタンが押されるのを防ぐ
    }
});

document.addEventListener('onbeforeunload', () => {
    socket.disconnect();
})

const init = () => {
    console.log('Script.js init()');
    socket.emit('editingName');
}

init();
