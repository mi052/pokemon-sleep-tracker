// c:\Users\furui\OneDrive\ドキュメント\pokemon-sleep-tracker\pokemon-sleep-tracker\script.js

// --- グローバル変数・定数 ---
// pokemonSleepData は、外部JSONからロードされたマスターデータと、
// localStorageからロードされたユーザーの進捗をマージして構築されます。
// { pokemonName: { pokedex_no: "XXX", sleep_type: "睡眠タイプ名", sleep_faces: [ { name: "寝顔名", id: "unique_id", fields: [], discovered: boolean }, ... ] } }
// のような構造を想定しています。
let pokemonSleepData = {};

const LOCAL_STORAGE_KEY = 'pokemonSleepProgress';
const MAX_SLEEP_FACES_COLUMNS = 4; // テーブルに表示する寝顔の最大列数

const FIELD_DISPLAY_ORDER = [
    "ワカクサ本島",
    "シアンの砂浜",
    "トープ洞窟",
    "ウノハナ雪原",
    "ラピスラズリ湖畔",
    "ゴールド旧発電所"
];

// --- DOM要素 ---
const overallProgressDiv = document.getElementById('overall-progress');
// const loadButton = document.getElementById('load-button'); // 削除
// const saveButton = document.getElementById('save-button'); // 削除
// const resetButton = document.getElementById('reset-button'); // 削除
const settingsButton = document.getElementById('settings-button');
const settingsDropdown = document.getElementById('settings-dropdown');
const checkAllButtonMenu = document.getElementById('check-all-button-menu');
const uncheckAllButtonMenu = document.getElementById('uncheck-all-button-menu');
const exportProgressButton = document.getElementById('export-progress-button');
const importProgressInput = document.getElementById('import-progress-input');
// const importProgressLabel = document.getElementById('import-progress-label'); // HTML側でlabelにfor属性があるので、inputだけで十分
const allFieldsProgressDiv = document.getElementById('all-fields-progress');
// 新しいテーブルボディへの参照
const utoutoTableBody = document.getElementById('utouto-table-body');
const suyasuyaTableBody = document.getElementById('suyasuya-table-body');
const gussuriTableBody = document.getElementById('gussuri-table-body');
const dittoSleepFacesContainer = document.getElementById('ditto-sleep-faces-container');


// --- データ初期化・処理関数 ---

/**
 * マスターポケモンデータをJSONファイルから非同期でロードします。
 */
async function loadMasterData() {
    try {
        const response = await fetch('pokemon_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const masterData = await response.json();
        console.log('マスターデータをロードしました。');
        return masterData;
    } catch (error) {
        console.error('マスターデータのロードに失敗しました:', error);
        // エラー表示はメインのポケモンリストエリアではなく、別の場所に表示するか、コンソールのみにする
        // if (utoutoTableBody) { // いずれかのテーブルボディがあればそこにエラー表示する例
        //     utoutoTableBody.innerHTML = '<tr><td colspan="6" style="color: red;">寝顔データの読み込みに失敗しました。pokemon_data.json を確認してください。</td></tr>';
        // }
        return null; // エラー時はnullを返す
    }
}

/**
 * ロードしたマスターデータに基づいて、トラッキング用のpokemonSleepDataを初期構築します。
 * 各寝顔の discovered ステータスは false に初期化されます。
 */
function buildInitialSleepData(masterData) {
    let initialData = {};
    if (!masterData) return initialData;

    for (const pokemonName in masterData) {
        if (masterData[pokemonName] && masterData[pokemonName].sleep_faces && Array.isArray(masterData[pokemonName].sleep_faces)) {
            initialData[pokemonName] = {
                pokedex_no: masterData[pokemonName].pokedex_no || "---",
                sleep_type: masterData[pokemonName].sleep_type || "不明",
                sleep_faces: masterData[pokemonName].sleep_faces.map(face => ({
                    name: face.name,
                    id: face.id || face.name,
                    fields: face.fields || [],
                    discovered: false,
                    isLimited: (face.fields && face.fields.length === 1) // 限定寝顔かどうかを判定
                }))
            };
        } else {
            console.warn(`マスターデータにポケモン '${pokemonName}' の sleep_faces が見つからないか、形式が不正です。スキップします。`);
        }
    }
    return initialData;
}

/**
 * ローカルストレージから進捗をロードし、現在のpokemonSleepDataにマージします。
 */
function loadProgress() {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
        const loadedUserProgress = JSON.parse(savedData);
        mergeUserProgress(loadedUserProgress);
    } else {
        console.log('保存されたデータがありません。');
    }
}

