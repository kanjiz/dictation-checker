/** 単一ショートカットキーの定義 */
export type ShortcutKey = {
  /** KeyboardEvent.key に対応する値（例: 'Enter', 'ArrowLeft'） */
  readonly key: string;
  /**
   * true のとき修飾キー（Mac: ⌘、Windows/Linux: Ctrl）が必要。
   */
  readonly modifier: boolean;
};

/** アプリ全体のショートカット設定 */
export type ShortcutConfig = {
  readonly playPause:   ShortcutKey;
  readonly seekBack:    ShortcutKey;
  readonly seekForward: ShortcutKey;
  readonly download:    ShortcutKey;
};

/** seek 秒数設定 */
export type SeekConfig = {
  readonly backSeconds:    number;
  readonly forwardSeconds: number;
};

/** アプリ全体の設定 */
export type Settings = {
  readonly shortcuts: ShortcutConfig;
  readonly seek:      SeekConfig;
};

/** デフォルト設定 */
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
