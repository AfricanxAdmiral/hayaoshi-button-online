const store = {
    isMute: true,
    isButtonEnabled: false,
}

const getSessionId = () => new URLSearchParams(location.href.split('?')[1]).get('sessionId');;

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
const shareButton = document.getElementById('shareButton');

const initShareButtonText = () => {
    if (navigator.share) {
        shareButton.children[0].textContent = 'URLを共有する';
    } else {
        shareButton.children[0].textContent = 'URLをコピーする';
    }
}

const enableButton = (bool) => {
    store.isButtonEnabled = bool;
    pushButton.className = (bool)
        ? pushButton.className.replace('disabled', 'pushable')
        : pushButton.className.replace('pushable', 'disabled');
}

socket.on('sessionStatus', ({ players }) => {
    const ownData = players.find(p => p.id === socket.id);
    if (ownData) {
        document.getElementById('playGame').style.display = "flex";
        [joinButton, playerNameInput].forEach(e => e.disabled = true);
    }
});

socket.on('buttonPushed', (players) => {
    if (!store.isMute) {
        new Audio('/sound/buzzer.wav').play();
    }

    const texts = players
        .filter(player => player.pushedRank !== null)
        .map(player => {
            if (player.id === socket.id) {
                enableButton(false);
            }
            const elm = document.createElement('p');
            elm.className = 'displayPushedPlayerName';
            elm.textContent = `${player.name}さんが${player.pushedRank+1}番目にボタンを押しました`;
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
    socket.emit('reset');
}

pushButton.addEventListener('click', tryPushButton)
resetButton.addEventListener('click', resetButtonPushed)


const setShareModalPassword = (number) => {
    const passDiv = document.getElementById('showPasswords');
    passDiv.innerHTML = number.split('').map(e => `<p>${e}</p>`).join('');
}

const modalDiv = document.getElementById('shareModal');
document.getElementById('openShareModal').addEventListener('click', () => {
    modalDiv.className = 'shareModal shareModal--on';
    initShareButtonText();
    setShareModalPassword('----');
    fetch(`/createPassword?sessionId=${getSessionId()}`)
        .then(r => r.json())
        .then(({ password }) => setShareModalPassword(password));
});

document.getElementById('closeShareModal').addEventListener('click', () => {
    modalDiv.className = 'shareModal shareModal--off';
});

shareButton.addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: '早押しボタンオンライン',
            text: '一緒に早押しボタンで遊びませんか？',
            url: location.href,
        })
    } else {
        execCopy(location.href);
        shareButton.children[0].textContent = 'コピーしました！'
    }
});

document.getElementById('volume_button').addEventListener('click', () => {
    const muteIconClass = 'fas fa-volume-mute';
    const unmuteIconClass = 'fas fa-volume-up';
    store.isMute = !store.isMute;
    document.getElementById('volume_button_icon').className = store.isMute ? muteIconClass : unmuteIconClass;
});

document.getElementById('image_button').addEventListener('click', () => {
    document.body.style.backgroundImage = `url("https://source.unsplash.com/random?q=${Math.random()}")`;
});

document.addEventListener('keydown', ({ code }) => {
    if (code === 'Space' || code === 'Enter') tryPushButton();
    if (code === 'Backspace' || code === 'Delete') resetButtonPushed();
});