/**
 * ユーザーの保存済み進捗を、初期化されたpokemonSleepDataにマージします。
 * @param {object} loadedUserProgress - ローカルストレージから読み込まれたユーザーの進捗データ
 */
function mergeUserProgress(loadedUserProgress) {
    for (const pokemonName in pokemonSleepData) {
        if (pokemonSleepData[pokemonName] && pokemonSleepData[pokemonName].sleep_faces &&
            loadedUserProgress[pokemonName] &&
            Array.isArray(loadedUserProgress[pokemonName].sleep_faces)) {

            pokemonSleepData[pokemonName].sleep_faces.forEach(currentFace => {
                const savedFace = loadedUserProgress[pokemonName].sleep_faces.find(
                    sf => (sf.id && sf.id === currentFace.id) || sf.name === currentFace.name
                );
                if (savedFace && typeof savedFace.discovered === 'boolean') {
                    currentFace.discovered = savedFace.discovered;
                }
            });
        }
    }
    console.log('ユーザー進捗をマージしました。');
}

/**
 * 現在の進捗(pokemonSleepData全体)をローカルストレージに保存します。
 */
function saveProgress() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pokemonSleepData));
        // 自動保存なので、毎回アラートを出すと煩わしい可能性があるためコメントアウト
        // console.log('進捗を自動保存しました。'); // コンソールログで確認できるようにするのも良い
    } catch (e) {
        console.error('ローカルストレージへの保存に失敗しました:', e);
        alert('リサーチ記録の自動保存に失敗しました。ディスク容量などを確認してください。');
    }
}

// function resetProgress() { // ボタン自体を削除したので、この関数も一旦コメントアウト（または削除）
//     if (confirm('本当に全ての進捗をリセットしますか？この操作は元に戻せません。')) {
//         for (const pokemonName in pokemonSleepData) {
//             if (pokemonSleepData[pokemonName] && pokemonSleepData[pokemonName].sleep_faces) {
//                 pokemonSleepData[pokemonName].sleep_faces.forEach(sleepFace => {
//                     sleepFace.discovered = false;
//                 });
//             }
//         }
//         saveProgress();
//         renderPokemonList();
//         updateOverallProgress();
//         updateAllFieldsProgress();
//         alert('進捗をリセットしました。');
//     }
// }

/**
 * 全ての寝顔にチェックを入れる（発見済みにする）
 */
function checkAllFaces() {
    if (confirm('本当に全ての寝顔にチェックを入れますか？')) {
        for (const pokemonName in pokemonSleepData) {
            if (pokemonSleepData[pokemonName] && pokemonSleepData[pokemonName].sleep_faces) {
                pokemonSleepData[pokemonName].sleep_faces.forEach(sleepFace => {
                    sleepFace.discovered = true;
                });
            }
        }
        saveProgress();
        renderPokemonList();
        updateOverallProgress();
        updateAllFieldsProgress();
        alert('全ての寝顔にチェックを入れました。');
    }
}

/**
 * 全ての寝顔のチェックを外す（未発見にする）
 */
function uncheckAllFaces() {
    if (confirm('本当に全ての寝顔のチェックを外しますか？')) {
        // resetProgressの主要なロジックをここに展開（resetProgress関数自体は削除したため）
        for (const pokemonName in pokemonSleepData) {
            if (pokemonSleepData[pokemonName] && pokemonSleepData[pokemonName].sleep_faces) {
                pokemonSleepData[pokemonName].sleep_faces.forEach(sleepFace => {
                    sleepFace.discovered = false;
                });
            }
        }
        saveProgress();
        renderPokemonList();
        updateOverallProgress();
        updateAllFieldsProgress();
        alert('全ての寝顔のチェックを外しました。');
    }
}

/**
 * 全てのフィールドのリサーチ率を計算し、表示を更新します。
 */
