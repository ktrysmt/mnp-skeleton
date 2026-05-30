# MNP skeleton

[English](./README.md) | 日本語

中間記法パターン(MNP)の使い回せるスケルトン。図の状態を外部のテキストファイル(`data/diagram.mnp`)として持ち、それを Claude Code が直接編集することで、APIキーなしに「AIと会話しながら図を編集する」体験を実現する。ランタイム依存ゼロ(Nodeの標準モジュールのみ)。

## UX

```
git clone <repo>
cd mnp-skeleton
npm start            # = node server.js（npm install 不要）
# → http://127.0.0.1:8777/ をブラウザで開く
```

- ブラウザでノードをドラッグ・追加・接続 → `/save` 経由で `data/diagram.mnp` に自動保存
- Claude Code に「`data/diagram.mnp` に配達員を追加して客と配送でつないで」と頼む → ファイルが書き換わり、ページが ~1.5秒で自動反映
- 右ペインの記法テキストを直接編集しても図に反映(双方向)

APIキーは不要。AIエンジンの役割は Claude Code が `data/diagram.mnp` を編集することで担う(同梱の `CLAUDE.md` がそのルールを定義)。

## データを外から差し込む

このスケルトンは「グラフ(ノード＋矢印)」の表現に特化している。以下の3つを書き換えるだけで、別ドメインに転用できる(JavaScriptの編集は不要)。

| ファイル | 役割 |
|---|---|
| `data/diagram.mnp` | データ実体。初期状態をここに書く |
| `domain/schema.js` | ノードの色・アイコン・属性、矢印の種類、タイトル、データファイルのパス |
| `domain/NOTATION.md` | 記法仕様と設計規約(=Claude Codeが従うルール) |

グラフで表せない題材(カンバン・フォーム等)は `engine.js` の `render`/`parse`/`serialize` を差し替える必要がある。

## 構成

```
mnp-skeleton/
  README.md          英語(既定)
  README-ja.md       日本語
  CLAUDE.md          Claude Code への編集ルール
  package.json       start: node server.js（依存ゼロ）
  server.js          静的配信 ＋ POST /save（ドラッグ結果をファイルへ書き戻す）
  index.html         画面
  engine.js          ドメイン非依存エンジン（parse/serialize/render/drag/sync/poll/save）
  domain/
    schema.js        ← ドメイン設定（編集する）
    NOTATION.md      ← 記法仕様・規約（編集する）
  data/
    diagram.mnp      ← データ（編集する / Claudeが編集する）
```

## 仕組み(MNPの同期ループ)

```
data/diagram.mnp ──poll(1.5s)──▶ parse ──▶ render(SVG)
       ▲                                        │
       └────── POST /save ◀── serialize ◀── ドラッグ/記法編集
       ▲
       └────── Claude Code がファイルを編集
```

AIが扱うのは軽量なテキスト記法のみで、描画はローカル(ブラウザのJS)が担う。これによりAI出力が小さく保たれる(MNPの速度・コスト優位の根拠)。

## 設定

- ポート: `PORT=9000 npm start`(既定 8777)
- バインド先: `HOST=0.0.0.0 npm start`(既定 127.0.0.1)

## クレジット

「中間記法パターン(MNP / Mid Notation Pattern)」は、アプリの状態をAIが読み書きしやすいテキスト記法(DSL)で持ち双方向に同期させる、という設計パターンの名称。このリポジトリはその考え方の実装スケルトンである。

## ライセンス

MIT License. See [LICENSE](./LICENSE).
