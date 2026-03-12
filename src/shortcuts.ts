/** 単一ショートカットキーの定義 */
export type ShortcutKey = {
  /** KeyboardEvent.key に対応する値（例: 'Enter', 'ArrowLeft'） */
  readonly key: string;
  /** true のとき Ctrl キーが必要 */
  readonly ctrl: boolean;
};

/** アプリ全体のショートカット設定 */
export type ShortcutConfig = {
  readonly playPause:   ShortcutKey;
  readonly seekBack:    ShortcutKey;
  readonly seekForward: ShortcutKey;
  readonly download:    ShortcutKey;
};

/** デフォルト設定 */
export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  playPause:   { key: 'Enter',      ctrl: true },
  seekBack:    { key: 'ArrowLeft',  ctrl: true },
  seekForward: { key: 'ArrowRight', ctrl: true },
  download:    { key: 's',          ctrl: true },
} as const;