function updateAllFieldsProgress() {
    if (!allFieldsProgressDiv) return;
    allFieldsProgressDiv.innerHTML = ''; // 表示をクリア

    const availableFieldsInOrder = FIELD_DISPLAY_ORDER.filter(fieldOrderName =>
        Object.values(pokemonSleepData).some(p =>
            p.sleep_faces && p.sleep_faces.some(sf => sf.fields && sf.fields.includes(fieldOrderName))
        )
    );

    availableFieldsInOrder.forEach(field => {
        let totalFieldFaces = 0;
        let discoveredFieldFaces = 0;
        let unresearchedLimitedFaces = 0; // 未リサーチの限定寝顔数をカウントする変数

        for (const pokemonName in pokemonSleepData) {
            const pokemonEntry = pokemonSleepData[pokemonName];
            if (pokemonEntry && Array.isArray(pokemonEntry.sleep_faces)) {
                pokemonEntry.sleep_faces.forEach(face => {
                    if (Array.isArray(face.fields) && face.fields.includes(field)) {
                        totalFieldFaces++;
                        if (face.discovered) {
                            discoveredFieldFaces++;
                        }
                        // 限定寝顔で、かつ未リサーチの場合にカウント
                        if (face.isLimited && !face.discovered) {
                            unresearchedLimitedFaces++;
                        }
                    }
                });
            }
        }

        const progressPercentage = totalFieldFaces > 0 ? (discoveredFieldFaces / totalFieldFaces) * 100 : 0;

        const fieldProgressItem = document.createElement('div');
        fieldProgressItem.classList.add('field-progress-item');
        let progressText = `${field} ${progressPercentage.toFixed(1)}%`;
        // 未リサーチ限定寝顔の数を括弧で表示（0の場合も表示）
        progressText += ` ( ${unresearchedLimitedFaces} )`;
        fieldProgressItem.textContent = progressText;
        allFieldsProgressDiv.appendChild(fieldProgressItem);
    });

    if (availableFieldsInOrder.length === 0 && Object.keys(pokemonSleepData).length > 0) { // データはあるが該当フィールドがない場合
        allFieldsProgressDiv.textContent = '表示対象のフィールド情報がありません。';
    }
}


// --- UI描画関数 ---

/**
 * ポケモンリストを睡眠タイプ別に各テーブルに描画します。
 */
