const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Readlineインターフェースを作成
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let loadingErr = 0; // 読み込みエラーカウンタ
const matchedFolder = []; // 一致したフォルダーを格納

// パスと mapper を入力
rl.question('パス: ', (inputPath) => {
    rl.question('mapper: ', (inputMapper) => {
        const basePath = path.resolve(inputPath.trim()); // 絶対パスに変換
        const targetMapper = inputMapper.trim(); // 入力された mapper 名

        if (!fs.existsSync(basePath)) {
            console.error('指定されたパスが存在しません。');
            rl.close();
            return;
        }

        if (!fs.lstatSync(basePath).isDirectory()) {
            console.error('指定されたパスはディレクトリではありません。');
            rl.close();
            return;
        }

        // Info.dat ファイルを探索して処理
        findInfoDatFiles(basePath, targetMapper);

        console.log("一致したフォルダー: ", matchedFolder.length);
        console.log("読み込みエラー: ", loadingErr);

        // フォルダ削除の確認を行う
        rl.question('これらの譜面を削除しますか？(実行:y, キャンセル:n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
                // 一致したフォルダを削除
                deleteMatchedFolders();
            } else {
                console.log('キャンセルされました。');
            }
            rl.question('終了するには何かキーを入力してください... ', (answer) => {
                rl.close();
            });
        });
    });
});

// 再帰的にディレクトリを探索して Info.dat ファイルを処理
function findInfoDatFiles(directory, targetMapper) {
    try {
        const entries = fs.readdirSync(directory, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                // サブディレクトリの場合、再帰的に探索
                findInfoDatFiles(fullPath, targetMapper);
            } else if (entry.isFile() && entry.name.toLowerCase() === 'info.dat') {
                // Info.dat ファイルを処理
                processInfoDat(fullPath, targetMapper, directory);
            }
        }
    } catch {
        loadingErr++; // エラーが発生した場合にカウント
    }
}

// Info.dat ファイルを読み込み、パースして譜面情報を出力
function processInfoDat(filePath, targetMapper, directory) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(data);

        // 譜面情報を取得
        const mapperName = jsonData._levelAuthorName || 'unknown';
        const songName = jsonData._songName || 'unknown';
        const songAuthorName = jsonData._songAuthorName || 'unknown';

        // mapperName がターゲットに一致する場合、フォルダーを記録
        if (mapperName === targetMapper) {
            matchedFolder.push(directory);
            console.log(`${songAuthorName} - ${songName} by ${mapperName}`);
        }

    } catch {
        loadingErr++; // エラーが発生した場合にカウント
    }
}

// 一致したフォルダーを削除
function deleteMatchedFolders() {
    matchedFolder.forEach((folderPath) => {
        try {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            entries.forEach((entry) => {
                const fullPath = path.join(folderPath, entry.name);
                if (entry.isDirectory()) {
                    // サブディレクトリの場合、再帰的に削除
                    deleteMatchedFoldersRecursive(fullPath);
                } else {
                    fs.unlinkSync(fullPath);
                }
            });
            fs.rmdirSync(folderPath);
            console.log(`フォルダー ${folderPath} を削除しました。`);
        } catch (error) {
            console.error(`フォルダー ${folderPath} の削除に失敗しました: ${error.message}`);
        }
    });
}

// サブディレクトリも含めて削除する
function deleteMatchedFoldersRecursive(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    entries.forEach((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            deleteMatchedFoldersRecursive(fullPath);
        } else {
            fs.unlinkSync(fullPath);
        }
    });
    fs.rmdirSync(directory);
}
