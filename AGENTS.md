# AGENTS.md

このリポジトリは、Codex / Claude Code / ChatGPT などの開発AIが引き継いで作業する前提です。作業前に必ずこのファイルと `HANDOFF.md` を読んでください。

## プロジェクト概要

- 目的: 1週間の学習計画、今日やること、教材リスト、ISBN/バーコード教材追加、週の振り返り、Googleカレンダー予定、毎日通知を管理する静的Webアプリ。
- 公開URL: `https://michael-anderson-official.github.io/study-plan-app/`
- 使用技術: HTML / CSS / Vanilla JavaScript。ビルドツールやnpm依存は使わない。
- 主要ファイル: `index.html`。PWA/通知用に `manifest.json`、`sw.js`、Cloudflare Worker 用に `worker/worker.js`、`worker/wrangler.toml` がある。
- 保存: アプリ本体はブラウザの `localStorage`。通知購読はCloudflare KV。
- 公開: GitHub Pages の `main` ブランチ。

## 起動・ビルド・テスト

- 起動: ルートを静的HTTPサーバーで配信する。例: `python -m http.server 8765`
- ビルド: 不要。
- 構文確認: `index.html` 内の最終 `<script>` を抽出して `new Function(script)` で確認する。`worker/worker.js` はES moduleとしてimportできるか確認する。`manifest.json` はJSON parseする。
- 手動確認: PC幅とスマホ幅の両方で、教材追加、ISBN/バーコード教材追加、教材詳細保存、教材削除、週移動、今週へ、今日やること、週の振り返り、設定モーダル、バックアップ/復元を確認する。
- 通知確認: HTTPSの公開URLまたはlocalhostでService Worker登録を確認する。実push、iPhone PWA、Cron実行はCloudflare設定と実機が必要。

## コーディング方針

- 依存関係を増やさない。必要がなければ単一HTML中心の構成を維持する。ビルド不要のCDN読み込み（`<script src>`）に限り、明確な理由（ブラウザAPIの非対応を補うフォールバック等）がある場合のみ例外を許容する（例: Google Identity Services、`@zxing/library`）。npm/ビルドツール導入は不可。
- 既存の素朴なVanilla JSスタイルに合わせる。大きな抽象化やフレームワーク化は避ける。
- `localStorage` から読むJSONは `try/catch` と `Array.isArray` などで型を確認する。
- 既存データを壊す変更を避ける。保存キーを変える場合は移行処理を書く。
- 教材リスト、教材詳細、週ごとの記録、週の振り返りを勝手に削除しない。
- secretやprivate keyをコミットしない。VAPID private JWK、Cloudflare secrets、Google OAuth access tokenはリポジトリに置かない。

## 日付・週表示の注意

- 日本時間で使う前提。ブラウザ側の日付は `toLocalISO(date)` と `parseISOToDate(iso)` を使い、UTC由来の日付ずれを避ける。
- 週の開始日は `localStorage` の `weekStart` に保存する。値は `Date.getDay()` と同じ数値文字列（`'0'`=日〜`'6'`=土）。
- 古い `monday` / `sunday` 形式は `getWeekStartDay()` が読み込み時に数値へ移行する。
- `window.currentWeekStartISO` を基準に、表の行ラベル、各セルの `data-key`、週の振り返りキーを更新する。
- 今日ハイライトと今日やることはブラウザのローカル日付を `toLocalISO` で比較する。端末タイムゾーンが日本時間以外の場合は未検証。
- Googleカレンダー予定の作成は `timeZone: 'Asia/Tokyo'` を指定している。
- 祝日判定は `holidays2026` の固定セット。2027年以降は更新が必要。

## 通知・Worker・外部連携

- `NOTIFY_WORKER_URL` は `https://keikakuchou-notify.keikakuchou-app.workers.dev`。
- `VAPID_PUBLIC_KEY` は公開鍵なので `index.html` に置いてよい。秘密鍵はCloudflare Secret `VAPID_PRIVATE_JWK` に置く。
- Workerは `NOTIFY_KV`、`VAPID_PRIVATE_JWK`、`VAPID_PUBLIC_KEY`、`VAPID_SUBJECT`、Cron Trigger を必要とする。
- 現在のWorkerはKVキー `subscription` に1件だけ保存する設計。複数ユーザー/複数端末対応ではここを変更する。
- Google OAuth client IDは公開情報。access tokenは実行時に `localStorage` の `google-token` に短時間保存されるだけで、リポジトリに含めない。
- ISBN/バーコード教材追加はまずブラウザ標準の `BarcodeDetector` を試す。Safari等の非対応ブラウザでは、CDN読み込みの `@zxing/library`（`window.ZXing`）にフォールバックする。どちらも使えない環境ではISBN手入力を使う。書籍情報は openBD を先に見て、見つからない場合に Google Books の公開検索へフォールバックする。APIキーや秘密情報は使わない。
- 目次（目次／単位リスト）の自動取得は、openBD/Google Booksに構造化データが無いため、Worker側の `GET /toc?isbn=...` が版元ドットコム（hanmoto.com）のHTMLを取得・解析して返す（非公式スクレイピング、`worker/worker.js` の `handleToc`）。ブラウザは直接hanmoto.comへfetchしない（CORS拒否されるため）。教材詳細を開いたときにISBNがあり目次未入力なら `index.html` の `tryAutoFillToc()` がこのWorkerエンドポイントを呼ぶ。hanmoto.comのHTML構造変更に弱い点に注意する。

## UI確認時の注意

- カレンダー上部ヘッダーには教材名が入る。セル内に教材名を重複表示しない。
- 「一週間をリセット」ボタンは廃止済み。
- 教材削除は教材詳細パネル内の「削除」ボタンで行う。削除しても、カレンダーにすでに記入済みの予定は残る。
- バーコード追加後の教材詳細には書籍メタ情報が表示される。詳細保存や「毎日」で `isbn`、`bookTitle`、`authors`、`publisher`、`coverImage` などを消さない。
- 教材詳細保存や「毎日」は、その教材列の既存スケジュールセルを消して再割り当てする。手入力が消える可能性に注意する。
- 今日やることの「×」は、その日以降の連続予定を1日後ろ倒しにする。
