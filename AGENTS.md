# AGENTS.md

このリポジトリは、Codex / Claude Code / ChatGPT などの開発AIが引き継いで作業する前提です。作業前に必ずこのファイルと `HANDOFF.md` を読んでください。

## プロジェクト概要

- 目的: 1週間の学習計画、教材リスト、ISBN/バーコード教材追加、週の振り返り、Googleカレンダー予定、毎日通知を管理する静的Webアプリ。将来的にAppStoreで公開配信することを見据えており、そのための土台としてFirebaseによるアカウント同期を導入済み（詳細は「アカウント同期（Firebase）」節を参照）。2026-07-08、「今日やること」「Googleカレンダー」の各タブは廃止し、1週間タブ1本（日付タップで開く日別詳細パネル）＋右上の通知ベル（○✕未チェックの過去分）に統合した。
- 公開URL: `https://michael-anderson-official.github.io/study-plan-app/`
- 使用技術: HTML / CSS / Vanilla JavaScript。ビルドツールやnpm依存は使わない。
- 主要ファイル: `index.html`。PWA/通知用に `manifest.json`、`sw.js`、Cloudflare Worker 用に `worker/worker.js`、`worker/wrangler.toml` がある。
- 保存: アプリ本体はブラウザの `localStorage`（サインインなしでも今まで通り完全に動作する）。サインインするとFirestoreにも同期される。通知購読はCloudflare KV。
- 公開: GitHub Pages の `main` ブランチ。

## 起動・ビルド・テスト

- 起動: ルートを静的HTTPサーバーで配信する。例: `python -m http.server 8765`
- ビルド: 不要。
- 構文確認: `index.html` 内の最終 `<script>` を抽出して `new Function(script)` で確認する。`worker/worker.js` はES moduleとしてimportできるか確認する。`manifest.json` はJSON parseする。
- 手動確認: PC幅とスマホ幅の両方で、教材追加、ISBN/バーコード教材追加、教材詳細保存、教材削除、週移動、今週へ、日別詳細パネル（日付タップ）、通知ベル（○✕未チェックの過去分）、週の振り返り、設定モーダル（アカウント同期・Googleカレンダー連携・バックアップ/復元）を確認する。
- 通知確認: HTTPSの公開URLまたはlocalhostでService Worker登録を確認する。実push、iPhone PWA、Cron実行はCloudflare設定と実機が必要。

## コーディング方針

- 依存関係を増やさない。必要がなければ単一HTML中心の構成を維持する。ビルド不要のCDN読み込み（`<script src>`または`<script type="module">`によるバージョン固定importのみ）に限り、明確な理由（ブラウザAPIの非対応を補うフォールバック、アカウント基盤等）がある場合のみ例外を許容する（例: Google Identity Services、`@zxing/library`、Firebase SDK）。npm/ビルドツール導入は不可。
- 既存の素朴なVanilla JSスタイルに合わせる。大きな抽象化やフレームワーク化は避ける。
- `localStorage` から読むJSONは `try/catch` と `Array.isArray` などで型を確認する。
- 既存データを壊す変更を避ける。保存キーを変える場合は移行処理を書く。
- 教材リスト、教材詳細、週ごとの記録、週の振り返りを勝手に削除しない。
- secretやprivate keyをコミットしない。VAPID private JWK、Cloudflare secrets、Google OAuth access tokenはリポジトリに置かない。`FIREBASE_CONFIG`のapiKey等は公開クライアント向けの値で秘密情報ではないため、`GOOGLE_CLIENT_ID`/`VAPID_PUBLIC_KEY`と同様にコード直書きでよい（実際のアクセス制御はFirestoreセキュリティルール側で行う）。

## 日付・週表示の注意

