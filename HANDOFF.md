# HANDOFF.md

最終更新: 2026-07-07（Claude Codeがスキャン教材の目次自動取得を追加）

## アプリの目的

「一週間の計画帳」は、学習教材ごとの予定を1週間単位で管理する静的Webアプリです。教材の追加、ISBN/バーコードからの教材追加、教材詳細からの自動割り当て、今日やること、○/×の進捗、週の振り返り、バックアップ/復元、毎日通知、Googleカレンダー予定の表示・作成・編集・削除を扱います。

## 現在の実装状態

コード上確認できた事実:

- 最新コミットは `git log -1 --oneline` で確認する。固定SHAは古くなりやすいため、この文書では管理しない。
- 公開URLは `https://michael-anderson-official.github.io/study-plan-app/`。push後のGitHub Pages反映状態はGitHub側または公開URLで確認する。
- アプリ本体は `index.html` にHTML/CSS/JavaScriptをまとめたVanilla JS構成。
- PWA/通知用に `manifest.json` と `sw.js` がある。
- Cloudflare Worker用に `worker/worker.js` と `worker/wrangler.toml` がある。
- アプリ本体の保存は `localStorage`。通知購読はCloudflare KVに保存する設計。
- `index.html` にはISBN/バーコード教材追加用の `scanIsbnBtn`、`isbnScannerModal`、カメラ読み取り/ISBN手入力/書籍情報プレビュー/教材追加処理がある。
- ISBN検索は openBD を先に使い、見つからない場合に Google Books の公開検索へフォールバックする。APIキーやprivate keyは使っていない。
- 通常のnpm依存やビルド手順はない。

未確認事項:

- ブラウザでの最新UI手動確認は未実施。
- 実カメラでのバーコード読み取り、モバイルブラウザでの `BarcodeDetector` 対応状況、openBD/Google Books のCORSを含む実ブラウザ通信は未確認。
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
- バックアップ/復元、リロードごとに変わる名言、今日は何の日、設定モーダルを追加。
- 「一週間をリセット」ボタンを削除し、週始まり設定を設定モーダルへ移動。
- 行の折りたたみ、今日ハイライト、年表示、ダブルタップズーム対策などUI調整を実施。
- Googleカレンダータブを追加し、予定の取得・作成・編集・削除・場所入力・対象カレンダー選択・アクセストークン短期保存を追加。
- 1週間タブの日付セルにも、サインイン済みGoogleカレンダーのその日の予定を最大2件まで箇条書き表示し、残りは `＋N件` で省略するようにした。
- 1週間タブは手書き計画帳に寄せたノート風の罫線・紙面UIにし、各日の行は初期表示で展開するようにした。
- 主要な色（ページ背景、タイトル/タブ帯背景、テーブルヘッダー背景、アクセント色、アクセント濃色、アクセント文字色、今日ハイライト色）をCSSカスタムプロパティ（`--theme-*`、`:root` で定義）に置き換えた。ノート風UIの罫線・紙の質感・列別の文字色などCodex側の変更は数値を維持し、色の一部だけ変数化した。
- 二十四節気（24件）の日付テーブル `SEKKI_TABLE` と `getCurrentSekki()` / `applySekkiTheme()` を追加し、起動時に現在の節気に応じて上記CSS変数と背景モチーフを切り替えるようにした。タイトル下に節気名と一言説明（`#sekkiLabel`）を表示する。
- 節気ごとに紐づく季節モチーフ（桜・梅・雪・雨・双葉・紅葉・稲穂・満月など14種、`MOTIF_SVGS`）をインラインSVGで生成し、`#seasonDecoration`（`position:fixed; z-index:-1; pointer-events:none`）に散りばめる。配置は当日の日付を種にした疑似乱数で決めるため、同じ日はリロードしても同じ配置になる。
- 節気テーマ・季節モチーフはlocalStorageに新しいキーを追加しない（既存の日付計算から都度算出するだけ）。
- ISBN/バーコード読み取りに、Safari等 `BarcodeDetector` 非対応ブラウザ向けのフォールバックとして `@zxing/library`（CDN読み込み、`window.ZXing`）を追加した。`startIsbnScan()` はネイティブ`BarcodeDetector`→ZXing→非対応メッセージの順で分岐する。`canScanBarcode()` で両方の対応状況をまとめて判定する。
- 教材詳細に「進捗（完了済みの単位数）」入力欄（`completedUnitsInput` → `material-details` の `completedUnits`）を追加した。目次リストの内容や単位数はそのまま保持し、`scheduleMaterial`/`scheduleMaterialDaily` が完了済み件数分だけ先頭を読み飛ばしてから予定を組む。目次入力欄には現在の行数（＝単位数）をリアルタイムに表示する（`tocCountLabel`/`updateTocCountLabel()`）。
- Worker（`keikakuchou-notify`）に `GET /toc?isbn=...` を追加した。openBD/Google Booksには目次データが無いため、版元ドットコム（hanmoto.com）の書籍ページ（`https://www.hanmoto.com/bd/isbn/{ISBN}`）をWorker側で取得し、`HTMLRewriter` で `div[data-book-contents-name="toc"] p`（と中の `br`）から目次テキストを抽出してJSON `{ toc, source, isbn }` で返す。ブラウザから直接hanmoto.comへfetchするとCORSで拒否されるが、Worker〜hanmoto.com間はサーバー間通信なのでCORSの対象外という前提で実装した。`index.html` 側は `tryAutoFillToc(idx, isbn)` が教材詳細を開いたとき（ISBN付きかつ目次未入力の場合）にこのエンドポイントを呼び、取得できれば目次入力欄を自動で埋める（ユーザーが手入力済みなら上書きしない）。ISBNごとに1回だけ試みる（`tocFetchAttempted`、ページ内メモリのみ、`localStorage`には保存しない）。

