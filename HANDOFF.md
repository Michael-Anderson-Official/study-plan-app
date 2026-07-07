# HANDOFF.md

最終更新: 2026-07-07

## アプリの目的

「一週間の計画帳」は、学習教材ごとの予定を1週間単位で管理する静的Webアプリです。教材の追加、教材詳細からの自動割り当て、今日やること、○/×の進捗、週の振り返り、バックアップ/復元、毎日通知、Googleカレンダー予定の表示・作成・編集・削除を扱います。

## 現在の実装状態

コード上確認できた事実:

- `main` 最新コミットは `1187709820e66a17ee21f650fe364182abf7ebba`（`Persist Google sign-in across reloads`）。
- GitHub Pages の最新 deployment は上記SHAで `success`。公開URLは `https://michael-anderson-official.github.io/study-plan-app/`。
- 公開URLの `index.html`、`sw.js`、`manifest.json` はHTTP 200で取得できた。
- アプリ本体は `index.html` にHTML/CSS/JavaScriptをまとめたVanilla JS構成。
- PWA/通知用に `manifest.json` と `sw.js` がある。
- Cloudflare Worker用に `worker/worker.js` と `worker/wrangler.toml` がある。
- アプリ本体の保存は `localStorage`。通知購読はCloudflare KVに保存する設計。
- 通常のnpm依存やビルド手順はない。

未確認事項:

- ブラウザでの最新UI手動確認は未実施。
- iPhoneのホーム画面PWA通知、実push送信、Cron Triggerの実行は未確認。
- Cloudflareダッシュボード上のKV binding、Cron Trigger、VAPID secretsの実設定は公開エンドポイントからは未確認。

## 主要ファイル

- `index.html`: アプリ本体。週表示、教材、今日やること、設定モーダル、バックアップ、通知購読、Googleカレンダー連携を含む。
- `manifest.json`: PWA manifest。アプリ名、start_url、scope、iconを定義。
- `sw.js`: Service Worker。push通知を受け取り `showNotification` で表示し、通知クリック時に `index.html` を開く/フォーカスする。
- `worker/worker.js`: Cloudflare Worker。`/subscribe` で購読情報をKV保存し、scheduled eventで毎日通知を送る。
- `worker/wrangler.toml`: Worker名、KV namespace binding、cron `* * * * *` の設定例。
- `AGENTS.md`: 開発AI向けの毎回守るべきルール。
- `HANDOFF.md`: この引き継ぎメモ。

## 直近でClaude Codeが変更した内容

コミット履歴から確認できた流れ:

- 教材スケジュール保存時に既存セルへ追記ではなく置換するよう変更。
- 予習/復習/日記の分離から、1セル1コンテンツ形式へ移行。
- 今日やることタブ、○/×チェック、カレンダー右上バッジを追加。
- ×を付けた予定を翌日以降へ自動繰り越しする処理を追加。
- PWA manifest、Service Worker、Cloudflare Workerによる毎日push通知を追加。
- バックアップ/復元、毎日の名言、今日は何の日、設定モーダルを追加。
- 「一週間をリセット」ボタンを削除し、週始まり設定を設定モーダルへ移動。
- 行の折りたたみ、今日ハイライト、年表示、ダブルタップズーム対策などUI調整を実施。
- Googleカレンダータブを追加し、予定の取得・作成・編集・削除・場所入力・対象カレンダー選択・アクセストークン短期保存を追加。

## 保存キー・データ構造

コード上確認できた事実:

- 教材リスト: `materials-list`
- 教材詳細: `material-details`
- 週始まり設定: `weekStart`
- 週の振り返り: `weekly-summary-YYYY-MM-DD`
- セル内容: `YYYY-MM-DD-subN-content`
- 完了状況: `YYYY-MM-DD-subN-status`
- 通知時刻: `notify-time`
- 今日は何の日キャッシュ: `today-trivia-YYYY-MM-DD`
- Googleカレンダー選択: `google-calendar-id`
- Google access token一時保存: `google-token`

移行処理:

- 旧 `YYYY-MM-DD-subN-prep` / `review` / `diary` は `content` に統合される。
- 旧 `prep-status` / `review-status` は `status` に統合される。
- 旧 `weekStart` の `monday` / `sunday` は `1` / `0` に移行される。

## 指定トピックの現在状態

### PC版で教材追加ボタンが動かない問題

コード上確認できた事実:

- `loadMaterials()` は `materials-list` と `material-details` を `JSON.parse` 後、`Array.isArray` で配列確認している。
- 教材追加時は `materialsList.push(name)` と `materialsDetails.push(null)` を行い、両方を `localStorage` に保存する。
- `addMaterialBtn` は `type="button"`。

未確認事項:

- すべての既存ユーザー環境で壊れた保存データから復旧できるかは未確認。
- 最新公開版でのPC実ブラウザクリック確認は未実施。

### 今日ハイライトの日本時間判定

コード上確認できた事実:

- `toLocalISO(date)` は `getFullYear()`、`getMonth()`、`getDate()` を使い、ブラウザのローカル日付で `YYYY-MM-DD` を作る。
- `parseISOToDate(iso)` は `new Date(y, m, d)` でローカル日付として復元する。
- 今日ハイライトと今日やることは、ブラウザのローカル日付を `toLocalISO` に変換して比較する。

未確認事項:

- 端末タイムゾーンが日本時間以外の場合の表示は未確認。日本時間固定ではなく、ブラウザローカル時間基準で動く。

### 月曜始まり・日曜始まり設定

コード上確認できた事実:

- 現在の `weekStartSelect` は月曜/日曜だけでなく、`0`〜`6` の全曜日を選べる。
- 保存値は `Date.getDay()` と同じ数値文字列。`1` が月曜、`0` が日曜。
- 設定変更時は現在日付から週開始日を再計算し、`window.currentWeekStartISO` を更新する。
- 古い `monday` / `sunday` は読み込み時に数値形式へ移行する。

未確認事項:

- 週始まり変更時に、既存入力がユーザー期待どおり別週キーとして扱われるかは網羅未確認。

### 今週に戻るボタン

コード上確認できた事実:

- `currentWeekBtn` が存在し、表示テキストは `今週へ`。
- クリック時は現在日付と `weekStart` 設定から週開始日を再計算し、`window.currentWeekStartISO` を更新する。
- 更新後に `updateWeekUI()`、`updateCellsForCurrentWeek()`、Googleカレンダー表示中なら `refreshGoogleEventsIfVisible()` を呼ぶ。

未確認事項:

- PC幅・スマホ幅の両方での手動クリック確認は未実施。

## Cloudflare Worker / KV / Web Push / VAPID / Cron

コード上確認できた事実:

- Frontendの `NOTIFY_WORKER_URL` は `https://keikakuchou-notify.keikakuchou-app.workers.dev`。
- Frontendには `VAPID_PUBLIC_KEY` だけがある。公開鍵なのでsecretではない。
- Workerは `/subscribe` のPOSTで `{ subscription, hour, minute }` を受け取り、KV `subscription` に保存する。
- Workerのscheduled handlerはKV `subscription` を読み、JST換算で指定時刻を過ぎていて `lastSentDate` が今日でなければpush送信する。
- Workerは `VAPID_PRIVATE_JWK`、`VAPID_PUBLIC_KEY`、`VAPID_SUBJECT` をCloudflare env/secretから読む。
- `worker/wrangler.toml` には `NOTIFY_KV` binding idと cron `* * * * *` が書かれている。
- 公開Workerは `OPTIONS /subscribe` に200、CORS `Access-Control-Allow-Origin: *`、`Access-Control-Allow-Methods: POST, OPTIONS`、`Access-Control-Allow-Headers: Content-Type` を返した。
- 公開Workerは空JSONの `POST /subscribe` に400 `{"error":"invalid body"}` を返した。

未確認事項:

- 実際に有効なsubscriptionを保存してpush送信できるかは未確認。
- Cloudflare側のKV binding、VAPID secrets、Cron Triggerが本番で正しく設定されているかは未確認。
- Worker logsでscheduled eventが毎分動いているかは未確認。

