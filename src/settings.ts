/** 単一ショートカットキーの定義 */
export type ShortcutKey = {
  /** KeyboardEvent.key に対応する値（例: 'Enter', 'ArrowLeft'） */
  readonly key: string;
  /**
   * true のとき修飾キー（Mac: ⌘、Windows/Linux: Ctrl）が必要。
   */
  readonly modifier: boolean;
};

/**
 * ショートカットキーで操作できるアクションの定義。
 * 新しいショートカット操作を追加する場合はここにプロパティを追加する。
 */
export type ShortcutConfig = {
  /** 再生・一時停止のショートカット */
  readonly playPause:   ShortcutKey;
  /** 巻き戻しのショートカット */
  readonly seekBack:    ShortcutKey;
  /** 早送りのショートカット */
  readonly seekForward: ShortcutKey;
  /** テキストダウンロードのショートカット */
  readonly download:    ShortcutKey;
};

/** seek 操作（巻き戻し・早送り）の移動秒数設定 */
export type SeekConfig = {
  /** 巻き戻し時の移動秒数 */
  readonly backSeconds:    number;
  /** 早送り時の移動秒数 */
  readonly forwardSeconds: number;
};

/** アプリ全体の設定。localStorage への保存・読み込みおよび import/export はこのデータ構造をまとめて扱う。 */
export type Settings = {
  /** ショートカット設定。{@link ShortcutConfig} を参照。 */
  readonly shortcuts: ShortcutConfig;
  /** seek 秒数設定。{@link SeekConfig} を参照。 */
  readonly seek:      SeekConfig;
};

/** 初期値・リセット値、および読み込みエラー時のフォールバックとして使用するデフォルト設定 */
export const DEFAULT_SETTINGS: Settings = {
  shortcuts: {
    playPause:   { key: 'Enter',      modifier: true },
    seekBack:    { key: 'ArrowLeft',  modifier: true },
    seekForward: { key: 'ArrowRight', modifier: true },
    download:    { key: 's',          modifier: true },
  },
  seek: {
    backSeconds:    10,
    forwardSeconds: 10,
  },
} as const;