## 直近でCodexが変更した内容

コード上確認できた事実:

- `index.html` に「バーコードで追加」ボタンと `isbnScannerModal` を追加した。
- カメラ読み取りはブラウザ標準の `BarcodeDetector` を使う。非対応時もISBN手入力で検索できる。
- ISBNは13桁チェックサムを検証する。10桁ISBNは13桁へ変換して検索する。
- 書籍情報は openBD API を先に参照し、未取得なら Google Books API の公開検索へフォールバックする。
- 検索結果はプレビュー表示し、「この教材を追加」で `materials-list` に書名、`material-details` にISBN・書名・著者・出版社・出版日・表紙URL・ページ数・取得元を保存する。
- 教材詳細パネルに書籍メタ情報を表示する `bookMetaPanel` を追加した。
- 教材詳細の「保存」と「毎日」は `Object.assign` で既存詳細を引き継ぎ、ISBN/書籍メタ情報を消さないようにした。

未確認事項:

- 実カメラでのバーコード読み取り。
- 公開URL上でのopenBD/Google Books通信とCORS。
- iPhone/Androidでの `BarcodeDetector` 対応。非対応時はISBN手入力にフォールバックする設計。
- ローカルPlaywrightでのISBN手入力フロー確認は、検証環境の `playwright-core` 不足で未実施。

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
- バーコード追加された教材の `material-details` には `isbn`、`bookTitle`、`authors`、`publisher`、`publishedDate`、`coverImage`、`description`、`pageCount`、`source` が入り得る。
- `material-details` の `completedUnits` は「進捗（完了済みの単位数）」。目次リスト（`tocList`）や数値単位（`units`）はそのまま残し、スケジュール計算（`scheduleMaterial`/`scheduleMaterialDaily`）だけがこの件数分を先頭からスキップする。

移行処理:

- 旧 `YYYY-MM-DD-subN-prep` / `review` / `diary` は `content` に統合される。
- 旧 `prep-status` / `review-status` は `status` に統合される。
- 旧 `weekStart` の `monday` / `sunday` は `1` / `0` に移行される。

## 指定トピックの現在状態

### ISBN/バーコード教材追加

コード上確認できた事実:

- `scanIsbnBtn` で `isbnScannerModal` を開く。
- `isbnStartScanBtn` は `getUserMedia` が使える場合に、ネイティブ `BarcodeDetector`（Chrome系）→ CDN読み込みの `ZXing`（Safari等のフォールバック）の順でカメラ読み取りを試みる。`canScanBarcode()` がどちらか使えるかをまとめて判定する。
- ZXing使用時は `startIsbnScanZXing()` が `ZXing.BrowserMultiFormatReader.decodeFromConstraints()` でカメラ起動とデコードを行い、`stopIsbnScan()` が `zxingReader.reset()` で解放する。
- `isbnManualInput` と `isbnLookupBtn` でISBN手入力検索ができる。
- 書籍情報取得は openBD → Google Books の順。秘密鍵やAPIキーは使っていない。
- `isbnAddBookBtn` は検索済み書籍を教材として追加し、追加後に教材詳細を開く。
- 教材詳細保存や「毎日」を押しても、ISBN/書籍メタ情報は保持される。

未確認事項:

- 実カメラでバーコードを読み取れるか（ネイティブ・ZXing両方）。
- 公開URLでopenBD/Google Booksから期待通り取得できるか。
- SafariでのZXingフォールバックが実機で期待通り動くか。unpkg CDNが将来メジャーバージョンを上げた場合の互換性（現在 `@zxing/library@0.23.0` に固定）。
- `/toc` エンドポイントのCloudflare本番デプロイ（`worker.js` 更新分の反映）。
- 実際のISBNで `/toc` が目次を返し、教材詳細の目次欄に自動反映されるかの公開URL上での実操作。TOCが無い書籍・hanmoto.comにページが無いISBNでの動作（`{ toc: null }` を返してエラーにならないこと）。
- hanmoto.comのHTML構造が変わった場合、`div[data-book-contents-name="toc"]` セレクタが壊れて目次が取れなくなる可能性がある。非公式スクレイピングであることに留意する。

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
- 更新後に `updateWeekUI()`、`updateCellsForCurrentWeek()`、サインイン済みなら `refreshGoogleEventsForCurrentWeek()` を呼ぶ。

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
- ISBN/バーコード追加後の `index.html` の最終 `<script>` も `new Function(script)` で構文OK。
- 外部HTTPSテストで openBD は `9784003101018` に対してHTTP 200、タイトル `吾輩は猫である` を返した。
- 同じ外部HTTPSテストで Google Books はHTTP 429を返した。この環境の一時的な制限か、API側のレート制限かは未切り分け。
- `worker/worker.js` はES moduleとしてimportできる。
- `manifest.json` はJSON parseできる。
- GitHub Pagesのdeployment状態は作業時点ごとにGitHub側または公開URLで確認する。
- 公開 `index.html` が通知Worker URLとGoogle client IDを含むことは過去に確認済み。最新push後は再確認する。
- 公開 `sw.js` はpush通知表示処理を含む。
- 公開Workerの `/subscribe` はCORS preflightと不正bodyへの400を返す。