function renderPokemonList() {
    // 各テーブルボディの存在を確認
    if (!utoutoTableBody || !suyasuyaTableBody || !gussuriTableBody) {
        console.error("必要なテーブルボディ要素が見つかりません。");
        return;
    }

    // 各テーブルボディをクリア
    utoutoTableBody.innerHTML = '';
    suyasuyaTableBody.innerHTML = '';
    gussuriTableBody.innerHTML = '';

    // ヘッダーセルのテキスト寄せを更新
    const tableIds = ['utouto-pokemon-table', 'suyasuya-pokemon-table', 'gussuri-pokemon-table'];
    tableIds.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            const headerCells = table.querySelectorAll('thead th');
            headerCells.forEach((th, index) => {
                // 寝顔1以降のヘッダーセル (インデックス2から)
                if (index >= 2) {
                    th.classList.add('cell-content-center-aligned');
                    th.classList.remove('cell-content-left-aligned'); //念のため削除
                } else {
                    th.classList.remove('cell-content-left-aligned', 'cell-content-center-aligned');
                }
            });
        }
    });
    const sleepTypeOrder = ["うとうと", "すやすや", "ぐっすり"];
    const tableBodyMap = {
        "うとうと": utoutoTableBody,
        "すやすや": suyasuyaTableBody,
        "ぐっすり": gussuriTableBody
    };

    for (const currentSleepType of sleepTypeOrder) {
        const targetTableBody = tableBodyMap[currentSleepType];
        if (!targetTableBody) continue;

        // 前の行の寝顔セルの情報を保持する配列 (各テーブルタイプごとにリセット)
        let prevRowSleepFaceCellsData = Array(MAX_SLEEP_FACES_COLUMNS).fill(null).map(() => ({
            tdElement: null,
            isLimited: false,
            pokemonSleepType: ''
        }));

        // 1. 現在の睡眠タイプのポケモンをフィルタリング
        const pokemonOfThisType = [];
        for (const pokemonName in pokemonSleepData) {
            if (pokemonSleepData[pokemonName].sleep_type === currentSleepType) {
                pokemonOfThisType.push({
                    name: pokemonName,
                    data: pokemonSleepData[pokemonName]
                });
            }
        }

        // 2. 図鑑No.でソート (数値として比較)
        pokemonOfThisType.sort((a, b) => {
            const numA = parseInt(a.data.pokedex_no, 10) || 99999; // "---" や空文字は大きな数値として扱う
            const numB = parseInt(b.data.pokedex_no, 10) || 99999;
            return numA - numB;
        });

        // 3. ソートされたポケモンを描画
        for (const pokemonItem of pokemonOfThisType) {
            const pokemonName = pokemonItem.name;
            const pokemonEntry = pokemonItem.data; // 元の pokemonSleepData[pokemonName] と同じ構造

            if (pokemonName === "メタモン") {
                continue; // メタモンは専用のテーブルで描画するためスキップ
            }

            const currentRowSleepFaceCellsData = Array(MAX_SLEEP_FACES_COLUMNS).fill(null).map(() => ({
                tdElement: null,
                isLimited: false,
                pokemonSleepType: ''
            }));

            const tr = document.createElement('tr');

            const tdPokedexNo = document.createElement('td');
            tdPokedexNo.textContent = pokemonEntry.pokedex_no || "---";
            tr.appendChild(tdPokedexNo);

            const tdPokemonName = document.createElement('td');
            tdPokemonName.textContent = pokemonName;
            tr.appendChild(tdPokemonName);

            const sleepFaces = pokemonEntry.sleep_faces;
            for (let i = 1; i <= MAX_SLEEP_FACES_COLUMNS; i++) {
                const columnIndex = i - 1;
                const tdSleepFace = document.createElement('td');
                const targetFaceName = `寝顔${i}`;
                const face = sleepFaces.find(f => f.name === targetFaceName);
                
                let currentCellIsLimited = false;
                // const currentPokemonSleepType = pokemonEntry.sleep_type; // これはループの外の currentSleepType と同じはず

                if (face) {
                    const uniqueIdSuffix = face.id ? face.id.replace(/\s+/g, '_') : `${pokemonName.replace(/\s+/g, '-')}-${face.name.replace('寝顔','')}`;
                    const checkboxId = `face-${uniqueIdSuffix}`;

                    const label = document.createElement('label');
                    label.htmlFor = checkboxId;

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = checkboxId;
                    checkbox.classList.add('sleep-face-checkbox');
                    checkbox.checked = face.discovered;
                    checkbox.dataset.pokemon = pokemonName;
                    checkbox.dataset.faceId = face.id;

                    checkbox.addEventListener('change', handleCheckboxChange);

                    label.appendChild(checkbox);

                    tdSleepFace.appendChild(label);

                    // セルの内容の配置クラスを設定
                    tdSleepFace.classList.add('cell-content-center-aligned');
                    tdSleepFace.classList.remove('cell-content-left-aligned'); //念のため削除


                    // 限定寝顔の基本クラスと横方向の連結処理
                    if (face.isLimited) {
                        currentCellIsLimited = true;
                        tdSleepFace.classList.add('limited-sleep-face-cell');
                        if (pokemonEntry.sleep_type === "うとうと") tdSleepFace.classList.add('utouto-limited-cell');
                        else if (pokemonEntry.sleep_type === "すやすや") tdSleepFace.classList.add('suyasuya-limited-cell');
                        else if (pokemonEntry.sleep_type === "ぐっすり") tdSleepFace.classList.add('gussuri-limited-cell');

                        // 左隣の寝顔も限定かチェック (横方向)
                        if (columnIndex > 0) {
                            const prevFaceName = `寝顔${i - 1}`;
                            const prevFace = sleepFaces.find(f => f.name === prevFaceName);
                            if (prevFace && prevFace.isLimited) {
                                tdSleepFace.classList.add('limited-cell-no-left-border');
                            }
                        }
                        // 右隣の寝顔も限定かチェック (横方向)
                        if (columnIndex < MAX_SLEEP_FACES_COLUMNS - 1) {
                            const nextFaceName = `寝顔${i + 1}`;
                            const nextFace = sleepFaces.find(f => f.name === nextFaceName);
                            if (nextFace && nextFace.isLimited) {
                                tdSleepFace.classList.add('limited-cell-no-right-border');
                            }
                        }
                    }
                } else {
                    tdSleepFace.textContent = '-';
                    tdSleepFace.classList.add('cell-content-center-aligned');
                    tdSleepFace.classList.remove('cell-content-left-aligned'); //念のため削除
                }

                // 縦方向の連結処理
                if (currentCellIsLimited) {
                    const cellAboveData = prevRowSleepFaceCellsData[columnIndex];
                    // pokemonEntry.sleep_type を使う (currentPokemonSleepType はこのループ内で定義されていない)
                    if (cellAboveData && cellAboveData.isLimited && cellAboveData.pokemonSleepType === pokemonEntry.sleep_type) {
                        tdSleepFace.classList.add('limited-cell-no-top-border');
                        if (cellAboveData.tdElement) {
                            cellAboveData.tdElement.classList.add('limited-cell-no-bottom-border');
                        }
                    }
                }
                
                currentRowSleepFaceCellsData[columnIndex] = {
                    tdElement: tdSleepFace,
                    isLimited: currentCellIsLimited,
                    pokemonSleepType: pokemonEntry.sleep_type // ここも pokemonEntry.sleep_type を使う
                };
                tr.appendChild(tdSleepFace);
            }
            targetTableBody.appendChild(tr);
            prevRowSleepFaceCellsData = currentRowSleepFaceCellsData; // 現在の行の情報を次の行のために保存
        }
    }
}