- 日本時間で使う前提。ブラウザ側の日付は `toLocalISO(date)` と `parseISOToDate(iso)` を使い、UTC由来の日付ずれを避ける。
- 週の開始日は `localStorage` の `weekStart` に保存する。値は `Date.getDay()` と同じ数値文字列（`'0'`=日〜`'6'`=土）。
- 古い `monday` / `sunday` 形式は `getWeekStartDay()` が読み込み時に数値へ移行する。
- `window.currentWeekStartISO` を基準に、表の行ラベル、各セルの `data-key`、週の振り返りキーを更新する。
- 今日ハイライトと今日やることはブラウザのローカル日付を `toLocalISO` で比較する。端末タイムゾーンが日本時間以外の場合は未検証。
- Googleカレンダー予定の作成は `timeZone: 'Asia/Tokyo'` を指定している。
- 祝日判定は `holidays2026` の固定セット。2027年以降は更新が必要。

## アカウント同期（Firebase）

- バックエンドはFirebase Auth（Googleサインインのみ）+ Firestore。サインインは`google.accounts.id`（Google Identity Servicesの「サインインボタン」、`GOOGLE_CLIENT_ID`を共用）でIDトークンを取得し、`signInWithCredential`でFirebaseにサインインする方式（`renderGoogleSignInButton()`/`handleGoogleIdCredential()`）。`signInWithPopup`/`signInWithRedirect`はSafariのストレージ分離(ITP)で`firebaseapp.com`とのセッション受け渡しに失敗する（`auth/unauthorized-domain`や`missing initial state`）ことを実機で確認済みのため使わない。Googleカレンダー連携（`initGoogleAuth`によるCalendar APIアクセストークン取得）とはOAuthクライアントIDこそ共用するが、目的も戻り値も別物で、互いに依存しない。
- `FIREBASE_CONFIG`（`index.html`内）は、実際のFirebaseプロジェクト `keikakuchou-37440` の公開クライアント設定に置き換え済み。apiKey等は公開クライアント向けの値でsecretではない。実際のアクセス制御はFirestoreセキュリティルールで行う。
- サインインは任意（opt-in）。サインインしなくても今まで通り`localStorage`のみで完全に動作する。Firebase初期化に失敗した場合も`window.appAuth`/`window.appDb`が未定義のままになるだけで、他の機能に影響しない。
- 実装は`index.html`の末尾にある`<script type="module">`（`window.appAuth`/`window.appDb`をwindowへ公開するブリッジ）と、先頭付近の`Storage.prototype.setItem/removeItem`フック（`classifyStorageKey`/`markCloudSyncDirty`/`flushCloudSync`）の2箇所に分かれる。`<script type="module">`は暗黙deferされ非moduleスクリプトより後に実行されるため、`window.appAuth`/`window.appDb`はイベントハンドラの中でのみ参照する（トップレベル直書きでは未定義になる）。
- Firestoreのドキュメント構成は`users/{uid}/app/settings`、`users/{uid}/app/materials`（`materialsList`/`materialDetails`は元のJSON文字列のまま保持）、`users/{uid}/days/{YYYY-MM-DD}`、`users/{uid}/weeklySummaries/{週開始ISO}`。セキュリティルールは`request.auth.uid == uid`のときのみ読み書き許可。
- `google-token`・`google-calendar-session-id`・`google-calendar-session-secret`・`today-trivia-*`・`device-id`は同期対象外（端末ローカルのみ）。

## 通知・Worker・外部連携

