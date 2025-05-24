// ポケモンの寝顔データ定義（例：初期状態は全て未発見）
// 実際のポケモンスリープのデータを参考に、詳細に記述していく必要があります。
const pokemonSleepData = {
    'ピカチュウ': [
        { name: '通常', discovered: false },
        { name: 'お腹の上', discovered: false },
        { name: '星3', discovered: false }
    ],
    'フシギダネ': [
        { name: '通常', discovered: false },
        { name: '寝返り', discovered: false }
    ],
    // 他のポケモンと寝顔も追加
};

const LOCAL_STORAGE_KEY = 'pokemonSleepProgress';
const pokemonListDiv = document.getElementById('pokemon-list');
const overallProgressSpan = document.getElementById('overall-progress');
const progressBarFill = document.getElementById('progress-fill');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');

// --- データ関連の関数 ---

// ローカルストレージからデータをロード
function loadProgress() {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
        const loadedData = JSON.parse(savedData);
        // ロードしたデータを現在のデータ構造にマージする
        // 新しいポケモンや寝顔が追加された場合に既存のデータを壊さないようにするため
        for (const pokemonName in pokemonSleepData) {
            if (loadedData[pokemonName]) {
                pokemonSleepData[pokemonName].forEach((face, index) => {
                    if (loadedData[pokemonName][index]) {
                        face.discovered = loadedData[pokemonName][index].discovered;
                    }
                });
            }
        }
        console.log('進捗をロードしました。');
    } else {
        console.log('保存されたデータがありません。');
    }
}

// ローカルストレージにデータを保存
function saveProgress() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pokemonSleepData));
    alert('進捗を保存しました！');
}

// 進捗をリセット
function resetProgress() {
    if (confirm('全ての進捗をリセットしますか？この操作は元に戻せません。')) {
        for (const pokemonName in pokemonSleepData) {
            pokemonSleepData[pokemonName].forEach(face => {
                face.discovered = false;
            });
        }
        saveProgress(); // リセット状態を保存
        renderPokemonList(); // UIを更新
        updateOverallProgress(); // 進捗率を更新
        alert('進捗をリセットしました。');
    }
}

// --- UI関連の関数 ---

// ポケモンの寝顔リストをレンダリング
function renderPokemonList() {
    pokemonListDiv.innerHTML = ''; // 一度クリア
    for (const pokemonName in pokemonSleepData) {
        const pokemonCard = document.createElement('div');
        pokemonCard.classList.add('pokemon-card');

        const h2 = document.createElement('h2');
        h2.textContent = pokemonName;
        pokemonCard.appendChild(h2);

        pokemonSleepData[pokemonName].forEach((face, index) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('sleep-face-checkbox');
            checkbox.checked = face.discovered;
            checkbox.dataset.pokemon = pokemonName;
            checkbox.dataset.faceIndex = index;

            // チェックボックスの変更イベント
            checkbox.addEventListener('change', (event) => {
                const pkmn = event.target.dataset.pokemon;
                const idx = parseInt(event.target.dataset.faceIndex);
                pokemonSleepData[pkmn][idx].discovered = event.target.checked;
                updateOverallProgress(); // 進捗率を更新
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(face.name));
            pokemonCard.appendChild(label);
            pokemonCard.appendChild(document.createElement('br')); // 各寝顔を改行
        });
        pokemonListDiv.appendChild(pokemonCard);
    }
}

// 全体の進捗率を更新
function updateOverallProgress() {
    let totalFaces = 0;
    let discoveredFaces = 0;

    for (const pokemonName in pokemonSleepData) {
        pokemonSleepData[pokemonName].forEach(face => {
            totalFaces++;
            if (face.discovered) {
                discoveredFaces++;
            }
        });
    }

    const progressPercentage = totalFaces === 0 ? 0 : Math.round((discoveredFaces / totalFaces) * 100);
    overallProgressSpan.textContent = `${progressPercentage}%`;
    progressBarFill.style.width = `${progressPercentage}%`;
}

// --- イベントリスナー ---

saveButton.addEventListener('click', saveProgress);
resetButton.addEventListener('click', resetProgress);

// --- 初期化 ---

// ページ読み込み時にデータをロードし、リストをレンダリング
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    renderPokemonList();
    updateOverallProgress(); // 初回ロード時にも進捗率を更新
});