/**
 * 寝顔チェックボックスの変更イベントを処理します。
 * @param {Event} event - changeイベントオブジェクト
 */
function handleCheckboxChange(event) {
    const targetPokemonName = event.target.dataset.pokemon;
    const targetFaceId = event.target.dataset.faceId;
    const targetPokemonEntryFromData = pokemonSleepData[targetPokemonName];
    if (targetPokemonEntryFromData && targetPokemonEntryFromData.sleep_faces) {
        const targetFaceToUpdate = targetPokemonEntryFromData.sleep_faces.find(f => f.id === targetFaceId);
        if (targetFaceToUpdate) {
            targetFaceToUpdate.discovered = event.target.checked;
            updateOverallProgress();
            saveProgress();
            updateAllFieldsProgress();
        }
    }
}

/**
 * メタモン専用の寝顔チェックボックスを描画します。
 */
function renderDittoTable() {
    if (!dittoSleepFacesContainer) {
        console.error("メタモン用のコンテナ要素が見つかりません。");
        return;
    }
    const dittoData = pokemonSleepData["メタモン"];
    const DITTO_NAME = "メタモン"; // メタモンの名前を定数化

    if (!dittoData) {
        console.warn("メタモンのデータが見つかりません。メタモンテーブルは描画されません。");
        dittoSleepFacesContainer.innerHTML = '<p>メタモンのデータがありません。</p>';
        return;
    }

    dittoSleepFacesContainer.innerHTML = ''; // Clear previous content

    // メタモン情報表示要素を作成
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('ditto-info-item'); // 新しいスタイルを適用するため

    const pokedexNoSpan = document.createElement('span');
    pokedexNoSpan.textContent = `図鑑No.${dittoData.pokedex_no || '---'}`;
    pokedexNoSpan.classList.add('ditto-pokedex-no');

    const sleepTypeSpan = document.createElement('span');
    sleepTypeSpan.textContent = dittoData.sleep_type || '不明';
    sleepTypeSpan.classList.add('ditto-sleep-type');
    if (dittoData.sleep_type === 'すやすや') { // テーマカラー適用
        sleepTypeSpan.classList.add('suyasuya-theme-text');
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = DITTO_NAME;
    nameSpan.classList.add('ditto-name');

    // 「図鑑No.XXX メタモン すやすや」の順で追加
    infoDiv.append(pokedexNoSpan, document.createTextNode(' '), nameSpan, document.createTextNode(' '), sleepTypeSpan);
    dittoSleepFacesContainer.appendChild(infoDiv); // 最初に情報表示を追加

    // チェックボックス群をラップするコンテナを作成
    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.classList.add('ditto-face-item-wrapper');

    const DITTO_MAX_FACES = 12; // メタモンの寝顔は12まであると仮定

    for (let i = 1; i <= DITTO_MAX_FACES; i++) {
        const targetFaceName = `寝顔${i}`;
        const face = dittoData.sleep_faces.find(f => f.name === targetFaceName);

        if (!face) { // データに存在しない寝顔番号はスキップ
            continue;
        }

        const faceItemDiv = document.createElement('div');
        faceItemDiv.classList.add('ditto-face-item');

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('sleep-face-checkbox'); // 既存のスタイルを再利用

        const checkboxId = `face-ditto-${face.id || i}`; // IDを確実にユニークに
        label.htmlFor = checkboxId;
        checkbox.id = checkboxId;
        checkbox.checked = face.discovered;
        checkbox.dataset.pokemon = DITTO_NAME;
        checkbox.dataset.faceId = face.id;

        checkbox.addEventListener('change', handleCheckboxChange);
        faceItemDiv.appendChild(label);
        checkboxWrapper.appendChild(faceItemDiv); // チェックボックスアイテムをラッパーに追加

        // ラベルにチェックボックスと寝顔番号を追加
        label.appendChild(checkbox);
        const faceNumberSpan = document.createElement('span');
        faceNumberSpan.classList.add('ditto-face-number');
        faceNumberSpan.textContent = ` ${i}`;
        label.appendChild(faceNumberSpan);
    }

    if (checkboxWrapper.hasChildNodes()) { // チェックボックスが1つでもあればラッパーをコンテナに追加
        dittoSleepFacesContainer.appendChild(checkboxWrapper);
    }
}

if (exportProgressButton) {
    exportProgressButton.addEventListener('click', handleExportProgress);
}

if (importProgressInput) {
    importProgressInput.addEventListener('change', handleImportProgress);
}

/**
 * 現在のリサーチ記録をJSONファイルとしてエクスポートします。
 */
function handleExportProgress() {
    const progressToExport = {};
    for (const pokemonName in pokemonSleepData) {
        if (pokemonSleepData.hasOwnProperty(pokemonName)) {
            const pokemonEntry = pokemonSleepData[pokemonName];
            if (pokemonEntry.sleep_faces && Array.isArray(pokemonEntry.sleep_faces)) {
                pokemonEntry.sleep_faces.forEach(face => {
                    if (face.id) { // face.id が存在することを確認
                        progressToExport[face.id] = face.discovered;
                    }
                });
            }
        }
    }

    const jsonString = JSON.stringify(progressToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pokemon_sleep_tracker_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (settingsDropdown) settingsDropdown.classList.add('hidden'); // エクスポート後にメニューを閉じる
    alert('バックアップファイルをエクスポートしました。');
}

/**
 * 選択されたJSONファイルからインポートをします。
 * @param {Event} event - ファイル入力のchangeイベント
 */
function handleImportProgress(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedProgress = JSON.parse(e.target.result);
            let facesUpdatedCount = 0;
            for (const pokemonName in pokemonSleepData) {
                if (pokemonSleepData.hasOwnProperty(pokemonName)) {
                    const pokemonEntry = pokemonSleepData[pokemonName];
                    if (pokemonEntry.sleep_faces && Array.isArray(pokemonEntry.sleep_faces)) {
                        pokemonEntry.sleep_faces.forEach(face => {
                            if (face.id && importedProgress.hasOwnProperty(face.id)) {
                                if (typeof importedProgress[face.id] === 'boolean') { // 値がbooleanであることを確認
                                    face.discovered = importedProgress[face.id];
                                    facesUpdatedCount++;
                                }
                            }
                        });
                    }
                }
            }
            saveProgress(); // localStorageに進捗を保存
            renderAllUI();    // 表示をすべて更新 (新しいヘルパー関数)
            alert(`${facesUpdatedCount} 件の寝顔情報をインポートし、更新しました。`);
        } catch (error) {
            console.error('バックアップファイルのインポートに失敗しました:', error);
            alert('バックアップファイルの読み込みまたは解析に失敗しました。\nファイルが正しいJSON形式（寝顔ID: 発見状況(true/false)）であることを確認してください。');
        } finally {
            if (settingsDropdown) settingsDropdown.classList.add('hidden'); // 後にメニューを閉じる
            if (importProgressInput) importProgressInput.value = ''; // ファイル選択をリセットして同じファイルを再選択可能にする
        }
    };
    reader.readAsText(file);
}