- `NOTIFY_WORKER_URL` は `https://keikakuchou-notify.keikakuchou-app.workers.dev`。
- `VAPID_PUBLIC_KEY` は公開鍵なので `index.html` に置いてよい。秘密鍵はCloudflare Secret `VAPID_PRIVATE_JWK` に置く。
- Workerは `NOTIFY_KV`、`VAPID_PRIVATE_JWK`、`VAPID_PUBLIC_KEY`、`VAPID_SUBJECT`、Cron Trigger を必要とする。
- Workerの購読はKVキー `sub:<subscriberId>` 単位（複数ユーザー/複数端末対応済み）。`subscriberId`はサインイン中ならFirebaseのuid、未サインインなら`localStorage`の`device-id`（端末ごとのランダムID）。`checkAndSend`は`sub:`プレフィックスで全購読を`KV.list()`して走査し、購読ごとに`lastSentDate`を保持する。
- Googleカレンダー連携はGISの認可コードモデル（`initCodeClient`）を使い、Workerの `/google/code` でコードをGoogle token endpointに交換し、`/google/token` で期限切れ時にアクセストークンを更新する。Workerには `GOOGLE_OAUTH_CLIENT_ID` と secret `GOOGLE_OAUTH_CLIENT_SECRET` を設定する。client secretとrefresh tokenはリポジトリやブラウザに置かない。
- Google OAuth client IDは公開情報。access tokenは実行時に `localStorage` の `google-token` に短時間保存されるだけで、リポジトリに含めない。
- ISBN/バーコード教材追加はまずブラウザ標準の `BarcodeDetector` を試す。Safari等の非対応ブラウザでは、CDN読み込みの `@zxing/library`（`window.ZXing`）にフォールバックする。どちらも使えない環境ではISBN手入力を使う。書籍情報は openBD を先に見て、見つからない場合に Google Books の公開検索へフォールバックする。APIキーや秘密情報は使わない。
- 目次（目次／単位リスト）の自動取得は、openBD/Google Booksに構造化データが無いため、Worker側の `GET /toc?isbn=...` が版元ドットコム（hanmoto.com）のHTMLを取得・解析して返す（非公式スクレイピング、`worker/worker.js` の `handleToc`）。ブラウザは直接hanmoto.comへfetchしない（CORS拒否されるため）。教材詳細を開いたときにISBNがあり目次未入力なら `index.html` の `tryAutoFillToc()` がこのWorkerエンドポイントを呼ぶ。hanmoto.comのHTML構造変更に弱い点に注意する。

## UI確認時の注意

- カレンダー上部ヘッダーには教材名が入る。セル内に教材名を重複表示しない。
- 「一週間をリセット」ボタンは廃止済み。
- 教材削除は教材詳細パネル内の「削除」ボタンで行う。削除しても、カレンダーにすでに記入済みの予定は残る。
- バーコード追加後の教材詳細には書籍メタ情報が表示される。詳細保存や「毎日」で `isbn`、`bookTitle`、`authors`、`publisher`、`coverImage` などを消さない。
- 教材詳細保存や「毎日」は、その教材列の既存スケジュールセルを消して再割り当てする。
- 科目1〜7のセルは直接編集不可（`contenteditable`なし）。タップすると○✕切り替えの吹き出し（`#statusBubble`、`openStatusBubble()`）が出る。8列目（感想・振り返り）だけは`contenteditable`のまま直接編集できる。
- 今日以前の日付に新しく✕を付けた場合は、その日以降の連続予定を1日後ろ倒しするかを`confirm`で確認してから実行する（今日の分は日別パネル・週表どちらも同じ挙動、過去分も同様）。
- 「今日やること」「Googleカレンダー」タブは2026-07-08に廃止した。日付セル（行ラベル）タップで開く日別詳細パネル（`#weekDayPanel`、`renderWeekDayPanel()`）がその日の教材予定・○✕・Google予定・感想欄をまとめて表示する。○✕が付いていない過去の予定は、右上の通知ベル（`#notifBellBtn`→`#notifModal`、`pastPendingTasks`/`refreshPastPendingTasks()`/`renderNotifList()`/`updateNotifBadge()`）にまとめた。バッジ件数とリスト内容は、ベルを開いたとき（`refreshPastPendingTasks()`実行時）にしか再計算しない設計（○✕を付けてもその場ではリストから消えない）。
- Googleカレンダーのサインイン/カレンダー選択/今すぐ同期ボタンは設定モーダルの「Googleカレンダー連携」セクションに移設した（アカウント同期＝Firebaseとは別セクション）。「今日は何の日」（`#todayTrivia`）はタイトル下に常時表示、モバイル幅では非表示（`body.week-mobile-shell #todayTrivia { display:none; }`）。
