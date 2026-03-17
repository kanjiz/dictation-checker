/** 単一ショートカットキーの定義 */
export type ShortcutKey = {
  /** KeyboardEvent.key に対応する値（例: 'Enter', 'ArrowLeft'） */
  readonly key: string;
  /**
   * true のとき修飾キー（Mac: ⌘、Windows/Linux: Ctrl）が必要。
   * OS を問わず「修飾キーが必要かどうか」を表す。
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

/** デフォルト設定 */
export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  playPause:   { key: 'Enter',      modifier: true },
  seekBack:    { key: 'ArrowLeft',  modifier: true },
  seekForward: { key: 'ArrowRight', modifier: true },
  download:    { key: 's',          modifier: true },
} as const;