/**
 * 全体の進捗率を計算し、表示を更新します。
 */
function updateOverallProgress() {
    if (!overallProgressDiv) return;
    let totalFaces = 0;
    let discoveredFaces = 0;

    for (const pokemonName in pokemonSleepData) {
        const pokemonEntry = pokemonSleepData[pokemonName];
        if (pokemonEntry && Array.isArray(pokemonEntry.sleep_faces)) {
            pokemonEntry.sleep_faces.forEach(sleepFace => {
                totalFaces++;
                if (sleepFace.discovered) {
                    discoveredFaces++;
                }
            });
        }
    }

    const progressPercentage = totalFaces > 0 ? (discoveredFaces / totalFaces) * 100 : 0;
    overallProgressDiv.textContent = `全体 ${progressPercentage.toFixed(1)}% ( ${discoveredFaces} / ${totalFaces} )`;
}

// --- イベントリスナー ---
// saveButton のイベントリスナーは削除 (ボタン自体を削除したため)
// loadButton のイベントリスナーは削除 (ボタン自体を削除したため)

// if (resetButton) resetButton.addEventListener('click', resetProgress); // 削除
if (checkAllButtonMenu) checkAllButtonMenu.addEventListener('click', () => {
    checkAllFaces();
    if (settingsDropdown) settingsDropdown.classList.add('hidden'); // メニューを閉じる
});
if (uncheckAllButtonMenu) uncheckAllButtonMenu.addEventListener('click', () => {
    uncheckAllFaces();
    if (settingsDropdown) settingsDropdown.classList.add('hidden'); // メニューを閉じる
});