## 未確認の動作

- PC/スマホでの最新UIの実操作。
- 実カメラでのISBNバーコード読み取り。
- ISBN手入力からopenBD/Google Booksで書籍情報を取得し、教材追加できるかの公開URL上での実操作。
- ローカルPlaywrightでのブラウザ自動操作確認（検証環境の `playwright-core` 不足により未実施）。
- 教材削除ボタンのブラウザ手動クリック。
- 教材削除後、列の詰め替えと既存予定の見え方がユーザー期待と一致するか。
- 教材詳細保存時に手入力セルが消える挙動が許容されるか。
- 今日やることの×による繰り越しが全ケースで期待どおりか。
- Googleサインイン、カレンダー一覧取得、予定作成/編集/削除の実操作。
- 1週間タブの日付セル内にGoogle予定が期待通り表示されるかの実ブラウザ確認。
- iPhone PWA通知、Android/PC通知、Worker scheduled push。
- 2027年以降の祝日表示。
- 二十四節気テーマ・季節モチーフの実ブラウザでの見た目（配色バランス、モチーフの重なり具合、ノート風UIとの調和）。`SEKKI_TABLE` の開始日は年による±1日のずれを許容した概算値。

## 既知のバグ・注意点

- `HANDOFF.md` 更新前の古い記述では主要ファイルを `index.html` のみとしていたが、現在はPWA/Worker関連ファイルも重要。
- 教材削除しても、カレンダーにすでに書き込まれた予定は消えない。
- 教材は列番号ベースで保存される。教材削除後に列が詰まると、既存予定が別教材の列に見える可能性がある。
- 教材詳細保存や「毎日」は `clearMaterialContentCells(idx)` で該当列の全日付セルを消してから再割り当てする。手入力も消える可能性がある。
- 教材列は実質7教材分。8列目は感想・振り返り用。
- `sw.js` の通知クリックはURLに `index.html` を含むクライアントだけフォーカス対象にしている。ルートURLで開いているタブはフォーカスされない可能性がある。
- `holidays2026` は固定リスト。
- Workerは単一購読設計。
- `BarcodeDetector` はブラウザ対応差がある。Safari等の非対応環境ではCDN読み込みの `ZXing`（`@zxing/library@0.23.0`）にフォールバックする。両方使えない環境ではISBN手入力を使う。
- openBD/Google Booksの公開API仕様、CORS、レート制限に依存する。APIキーや秘密情報は使っていない。Google Booksが429を返す場合は、検索失敗ではなく取得失敗として扱う。
- 目次自動取得（`/toc`）は非公式スクレイピング。hanmoto.comの公式APIではなくHTML構造に依存しているため、サイト改修で無言で取れなくなる可能性がある。取得失敗時は静かに諦める設計（エラー表示せず、手入力のまま）。

## 次にやるべき作業

優先度高:

- Workerを複数購読対応にする。KVキーをsubscription ID単位に分け、購読ごとの時刻と `lastSentDate` を持たせる。
- push失敗時に `lastSentDate` を書かない、または失敗状態を記録して再試行できるようにする。
- Cloudflareダッシュボードまたは `wrangler` でKV binding、VAPID secrets、Cron Triggerの実設定を確認する。
- 実機で通知購読と翌分/翌日のpush送信を確認する。

優先度中:

- Worker `/toc` エンドポイントをCloudflareへデプロイし、実際のISBNで目次自動取得を実機確認する。
- ISBN手入力とバーコード読み取りを公開URLの実ブラウザで確認する。
- 教材削除後の既存予定の扱いを仕様決定する。
- 教材詳細保存時に手入力セルを消してよいか確認し、必要なら自動割り当て分だけを管理する設計へ変更する。
- Googleカレンダー連携を実ブラウザで確認する。
- `sw.js` の通知クリック時フォーカス判定をルートURLにも対応させる。

優先度低:

- 2027年以降の祝日対応。
- PC/スマホ幅の表示崩れ確認。
- 最小限のDOM操作テスト方針を決める。
- 二十四節気テーマを実機で確認し、配色や季節モチーフの密度を調整する。