危険箇所:

- 現在のWorkerはKVキー `subscription` 1件だけの設計。複数ユーザー/複数端末では後から設定した購読が前の購読を上書きする。
- push送信に失敗しても `lastSentDate` を書くため、その日は再送されない。
- `lastSentDate` も全体で1つなので、複数購読対応時は購読ごとの送信状態が必要。

## secret混入確認

確認済み:

- 現在のファイルとGit履歴で `-----BEGIN`、`PRIVATE KEY`、JWK秘密値の `"d":` は検出されなかった。
- リポジトリ内にあるのは公開VAPID鍵、Google OAuth client ID、Cloudflare Workerの環境変数名、KV namespace id。

注意:

- Google OAuth client IDとVAPID public keyは公開情報。
- `VAPID_PRIVATE_JWK`、Cloudflare API token、Google access tokenは絶対にコミットしない。
- 実行時のGoogle access tokenは `localStorage` の `google-token` に短時間保存される。

## 確認済みの動作

コード/HTTP応答で確認済み:

- `index.html` の最終 `<script>` は `new Function(script)` で構文OK。
- `worker/worker.js` はES moduleとしてimportできる。
- `manifest.json` はJSON parseできる。
- GitHub Pagesは最新SHAでdeployment success。
- 公開 `index.html` は通知Worker URLとGoogle client IDを含む。
- 公開 `sw.js` はpush通知表示処理を含む。
- 公開Workerの `/subscribe` はCORS preflightと不正bodyへの400を返す。

## 未確認の動作

- PC/スマホでの最新UIの実操作。
- 教材削除ボタンのブラウザ手動クリック。
- 教材削除後、列の詰め替えと既存予定の見え方がユーザー期待と一致するか。
- 教材詳細保存時に手入力セルが消える挙動が許容されるか。
- 今日やることの×による繰り越しが全ケースで期待どおりか。
- Googleサインイン、カレンダー一覧取得、予定作成/編集/削除の実操作。
- iPhone PWA通知、Android/PC通知、Worker scheduled push。
- 2027年以降の祝日表示。

## 既知のバグ・注意点

- `HANDOFF.md` 更新前の古い記述では主要ファイルを `index.html` のみとしていたが、現在はPWA/Worker関連ファイルも重要。
- 教材削除しても、カレンダーにすでに書き込まれた予定は消えない。
- 教材は列番号ベースで保存される。教材削除後に列が詰まると、既存予定が別教材の列に見える可能性がある。
- 教材詳細保存や「毎日」は `clearMaterialContentCells(idx)` で該当列の全日付セルを消してから再割り当てする。手入力も消える可能性がある。
- 教材列は実質7教材分。8列目は感想・振り返り用。
- `sw.js` の通知クリックはURLに `index.html` を含むクライアントだけフォーカス対象にしている。ルートURLで開いているタブはフォーカスされない可能性がある。
- `holidays2026` は固定リスト。
- Workerは単一購読設計。

## 次にやるべき作業

優先度高:

- Workerを複数購読対応にする。KVキーをsubscription ID単位に分け、購読ごとの時刻と `lastSentDate` を持たせる。
- push失敗時に `lastSentDate` を書かない、または失敗状態を記録して再試行できるようにする。
- Cloudflareダッシュボードまたは `wrangler` でKV binding、VAPID secrets、Cron Triggerの実設定を確認する。
- 実機で通知購読と翌分/翌日のpush送信を確認する。

優先度中:

- 教材削除後の既存予定の扱いを仕様決定する。
- 教材詳細保存時に手入力セルを消してよいか確認し、必要なら自動割り当て分だけを管理する設計へ変更する。
- Googleカレンダー連携を実ブラウザで確認する。
- `sw.js` の通知クリック時フォーカス判定をルートURLにも対応させる。

優先度低:

- 2027年以降の祝日対応。
- PC/スマホ幅の表示崩れ確認。
- 最小限のDOM操作テスト方針を決める。