if (settingsButton && settingsDropdown) {
    settingsButton.addEventListener('click', (event) => {
        event.stopPropagation(); // 親要素へのイベント伝播を止める
        settingsDropdown.classList.toggle('hidden');
    });

    // ドキュメント全体をクリックしたらドロップダウンを閉じる（メニュー自体をクリックした場合は閉じない）
    document.addEventListener('click', (event) => {
        if (settingsDropdown && !settingsDropdown.classList.contains('hidden') && !settingsDropdown.contains(event.target) && event.target !== settingsButton) {
            settingsDropdown.classList.add('hidden');
        }
    });
}

/**
 * UIの主要な描画処理と進捗更新をまとめて行うヘルパー関数
 */
function renderAllUI() {
    renderPokemonList();
    renderDittoTable();
    updateAllFieldsProgress();
    updateOverallProgress();
}

// --- 初期化処理 ---
/**
 * アプリケーションの初期化処理
 */
async function initializeApp() {
    const masterData = await loadMasterData();
    if (!masterData || Object.keys(masterData).length === 0) { // masterDataがnullまたは空の場合
        // マスターデータがロードできなかった場合、適切なエラーメッセージを表示するか、
        // アプリケーションの初期化をここで中断するなどの処理が必要
        if (utoutoTableBody || suyasuyaTableBody || gussuriTableBody) { // いずれかのテーブルボディがあればそこにエラー表示する例
             const errorMsg = '<tr><td colspan="6" style="color: red; text-align: center;">ポケモンデータの読み込みに失敗しました。<br>pokemon_data.json を確認してページを再読み込みしてください。</td></tr>';
             if (utoutoTableBody) utoutoTableBody.innerHTML = errorMsg;
             if (suyasuyaTableBody) suyasuyaTableBody.innerHTML = errorMsg;
             if (gussuriTableBody) gussuriTableBody.innerHTML = errorMsg;
        }
        console.error("マスターデータのロードに失敗したため、アプリケーションの初期化を中断します。");
        return;
    }

    pokemonSleepData = buildInitialSleepData(masterData);
    loadProgress();
    renderAllUI(); // UI描画をヘルパー関数で実行

    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
