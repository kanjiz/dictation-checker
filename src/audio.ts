/**
 * @fileoverview 音声ファイル選択時の読み込みとエラー処理。
 */

/** 現在セット中の BlobURL。レースコンディション検出に使用する。 */
let currentBlobUrl = '';

/**
 * player に src をセットし、loadedmetadata または error の発火を待つ。
 * @param player - 操作対象の HTMLAudioElement
 * @param url    - セットする BlobURL
 */
function tryLoadAudio(player: HTMLAudioElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    player.addEventListener('loadedmetadata', () => resolve(), { once: true });
    player.addEventListener('error', () => reject(), { once: true });
    player.src = url;
    player.load();
  });
}

/**
 * ファイル選択時のロジック。成功時はエディタへフォーカス、失敗時はエラーを表示する。
 * @param file       - 選択されたファイル
 * @param player     - 操作対象の HTMLAudioElement
 * @param audioError - エラーメッセージ表示用の要素
 * @param editor     - フォーカス先のテキストエリア
 * @param announce   - スクリーンリーダー通知関数
 */
export async function handleAudioFile(
  file: File,
  player: HTMLAudioElement,
  audioError: HTMLElement,
  editor: HTMLTextAreaElement,
  announce: (message: string) => void,
): Promise<void> {
  // 0. エラー要素をリセット
  audioError.hidden = true;
  audioError.textContent = '';

  // 1. 旧 BlobURL を解放し、新しい URL を生成・記録
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
  }
  const url = URL.createObjectURL(file);
  currentBlobUrl = url;

  try {
    await tryLoadAudio(player, url);

    // レースコンディション：別ファイルが選択済みの場合は何もしない
    if (currentBlobUrl !== url) return;

    announce('音声を読み込みました。入力エリアに移動します。');
    editor.focus();
  } catch {
    if (currentBlobUrl !== url) return;

    URL.revokeObjectURL(url);
    currentBlobUrl = '';
    player.removeAttribute('src');
    player.load(); // 状態機械を NETWORK_EMPTY にリセット

    audioError.textContent = '再生できないファイルです';
    audioError.hidden = false;
  }
}
