# HANDOFF.md

最終更新: 2026-07-12（Claude Codeが①日別パネルのタイトルに西暦・和暦と「次の節気まで◯日」を追加、②教材追加欄をモーダル化、③節気写真を最大限見せる「要素単位すりガラス」UIに全面変更、④「○✕のきろく」モーダル（週ごと・月ごとの○✕集計）を追加、⑤通知ベル以外のヘッダーボタンを左上の☰メニューに統合、⑥一週間の目標（週始まり基準・一度決めたら変更不可）を追加、⑦初回起動オンボーディングと教材追加への導線を追加、⑧通知バッジの即時更新化とバックアップ促しトーストを追加、⑨Capacitorネイティブ化の土台（CIでiOSビルド成功確認済み）、⑩「季節の庭」（○の数だけ節気モチーフが背景に増えるForest的モチベーター）を追加。ローカルPlaywrightでスマホ幅・PC幅とも表示・操作確認済み、実機は未確認）

## アプリの目的

「一週間の計画帳」は、学習教材ごとの予定を1週間単位で管理する静的Webアプリです。教材の追加、ISBN/バーコードからの教材追加、教材詳細からの自動割り当て、今日やること、○/×の進捗、週の振り返り、バックアップ/復元、毎日通知、Googleカレンダー予定の表示・作成・編集・削除を扱います。

## プロダクト方針（2026-07-12時点）

- **収益化: 将来的に広告を載せて収益化する（ユーザー決定・2026-07-12）。「広告なし」をマーケティングの売りにしないこと。**
- ターゲット層: 受験する中高生＋資格試験の大学生・社会人。初期は資格試験の社会人（法律系など、開発者本人がペルソナ）に絞り、実績後に中高生へ広げる想定。
- ポジショニング: Studyplus（記録・SNS）ともForest（集中タイマー）とも土俵をずらし、「計画倒れを防ぐ計画アプリ」として立つ。武器は①バーコード→目次→自動計画、②✕の自動繰り越し、③二十四節気の世界観＋SNSなし・他人と比べない静けさ（広告は載せる予定なので「広告なし」は含めない）。
- 二十四節気は「顔」（ブランド・差別化）として押し出すが、説明では必ず計画ループとセットにする。節気に目標入力は作らず、週＝目標（コミットメント）、節気＝振り返り・ご褒美、月＝長期傾向の役割分担とする。
- **計画中（2026-07-12ユーザー発案・庭の完成後に着手）: 「まち」キャンバス**。庭と並ぶ第2のステッカーキャンバスとして現代の街を追加し、勉強×まちづくりゲームにする。無料ステッカー=マンション・コンビニ・病院・信号・公園・銭湯など、プレミアム=東京タワー・スカイツリー・雷門・観覧車・城などのランドマーク。獲得時にユーザーが庭/街どちらのプールから引くか選ぶ設計（ランダム混合はコレクションが薄まるので不可）。**街は庭と違いマス目（グリッド）配置**（2026-07-12ユーザー決定）: 普通の建物=1×1マス、東京タワー等の大型ランドマーク=2×2マスなどの複数マス占有。庭=自由配置（情緒）／街=グリッド（構造・シムシティ的）という操作感の描き分け。どちらのプールが選ばれているかを計測できるようにして人気を検証する。実装は既存の庭エンジンを汎用化（ステッカーとgarden-itemsに`canvas`区分を追加＋背景切り替え＋グリッドスナップ）する。**着手条件: 庭の背景24枚とステッカー画像が揃い、TestFlightで庭が検証されてから。**
  - **世界観の統合（2026-07-12ユーザー発案・確定）: 街の中に「自宅」を置き、庭はその自宅の庭とする。** 自宅は獲得制ではなく最初から全員に配られるスターター建物（街の中心アンカー）。街画面で自宅をタップ→庭へ入る導線（「帰宅する」体験）。街=蓄積の世界（建物が増え続ける）／庭=巡りの世界（節気ごとのページ）という時間の対比。将来の課金候補: 自宅のアップグレード（平屋→二階建て→和風邸宅など）。
- **プレミアム機能（決定済み・未実装）: 「写真から目次読み取り」**（2026-07-12ユーザー決定）。目次が自動取得できない本のために、ユーザーが撮った目次ページの写真をWorker経由でClaude APIの画像認識に渡し、章タイトルだけのリストに整形して目次入力欄へ流し込む。実装時はAnthropic APIキーをWorkerのSecretに置く（クライアントには置かない）。コストは1回2〜3円（Opus 4.8）〜0.3円（Haiku 4.5）程度なのでプレミアム課金の売り物とし、無料ユーザーには出さない（またはお試し回数制限）。その他のプレミアム候補: 広告非表示、節気テーマ全解放、○✕のきろく全期間表示、きろくのエクスポート。
- AppStore配信までの既知の課題: ネイティブ化（Capacitor等）、Web Push→APNs作り直し、埋め込みWebViewでのGoogle OAuth作り直し、アカウント削除機能、プライバシーポリシー、オンボーディング（初回起動の導線）、通知ベルのバッジ即時更新化、データ消失防御（バックアップ/サインイン導線）。

## 現在の実装状態

コード上確認できた事実:

- 最新コミットは `git log -1 --oneline` で確認する。固定SHAは古くなりやすいため、この文書では管理しない。
- 公開URLは `https://michael-anderson-official.github.io/study-plan-app/`。push後のGitHub Pages反映状態はGitHub側または公開URLで確認する。
- アプリ本体は `index.html` にHTML/CSS/JavaScriptをまとめたVanilla JS構成。
- PWA/通知用に `manifest.json` と `sw.js` がある。
- Cloudflare Worker用に `worker/worker.js` と `worker/wrangler.toml` がある。
- アプリ本体の保存は `localStorage`（未サインインでも完全に動作する）。Googleでサインインすると、同じデータがFirestore（`users/{uid}/...`）にも同期される（任意・opt-in）。通知購読はCloudflare KVに保存する設計。
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
- 行の折りたたみ、今日ハイライト、年表示、ダブルタップズーム対策などUI調整を実施。（行ラベルタップでの折りたたみは2026-07-08に廃止。タップで行の大きさが変わらないようにするため。CSSの`row-collapsed`関連は残っているがトグルするコードは無い）
- 各日の行ラベルの日付の下に達成率（○の数÷内容が入っているセルの数、`updateDayRates()`/`.row-day-rate`）を表示する。教材が登録されていない科目列（1〜7）は`updateMaterialsUI()`が非表示にする（列の色分けCSSは`nth-child`基準のため、非表示列があると色と列の対応がずれるが実害なしと判断）。
- Googleカレンダータブを追加し、予定の取得・作成・編集・削除・場所入力・対象カレンダー選択・アクセストークン短期保存を追加。
- 1週間タブの日付セルにも、サインイン済みGoogleカレンダーのその日の予定を最大2件まで箇条書き表示し、残りは `＋N件` で省略するようにした。
- 1週間タブは手書き計画帳に寄せたノート風の罫線・紙面UIにし、各日の行は初期表示で展開するようにした。
- 2026-07-08、「Excelっぽい」「スプレッドシートに見える」との指摘を受け、表の罫線・格子模様を撤去する方向に舵を切った。`#planTable`を`border-collapse: separate` + `border-spacing`にし、`.cell`・行ラベル・ヘッダーに角丸と薄い影を付けて独立したカードのように見せた。表全体の重い外枠、セル境界線、ノート罫線風の縞模様（表全体・セル内側の両方）は撤去済み。行ラベルタップでの折りたたみ機能自体も同時期に廃止済み（タップで行の大きさが変わらないようにするため、詳細は既存の「教材・スケジュール関連」節参照）。曜日ごとのカード/リスト形式（横スクロール自体を無くす案）も`?preview=cards`で試作したが「違う」と却下され、コードごと削除済み（2026-07-08）。横スクロールで科目を見る操作感自体への根本対応はまだ未着手。
- 主要な色（ページ背景、タイトル/タブ帯背景、テーブルヘッダー背景、アクセント色、アクセント濃色、アクセント文字色、今日ハイライト色）をCSSカスタムプロパティ（`--theme-*`、`:root` で定義）に置き換えた。ノート風UIの罫線・紙の質感・列別の文字色などCodex側の変更は数値を維持し、色の一部だけ変数化した。
- 二十四節気（24件）の日付テーブル `SEKKI_TABLE` と `getCurrentSekki()` / `applySekkiTheme()` を追加し、起動時に現在の節気に応じて上記CSS変数と背景モチーフを切り替えるようにした。タイトル下に節気名と一言説明（`#sekkiLabel`）を表示する。
- 節気ごとの背景写真（ユーザーがAI生成、文字なし）を追加した。`img/sekki/*.jpg`（900x1600・約150〜300KBに圧縮）を置いて`SEKKI_IMAGES`（節気名→パス）に登録すると、その節気では白半透明を重ねた全画面背景として`applySekkiPhoto()`が表示し、SVGモチーフは省略する。オーバーレイの不透明度は初期実装時0.78だったが、2026-07-08に「もっと透けさせて」との要望で0.4へ変更（あわせて表本体・セル・行ラベルの背景不透明度も下げ、表の中まで背景写真が透けるようにした）。節気名自体は画像に焼き込まず`#sekkiLabel`側で表示する方針（二重表示・誤字防止のため）。全画面スプラッシュ表示は2026-07-08に削除済み（15日に1回・数秒しか見えず実装コストに見合わないと判断）。`?sekki=立春`のようにURLへ付けると任意の節気をプレビューできる。**24節気すべての画像が2026-07-08時点で揃っている**（`risshun`/`usui`/`keichitsu`/`shunbun`/`seimei`/`kokuu`/`rikka`/`shouman`/`boushu`/`geshi`/`shousho`/`taisho`/`risshuu`/`shosho`/`hakuro`/`shuubun`/`kanro`/`soukou`/`rittou`/`shousetsu`/`taisetsu`/`touji`/`shoukan`/`daikan`）。初回の文字入り立春・雨水、季節的に不自然だった春分・芒種の計4枚は生成し直した版に差し替え済み。
- 節気ごとに紐づく季節モチーフ（桜・梅・雪・雨・双葉・紅葉・稲穂・満月など14種、`MOTIF_SVGS`）をインラインSVGで生成し、`#seasonDecoration`（`position:fixed; z-index:-1; pointer-events:none`）に散りばめる。配置は当日の日付を種にした疑似乱数で決めるため、同じ日はリロードしても同じ配置になる。
- 節気テーマ・季節モチーフはlocalStorageに新しいキーを追加しない（既存の日付計算から都度算出するだけ）。
- ISBN/バーコード読み取りに、Safari等 `BarcodeDetector` 非対応ブラウザ向けのフォールバックとして `@zxing/library`（CDN読み込み、`window.ZXing`）を追加した。`startIsbnScan()` はネイティブ`BarcodeDetector`→ZXing→非対応メッセージの順で分岐する。`canScanBarcode()` で両方の対応状況をまとめて判定する。
- 教材詳細に「進捗（完了済みの単位数）」入力欄（`completedUnitsInput` → `material-details` の `completedUnits`）を追加した。目次リストの内容や単位数はそのまま保持し、`scheduleMaterial`/`scheduleMaterialDaily` が完了済み件数分だけ先頭を読み飛ばしてから予定を組む。目次入力欄には現在の行数（＝単位数）をリアルタイムに表示する（`tocCountLabel`/`updateTocCountLabel()`）。
- Worker（`keikakuchou-notify`）に `GET /toc?isbn=...` を追加した。openBD/Google Booksには目次データが無いため、版元ドットコム（hanmoto.com）の書籍ページ（`https://www.hanmoto.com/bd/isbn/{ISBN}`）をWorker側で取得し、`HTMLRewriter` で `div[data-book-contents-name="toc"] p`（と中の `br`）から目次テキストを抽出してJSON `{ toc, source, isbn }` で返す。ブラウザから直接hanmoto.comへfetchするとCORSで拒否されるが、Worker〜hanmoto.com間はサーバー間通信なのでCORSの対象外という前提で実装した。`index.html` 側は `tryAutoFillToc(idx, isbn)` が教材詳細を開いたとき（ISBN付きかつ目次未入力の場合）にこのエンドポイントを呼び、取得できれば目次入力欄を自動で埋める（ユーザーが手入力済みなら上書きしない）。ISBNごとに1回だけ試みる（`tocFetchAttempted`、ページ内メモリのみ、`localStorage`には保存しない）。
- 将来のAppStore公開（複数ユーザー対応）に向けた土台として、Firebase Auth（Googleサインインのみ）+ Firestoreによるアカウント同期を追加した。サインインは任意（opt-in）で、しなければ今まで通り`localStorage`のみで動く。詳細は下記「アカウント同期（Firebase）」節を参照。あわせて、Workerのプッシュ通知購読をKVキー1件の単一購読設計から `sub:<subscriberId>` 単位の複数購読対応へ変更した（`subscriberId`はサインイン中ならFirebaseのuid、未サインインなら`localStorage`の`device-id`）。
- 2026-07-08、Codexが追加した日別詳細パネル（`#weekDayPanel`）が「今日やること」「Googleカレンダー」タブと機能的にかなり重複していたため、両タブを廃止し1週間タブ1本に統合した。
  - 「今日やること」タブの「今日の予定＋○✕」部分は日別詳細パネル（日付セルタップで開く。PC幅・モバイル幅どちらでも動く）に統合済みだったため撤去。「○✕が付いていない過去の予定」一覧だけは日別パネルでは代替できない（1日ずつしか見れないため）ので、右上の**通知ベル**（`#notifBellBtn`、バッジ`#notifBellBadge`）→モーダル（`#notifModal`、リスト`#notifTaskList`）に独立させた。中身は既存の`pastPendingTasks`/`refreshPastPendingTasks()`をそのまま再利用し、描画は`renderNotifList()`（旧`updateTodayView()`の過去分ロジックを移設）。ページ読み込み時にも一度`refreshPastPendingTasks(); updateNotifBadge();`を呼ぶ。（2026-07-12追記: 当初の「ベルを開いたときにしか再計算しない」設計は廃止し、○✕変更時に`onTaskStatusChanged()`で即時更新に変更。詳細は下記2026-07-12の項）
  - 「今日は何の日」（`#todayTrivia`、`loadTodayTrivia()`）はタイトル直下に常時表示する形に変更（モバイル幅では他のラベル同様`display:none`）。ページ読み込み時に`loadTodayTrivia()`を直接呼ぶ。
  - 「Googleカレンダー」タブの中身（サインイン/サインアウト、カレンダー選択、今すぐ同期、＋予定を追加、同期ステータス）は、設定モーダルの新セクション「Googleカレンダー連携」（`.google-calendar-section`、アカウント同期＝Firebaseの`.account-section`とは別区画）へ要素をそのまま（IDも変更せず）移設した。予定の閲覧・編集・追加自体は日別詳細パネル側で行う。設定モーダルを開いたときと初回ページ読み込み時に`refreshGoogleCalendarPanel()`（旧`onGoogleCalendarTabShown()`）を呼び、カレンダー一覧・予定を取得する。
  - タブバー（`.view-tabs`/`.tab-btn`）のHTML/CSS/JS配線を削除し、`body`には`week-mobile-shell`クラスを常時付与するだけにした（モバイル幅専用CSSは元々`@media (max-width:600px)`内で完結しているため、常時付与しても非モバイル幅には影響しない）。モバイル幅での`#weekView`のtop位置オフセットはタブバー分の高さ（約3rem）を差し引いて`5.9rem`→`3rem`に調整したが、実機での見た目は未確認。
  - `renderGoogleEvents()`（旧Googleカレンダータブの日別グループ表示、`#googleEventList`を対象）と`isGoogleCalendarTabVisible()`は対象要素ごと削除した（週表の行ラベルバッジ`renderWeekGoogleEvents()`と日別パネルが同等の表示を担う）。
- 2026-07-08、「Googleカレンダー、全て表示させたい」との要望を受け、単一カレンダー選択（`googleCalendarId`、`<select id="googleCalendarSelect">`）を複数カレンダー同時表示（`googleSelectedCalendarIds`配列、`localStorage`キー`google-calendar-ids`）に変更した。
  - 設定モーダルの「Googleカレンダー連携」セクションは`<select>`ではなく、カレンダーごとのチェックボックス一覧（`#googleCalendarCheckboxList`、`fetchGoogleCalendarList()`が描画）になった。初回（未選択状態）は全カレンダーを自動選択する。
  - `fetchGoogleEvents()`は選択中の全カレンダーへ並行fetchし、結果をマージして`googleEvents`に格納する。各予定オブジェクトには取得元カレンダーID（`ev._calendarId`）を付与する。1つのカレンダーの取得に失敗しても他のカレンダーの表示は継続する（空配列にフォールバック）。401（認証切れ）はどれか1つでも起きた時点で`clearGoogleCalendarAuth(true)`を呼ぶ。
  - 既存予定の編集・削除は`ev._calendarId`に対して行う（`openGoogleEventModal(ev)`が`currentEditingGoogleCalendarId`にセットし、`updateGoogleEvent(id, body, calId)`/`deleteGoogleEvent(id, calId)`へ渡す）。新規作成時の追加先カレンダーは従来通り`googleEventCalendarSelect`（書き込み可能なカレンダーのみ、デフォルトはprimary）で選ぶ。
  - Firestore同期の`googleCalendarId`フィールド/`localStorage`キー`google-calendar-id`は`googleCalendarIds`/`google-calendar-ids`（JSON配列文字列）に名称変更した。
- 2026-07-08、「西暦と和号入れて」との要望で、週表ヘッダー（`#weekYearLabel`、日付列の見出し下）に和暦を追加した。`formatJapaneseEra(date)`が`Intl.DateTimeFormat('ja-JP-u-ca-japanese', { era: 'long', year: 'numeric' })`で「令和8年」のような文字列を生成する。ブラウザ標準のIntl日本暦を使うため、`holidays2026`のような年ごとの手動更新は不要（改元後も自動追従する）。表示は西暦の下に`<br>`で改行して2行表示（幅の狭い見出しセルでの折り返し崩れを避けるため）。年またぎ週は西暦側と同じくその週の開始日（`startDate`）基準で計算する。

- 2026-07-12、「7月12日 日曜日の左に西暦と和暦、曜日の右に次の節気までの日数を」との要望で、日別詳細パネルのタイトル（`#weekDayPanelTitle`）を`renderWeekDayTitle(titleEl, iso)`で描画するよう変更した（旧`formatWeekDayTitle()`は削除）。表示は「2026年（令和8年）**7月12日 日曜日**（大暑まで11日）」の形式で、西暦・和暦（`.week-day-panel-year`）と節気（`.week-day-panel-sekki`）は`font-size: 0.68em`の小さめspan。和暦は既存の`formatJapaneseEra()`を再利用。
  - 節気までの日数計算用に、国立天文台の暦要項（令和8年・令和9年）に基づく正確な節気開始日テーブル`SEKKI_EXACT_DATES`（2026年・2027年の全48件、ISO文字列と節気名のペア配列）と`getNextSekkiInfo(iso)`を追加した。既存の`SEKKI_TABLE`は±1日ずれる近似でテーマ切り替え専用。当日が節気の日は「（大暑）」のように日数なしで名前だけ表示する。テーブル範囲外（2027-12-23以降）はnullを返し括弧ごと非表示。**2028年分は暦要項（2027年2月発表予定）を調べて追記が必要。**
  - 確認状況: ローカルPlaywright（スマホ幅393px・PC幅1200px）でタイトル表示と日数計算（7/12→大暑まで11日、7/6→小暑まで1日、節気当日0日、年またぎ12/25→翌年小寒まで11日）を確認済み。実機未確認。
  - なお2026-07-12時点の調査で、スマホ幅では`body.week-mobile-shell`常時付与により週間表（`.week-table-scroll`）と「週間表を表示」ボタンがCSSで常に`display:none`になっており、週表ヘッダーの`#weekYearLabel`（西暦・和暦）はスマホでは見えないことが判明している（今回の日別パネル側の表示がその代替。週間表トグルの復活は未対応のまま）。

- 2026-07-12、「教材追加を下ではなく設定の右にボタンとして」との要望で、教材追加欄を下部固定バー（`mobile-collapsible`）からヘッダーの📚ボタン（`#materialsBtn`、`.materials-icon-btn`、⚙️の右 `left:3.4rem`）→教材追加モーダル（`#materialsModal`、`.settings-modal`流用）へ移動した。
  - `#materialInput`/`#addMaterialBtn`/`#scanIsbnBtn`/`#materialsList`と教材詳細`#materialDetail`はIDそのままモーダル内へ移設。日別パネルの「教材」ボタンはモーダルを開いてから`openMaterialDetail()`を呼ぶ。「保存」「毎日」でスケジュール反映した後は`closeMaterialsModal()`でモーダルごと閉じて週表に戻る。
  - 下部固定は「一週間の振り返り」1本になり、モバイルの`#weekView`下パディングを4.95rem→2.9remに詰めた。CSSの`.materials-section`関連の固定配置ルールは削除。
- 2026-07-12、「二十四節気の写真を最大限使ったUIに」との要望で、写真前面のUIを「要素単位すりガラス」方式に全面変更した。
  - 方針: 大きな面（旧・日別パネルの一枚板背景）で写真を覆わず、文字が乗る要素だけに `rgba(255,255,255,0.3〜0.5)` + `backdrop-filter: blur(6〜10px)`（`-webkit-`付き）を敷く。要素の隙間からは写真がぼかしなしで見える。
  - 対象: `h1`（節気色の帯→白すりガラス、`--theme-header-bg`はヘッダーでは不使用に）、丸ボタン3つ（⚙️📚🔔）、日付カード、日別パネルヘッダーのチップ（`.week-day-panel-header > div`）、教材タスクカード、セクション見出しチップ（`.week-day-section-title`）、空状態、感想/日記textarea、下部トグル。
  - 写真のオーバーレイ（`applySekkiPhoto`の白）を0.28→0.12へ。
  - スマホ幅の感想・日記textareaは空のとき2.6remに畳み、`:focus`で7remに広がる（`body.week-mobile-shell .week-day-reflection`）。写真を隠さないため。
  - 一度「パネル全体を1枚のすりガラスにする」案を実装したが、写真全体がぼやけた壁紙になってしまい要素単位方式に作り直した経緯がある（同日中に置き換え済み）。
  - 確認状況: ローカルPlaywright（393px/1200px）でモーダル開閉・教材追加・日別パネル「教材」→詳細表示・見た目を確認済み。実機（iPhone Safari）のbackdrop-filter描画とパフォーマンスは未確認。

- 2026-07-12、「月毎、週ごとに○✕がどれだけついてるか一目でわかるタブが欲しい」との要望で、ヘッダーに📊ボタン（`#statsBtn`、`.stats-icon-btn`、🔔の左 `right:3.4rem`）→「○✕のきろく」モーダル（`#statsModal`）を追加した。
  - 集計は`collectDayStatusStats()`が`localStorage`の`YYYY-MM-DD-sub[1-7]-content/-status`を全走査して日別に数え、`renderStatsModal()`が週（設定の週始まり基準）と月に集約する。表示は新しい順に最大12件ずつ、各行は「期間ラベル＋○n ✕n 未n＋達成率%＋積み上げバー」（`buildStatsRow()`）。今週・今月の行には「今週/今月」の接頭辞。達成率＝○÷内容ありセル数（既存の達成率と同じ定義）。
  - バーの色は○=`#12855a`緑・✕=`#d45f3c`橙赤・未=グレー。緑/赤はdatavizスキルのバリデータで色覚多様性チェック済み（protan ΔE13.2、件数文字ラベルの常時併記が前提条件）。セグメント間は2pxギャップ。バーは行ごとの構成比（幅=期間内シェア）で、量ではなく達成率を見せる設計。
  - モーダルは開くたびに集計し直すだけで、localStorageに新しいキーは追加しない。データが無い場合は「まだ○✕の記録がありません。」を表示。
  - 確認状況: ローカルPlaywright（スマホ幅）で6週間ぶんのダミーデータを入れて週6行・月2行の描画を確認済み。実機未確認。

- 2026-07-12、「通知以外の上のボタンを全部左上にまとめて三本線で統合」との要望で、ヘッダーの⚙️📚📊ボタンを左上の☰メニュー（`#menuBtn`、`.menu-icon-btn`）→ドロップダウン（`#menuDropdown`、`.menu-dropdown`、`z-index:35`）に統合した。右上の通知ベル🔔はそのまま。
  - `#settingsBtn`/`#materialsBtn`/`#statsBtn`はIDを変えずにドロップダウン内のメニュー項目（「⚙️ 設定」「📚 教材追加」「📊 ○✕のきろく」）として移設したため、各モーダルを開く既存ハンドラは無変更で動く。メニューは項目タップ・メニュー外タップで閉じる（`document`のclickリスナー、`menuBtn`側は`stopPropagation`）。
  - 旧`.settings-icon-btn`/`.materials-icon-btn`/`.stats-icon-btn`のCSSは削除し、`.menu-icon-btn`と`.menu-dropdown`を追加。
  - 確認状況: ローカルPlaywright（スマホ幅）でメニュー開閉・3モーダルの起動・外タップで閉じるまで確認済み。実機未確認。

- 2026-07-12、「1週間の目標を定められるように。1度決めたらその1週間は変更できないように」との要望で、週送りボタンの下に一週間の目標バー（`#weekGoalBar`、`renderWeekGoal()`）を追加した。
  - 週の区切りは月曜固定ではなく**設定の「週の始まり」（`weekStart`）基準**にした（週表・週の振り返り・`weekly-summary-<ISO>`キーと同じ基準。月曜固定だと日曜始まりユーザーの週とずれるため）。保存キーは`weekly-goal-<週開始ISO>`。
  - 未設定の週は「🎯 この週の目標を決める」ボタン→入力欄＋決定/やめる→`confirm`で「後から変更できません」と念押しして保存。保存後はピル型の固定表示のみで、編集UIは存在しない（=変更不可）。保存時に既存値があれば上書きしない二重チェックあり。
  - 過去の週（表示中の週開始 < 今週開始）では未設定でも決定ボタンを出さない（さかのぼって目標は立てられない）。過去の週に目標が設定済みなら表示だけする。未来の週には事前に設定できる（設定したら同様に変更不可）。
  - 注意: 週の途中で`weekStart`設定を変えると週開始ISOが変わるため、変更前に立てた目標は新しい週区切りでは表示されなくなる（`weekly-summary-`と同じ既知の挙動。データ自体は残る）。
  - Firestore同期は`weeklySummaries/{ISO}`ドキュメントに`goal`フィールドとして相乗り（`classifyStorageKey`に`weekly-goal-`を追加、`pushWeeklySummary(uid, iso, text, goal)`に引数追加、`pullAll`は`{text, goal}`オブジェクトを返す形に変更）。
  - 確認状況: ローカルPlaywright（スマホ幅）で設定→固定表示→リロード後保持→過去週は非表示→未来週は設定可、まで確認済み。実機・Firestore実同期は未確認。

- 2026-07-12、AppStore配信準備の一環で初回起動オンボーディングを追加した（`#onboardingModal`、`maybeShowOnboarding()`）。
  - 表示条件: `onboarding-done`フラグ（localStorage、同期対象外）が無く、かつ教材が1件も無いとき（`hasAnyMaterial()`）。教材がある既存ユーザーには表示せず、フラグだけ立てる。`?onboarding=1`で強制プレビュー可能（`?sekki=`と同じ流儀）。判定は`window`の`load`ハンドラ末尾（`loadMaterials()`の後）で行う。
  - 中身: 「ようこそ🌸」＋3ステップ（バーコード登録→予定が自動でできる→毎日○✕）＋✕繰り越しの一言。主ボタン「📚 教材を追加して始める」は教材追加モーダルへ直行、「あとで自分で見てみる」と背景タップはスキップ扱い。どの経路でもフラグが立ち二度と出ない。
  - あわせて恒久導線を2つ追加: ①日別パネルの空状態「この日の教材予定はありません。」の下に、教材ゼロのときだけ「📚 教材を追加する」ボタン（`.week-day-add-material-btn`）を表示。②教材追加モーダル内に常設ヘルプ文（`.materials-help`、「バーコードで追加が一番かんたん…」）。
  - 確認状況: ローカルPlaywright（スマホ幅）で初回表示→始めるボタン→教材モーダル直行→リロードで非表示→既存ユーザー非表示→強制プレビュー、まで確認済み。実機未確認。

- 2026-07-12、AppStore準備のUX改善2件（オンボーディングの回で挙げた「決定的な穴」の残り2つ）。
  - **通知バッジの即時更新化**: ○✕が変わるたびに`onTaskStatusChanged()`（`refreshPastPendingTasks()`＋`updateNotifBadge()`）を呼ぶようにした。呼び出し箇所は週表セルの吹き出し（`openStatusBubble`のクリックハンドラ）と、日別パネル・通知モーダル共通のボタン群（`buildTodayStatusGroup`）の2箇所で全経路を網羅。通知モーダル内のリストも即時反映され、○を付けた項目はその場で消える（旧仕様の「ベルを開いたときだけ再計算・その場では消えない」は廃止。付け間違いは日別パネルや週表からいつでも直せる）。
  - **バックアップ促しトースト**（`#backupNudge`、`maybeShowBackupNudge()`）: 未サインイン（`currentAuthUser`がnull、`handleAuthStateChange`で更新）かつ教材あり（`hasAnyMaterial()`）のとき、画面下部（振り返りバーの上）に「記録はこの端末の中にだけあります…」を表示。「設定を開く」は却下記録後に`settingsBtn.click()`で設定モーダルへ、「あとで」は却下のみ。却下すると`backup-nudge-dismissed`（端末ローカルのみ、同期対象外）に日付を保存し14日間は再表示しない。Firebase認証の判定を待つため表示判定はload後3.5秒遅延。サインインが完了した時点で表示中でも畳む。
  - 確認状況: ローカルPlaywright（スマホ幅）でバッジ2→○タップで即1・リストからも消える・トースト表示→あとで→14日抑止→設定を開く経路、まで確認済み。実機未確認。

- 2026-07-12、AppStore配信に向けたネイティブ化の土台としてCapacitor 8を導入した。
  - 構成: `package.json`（npmはパッケージング層専用、AGENTS.mdに例外を明記）、`capacitor.config.json`（appId `jp.keikakuchou.planner`※初回提出前なら変更可、appName 一週間の計画帳、webDir `www`）、`scripts/build-www.mjs`（index.html等をwww/へコピーするだけ。変換なし。workerは含めない）、`ios/`（`npx cap add ios`で生成、SPM方式でCocoaPods不使用）。`www/`と`node_modules/`は.gitignore。GitHub Pages配信（リポジトリルートのindex.html）には無影響。
  - `ios/App/App/Info.plist`に`NSCameraUsageDescription`（バーコード読み取り用）を追加済み。
  - **開発機はWindowsでXcodeが無いため、iOSビルドの検証はGitHub Actions（`.github/workflows/ios-build.yml`、macos-15ランナー、公開リポジトリなので無料）が唯一の手段**。署名なしシミュレータ向けDebugビルドが通ることを確認する。web資産やios/を変更したら自動実行、手動実行も可（workflow_dispatch）。
  - 未対応（次の段階）: プッシュ通知のAPNs化（Web Pushはラッパー内で動かない）、ラッパー内Google OAuth（GISは埋め込みWebViewを拒否する）、アカウント削除、アプリアイコン（Assets.xcassetsはCapacitorのプレースホルダーのまま。icon-512.pngは512pxで@capacitor/assetsの要求（1024px）に足りないため元画像が要る）、TestFlight配布（Apple Developer Program加入と署名設定が必要）。

- 2026-07-12、「Forestの木的な要素を入れたい」との要望で**季節の庭**を追加した（`renderSekkiGarden()`、`getCurrentSekkiRange()`、`countCirclesInRange()`）。
  - 仕組み: **今の節気の期間中（`SEKKI_EXACT_DATES`基準）に付いた○の数**だけ、その節気のモチーフSVG（`MOTIF_SVGS[sekki.motif]`、白発光＋drop-shadowの`svg.garden-motif`）を背景（`#seasonDecoration`）に散りばめる。配置は節気名を種にした疑似乱数なので同じ節気の間は同じ場所に生え続け、新しい○の分だけ新しい場所に増える。上限60個。画面の下側2/3にだけ植える（ヘッダー回避）。
  - ○✕変更時は`onTaskStatusChanged()`が`renderSekkiGarden()`を呼び、増えた1個だけ`@keyframes gardenPop`でポップさせる（報酬の瞬間）。○を取り消すと減る。節気が変わると自動的にまっさらな庭から再スタート（Forestの森の15日サイクル版）。
  - localStorageに新しいキーは追加しない（既存の`-status`を毎回数えるだけ）。`?garden=30`で任意の個数をプレビュー可能。
  - 将来の発展候補（未実装）: 過去の節気の庭を一覧する「庭コレクション」画面（プレミアム課金の売り物候補）、節気の変わり目の庭のまとめ表示。
  - 確認状況: ローカルPlaywright（スマホ幅）で読み込み時6個→○タップで即7個目がポップ→取り消しで6個、`?garden=30`プレビュー、まで確認済み。実機未確認。

- 2026-07-12、実機でISBN検索が「書籍情報の取得に失敗しました」になった件（原因: キー無しGoogle Books APIの世界共有クォータが429で枯渇していた。openBD側は正常だったが通信の揺らぎでフォールバックに落ちた）の恒久対策を実装した。
  - **Workerに`GET /book?isbn=`を追加**（`handleBook`）: サーバー側で openBD → 国立国会図書館サーチ（`ndlsearch.ndl.go.jp/api/opensearch`、XMLを素朴にパース、表紙は`/thumbnail/{isbn}.jpg`）→ Google Books の3段構えで書誌を探し、クライアントの`fetchOpenBdBook()`と同じ形＋`found`フラグのJSONで返す。`cf.cacheTtl`1日でキャッシュ。openBDの著者「姓,名」形式は分割せず、複数著者区切り「／」だけで分ける。
  - クライアントの検索順は **openBD直接 → Worker `/book` → Google Books直接**（`fetchWorkerBook()`を追加）。Worker未デプロイでも従来と同じ動作に自然フォールバックする。
  - **192価格コード対策**: `normalizeIsbn()`は13桁の場合978/979始まりのみ受理するよう変更（日本の本の下段バーコード192…はEAN-13としてチェックサムが正しく素通りしていた）。`isJapaneseSecondaryBarcode()`（192/491始まり）を追加し、手入力・カメラ読み取り（native/ZXing両方）で「上段の978で始まるバーコードを読んで」と具体的な案内を出す（スキャンは止めない）。
  - 確認状況: Workerはローカル（`wrangler dev --local`）で openBD経路・NDLフォールバック経路・400応答を確認。クライアントは実ブラウザで実ISBN検索成功と192メッセージを確認。Worker本番デプロイ済み（2026-07-12、`npx wrangler deploy`、Version 842d6013）。本番`/book`で実ISBNの取得成功と既存`/toc`の応答（回帰なし）を確認済み。
  - なお実機でカメラが真っ黒になった件はユーザーが再試行したところ開いたため一時的なものと判断（iOSホーム画面PWAのカメラは既知の不安定さあり。恒久対策はCapacitorネイティブ化側で解決予定）。

- 2026-07-12、「その日の目標より進んだ分に○が付けられない。教材ごとに、目次（単位）が縦・何周目かが横・セルは○を付けた日付の表を」との要望で、**教材ごとの進捗表（単位×周回）**を追加した。
  - データ: `materialsDetails[idx].progress` に `{"u<単位番号0始まり>-l<周番号1始まり>": "YYYY-MM-DD"}` のスパースマップ。`material-details`の中なのでFirestore同期（`users/{uid}/app/materials`）に自動で乗る。localStorageに新キーは増やさない。
  - **日別○との連動**: `onTaskStatusChanged(statusKey, newVal, oldVal)`（引数を追加）が、○が付いた瞬間に`recordProgressFromDay()`でそのセルの内容を教材の目次と照合（目次モード=行テキスト一致、数値モード=「5, 6」の数値-1）し、各単位の**「まだ日付がない一番早い周」**に日付を記録する（2周目の勉強なら自動で2周目列に入る）。○が外れた/✕に変わったら`unrecordProgressFromDay()`が**日付一致する一番後ろの周を1件だけ**取り消す（同日に手動記録した別周を巻き添えにしないため）。
  - **予定より先に進んだ分**は進捗表のセルを直接タップ→今日の日付で記録（これが「目標より進んだ分の○」）。記録済みセルはタップ→confirmで取り消し。
  - UI: `#progressModal`（`renderProgressGrid()`）。行=目次（無ければ単位数から1,2,…）、列=使用中の最大周+1（最低3列）、単位列とヘッダーはsticky。入口は①日別パネルの各タスクの「進捗」ボタン、②教材追加モーダルの教材リストの「進捗表」リンク。教材削除時はdetailごと消えるので後始末不要。
  - 既存の`completedUnits`（完了済み単位数=スケジュール開始位置のスキップ）とは別物・独立（要統合検討）。季節の庭・○✕のきろくは日別の`-status`だけを数え、進捗表の手動記録は含まない（既知の非対称、今後の検討事項）。
  - 確認状況: ローカルPlaywright（スマホ幅）で日別○→1周目自動記録→手動タップで先行分記録→2周目タップ→日別○取り消しで1件だけ取り消し→両入口からのモーダル表示、まで確認済み。実機未確認。

- 2026-07-12、「第2部は単なる区分けであって単位ではない。目次をもっと自由に触れるように」との要望で、**目次の区分け行（見出し行）**を導入した。
  - 記法: 目次入力欄で**行頭に「#」を付けた行は区分け**（部・編など）。`isTocHeading()`/`getTocUnits()`（単位だけをtrimして返す）/`getTocRows()`（進捗表用に見出し+単位を順に返す。unitIdxは単位のみの通し番号）を追加。`tocList`には#付きの生の行をそのまま保存する（入力欄を開き直しても構造が見える）。
  - 反映箇所: 単位カウント表示（「単位 5件・区分け 2件」）、`scheduleMaterial`/`scheduleMaterialDaily`の割り当て対象（`getTocUnits()`経由で区分け除外）、`completedUnits`の上限、進捗表（区分けは`td.progress-heading`のcolspan見出し行として表示、周回セルなし）、`matchUnitsFromContent()`（単位のみのリストでindex照合）。目次入力欄に記法のヘルプ文を常設。
  - 注意: #を後から付ける/外すと単位の通し番号がずれ、既存の進捗表の日付と単位の対応がずれる（目次の行を挿入/削除した場合と同じ既知の性質）。
  - あわせて既存バグ2件を修正: ①「保存」フローでスケジュール後に教材追加モーダルが閉じず、開いている日別パネルも古いままだった→`saveMaterialDetail`末尾で`closeMaterialsModal()`+`renderWeekDayPanel(selectedWeekDayISO, {keepClosed:true})`。②「毎日」フロー（`scheduleMaterialDaily`）の2経路にも同じ日別パネル再描画を追加。
  - 確認状況: ローカルPlaywright（スマホ幅）で、#付き目次の保存→単位カウント→スケジュールに部が入らない→進捗表の見出し行表示→日別○がu0-l1（区分けを飛ばした番号）に記録、まで確認済み。実機未確認。

- 2026-07-12、目次の自動取得（hanmoto.com→`tryAutoFillToc`）にも区分け記法を自動適用するようにした（`normalizeAutoToc()`）。
  - 「第◯部」「第◯編」の行（数字は算用・全角・漢数字対応、後ろに表題が続いてもよい）に自動で行頭#を付ける。章・講などはそのまま。全行が区分けになってしまう本（部自体が単位の本）では何も変換しない安全弁つき。自動取得時のステータス文で「自動マークした」ことをユーザーに伝え、カウント表示も即更新する。
  - 将来の「写真から目次読み取り」（プレミアム、未実装）でも同じ`normalizeAutoToc()`を通す想定。
  - 確認状況: 単体テスト（混在・全行部の安全弁）と、Playwrightで`/toc`をモックした自動取得→#付与→カウント表示まで確認済み。

- 2026-07-12、Forest型モチベーター**「じぶんの庭」**の骨組みを実装した（画像は絵文字プレースホルダー。ChatGPT生成の透過PNGに差し替え予定）。
  - **獲得ルール（ユーザーと合意済み）**: ①その日の予定をその日のうちに全部○ → いまの季節のアイテム1個獲得（`maybeAwardGardenItem()`、`onTaskStatusChanged`の○付与時に呼ぶ）。②1日1個まで（`earnedDate`重複チェック。○→✕→○でも重複しない）。③過去日への遡り○では出ない（きろく・進捗表には反映される。庭は「今日をやりきった」報酬）。④獲得後の没収なし。⑤ズル対策の設計思想=「罰を軽くする」（✕でも何も失わない）。
  - カタログ: `GARDEN_ITEM_CATALOG`（21種、季節spring/summer/autumn/winterごとのプール。`getSeasonOfSekki()`が節気→季節を対応）。獲得時トースト`#gardenAwardToast`（「庭に置く」→庭画面）。
  - 庭画面: `#gardenView`（☰メニュー「🏡 じぶんの庭」から。背景=現在の節気写真、タイトルに節気名）。アイテムはPointer Eventsで**ドラッグ自由配置**（%座標、離した時に保存）、タップで「◯月◯日（節気）にやりきった日の思い出」チップ表示。
  - データ: `garden-items`（上記キー一覧参照）。`classifyStorageKey`/`pushSettings`/クラウド適用に`gardenItems`を追加済み。
  - **未実装TODO**: 週の目標達成のレアアイテム（目標の達成判定UIが先に必要）、画像差し替え（catalogに`img`フィールドを足して絵文字の代わりに`<img>`描画）、庭背景の専用イラスト化（現状は節気写真を流用）。
  - 確認状況: ローカルPlaywright（スマホ幅）で、全部○→獲得トースト→庭表示→ドラッグ保存→タップで思い出→重複なし→遡り○で出ない、まで確認済み。実機（タッチドラッグ）未確認。

- 2026-07-12、庭のアイテムの呼称を**「ステッカー」**に統一し、Forestに倣って**無料／プレミアムの2階層**に分けた。
  - `GARDEN_ITEM_CATALOG`に`premium: true`のステッカーを8種追加（こいのぼり・お花見の女の子・虫とりの少女・打ち上げ花火・焚き火・かかし・そり遊びの子ども・こたつで丸くなる猫。各季節2種）。`isPremiumUser()`（現状常にfalseのスタブ。IAP実装時に本物の判定へ置き換える）がfalseの間は**抽選プールに入らない**。
  - **ステッカー帳**（庭画面ヘッダーの📖→`#stickerBookModal`、`renderStickerBook()`）: 全カタログを季節ごとに一覧。所持枚数／未獲得を表示し、プレミアム分は🔒バッジ＋薄表示（「見えるけど手に入らない」でプレミアム購入動機を作るForest型の設計）。庭画面(z-index:44)の上に出すため`#stickerBookModal{z-index:47}`。
  - 確認状況: ローカルPlaywrightで抽選プールにプレミアムが入らないこと・ステッカー帳の🔒表示・所持枚数表示を確認済み。

- 2026-07-12、ユーザーがChatGPTで生成した**本物のステッカー画像（透過WebP）を夏5種に登録**した（スイカ・風鈴・かき氷・ひまわり・提灯。`img/garden/*.webp`、最長辺512px・16〜48KB）。
  - カタログの該当エントリに`img`フィールドを追加。`img`があるステッカーは庭・ステッカー帳で`<img>`描画（4.4rem/1.9rem、`pointer-events:none`でドラッグは親要素が受ける）、無いものは従来どおり絵文字プレースホルダー（カエルほか16種＋プレミアム8種が未差し替え）。
  - **画像の受け入れ手順（次回以降）**: ①ユーザーがChatGPTで生成（白フチ付きステッカー風・水彩・透過PNG）→②透過が本物か確認（偽物の市松模様が描き込まれていることがある。透明ピクセル0%なら偽物→再生成依頼）→③最長辺512pxへ縮小しWebP(quality 0.85)で`img/garden/<type>.webp`へ→④カタログに`img`追加。
  - 確認状況: ローカルPlaywrightで5枚のwebp読み込み・庭での表示を確認済み。

- 2026-07-12、「ステッカーで庭が埋もれる（1節気≒最大15枚、年360枚）」とのユーザー指摘を受け、**庭を「節気ごとの1ページ」のアルバム構造**に変更した。
  - 庭画面はその節気に獲得したステッカーだけを表示（`gardenViewSekkiName`、`renderGardenPage()`。獲得時の`item.sekki`でフィルタ）。ヘッダーの‹ ›で24節気のページを循環でめくれる（`stepGardenPage()`、背景もそのページの節気で切り替わる）。現在の節気のページには「（いま）」を付記。枚数表示は「この節気のステッカー n枚（ぜんぶで m枚）」。
  - 節気が変わると自動的にまっさらな新ページから始まり、過去ページは思い出アルバムとして残る（1年で24ページの絵日記になる設計）。
  - あわせて庭背景の生成プロンプトの構図を**俯瞰気味（斜め上45度・地面が下2/3）**に変更するようユーザーに依頼済み（ステッカーの置き場を広くするため）。既存の立春の絵は旧アングルなので作り直し予定。
  - 確認状況: ローカルPlaywrightでページごとのフィルタ表示・ページ送り・空ページ表示を確認済み。

- 2026-07-12、庭を**横長パノラマ＋横スライド**に変更した（ユーザー要望）。
  - 構造: `#gardenScroller`（overflow-x:auto、スクロールバー非表示）の中に`#gardenGround`（広いキャンバス本体、背景はここに敷く）。`renderGardenPage()`が背景画像を`new Image()`で読み、アスペクト比から`ground`の幅を`max(画面幅, 画面高さ×アスペクト比)`で設定する。横長の絵なら2〜3画面ぶんに広がり、縦長の写真フォールバックならほぼ従来通り（スライドなし）。初期スクロール位置は中央。ページ送り連打の後着onload対策に節気名を照合。
  - ステッカーのドラッグは`touch-action:none`＋pointer captureなので、**ステッカーを掴むとドラッグ・背景を掴むとスクロール**が自然に共存する。%座標は広いground基準で、スクロール位置を織り込んで正しく保存される（検証済み）。
  - **背景の生成プロンプトは横長（1536×1024）・俯瞰パノラマ構図に変更**してユーザーへ伝達。立春の絵は横長版で作り直し予定（現状の縦長bg-risshun.webpはそれまで暫定使用、coverで中央部分が表示される）。
  - 確認状況: ローカルPlaywright（横長テスト画像）でパン可能幅・中央開始・スクロール中ドラッグの座標保存・リロード後の位置・写真フォールバック・ページ送りを確認済み。実機のスワイプ感触は未確認。

- 2026-07-12、**庭の節気背景イラストが24枚すべて揃った**（ユーザーがChatGPTで生成、Claude Codeが受け入れ・登録）。
  - `GARDEN_BACKGROUNDS`に立春〜大寒の全24節気を登録済み（`img/garden/bg-*.webp`、横長1536×1024・俯瞰パノラマ・固定構図: 左に池＋奥の生け垣沿いの小川が池に注ぐ＋飛び石＋右に一本の木）。受け入れ手順は毎回同じ: アップロード画像を目視確認→Chromiumのcanvasで長辺1536pxのWebP(0.85)に変換→登録→構文チェック。
  - 冬の4枚は 大雪=降雪・冬至=夕日と長い影・小寒=快晴の冬空・大寒=厚い雲と深い雪、で描き分けられている。
  - 未対応の論点: 大寒（真っ白）→立春（緑）の切り替わりが大きい。ユーザーと相談し「一年の巡りが締まって春に戻る演出」として意図的に残す方針（変えるなら立春を残雪ありで再生成）。
- 2026-07-12、街を**縦横自由にパン**できるようにした（横スクロールのみ→地図のように見わたす）。
  - `#machiScroller`を`overflow:auto`（両軸）にし、`machiIsoParams()`のタイルサイズを「画面にちょうど収まる」から「縦1.5画面・横2画面ぶんの大きい方」に拡大（ズームインした街をパンして見わたす）。初期位置は縦横とも中央。
  - タッチはネイティブスクロール任せ、マウスは専用の「地面をつかんでパン」ハンドラを追加（`pointerType==='mouse'`かつ`.machi-item`以外を掴んだときだけ。建物ドラッグとはターゲット判定で棲み分け）。
  - 確認状況: ローカルPlaywrightで両軸オーバーフロー・中央開始・両軸スクロール・建物ドラッグのスナップ共存・マウスパンを確認済み。注意: 絵文字建物のヒットボックスは見た目より上に広い（フォントボックス）ので、その真上を掴むとパンでなく建物ドラッグになる（仕様通りだが、画像差し替え時に当たり判定を絵に合わせると良い）。
- 2026-07-12、街の視点を**アイソメトリック（2:1ダイヤ型マス・シムシティ型）**に変更した（ユーザー要望）。データは(col,row)のまま`machiIsoParams`/`machiCornerToScreen`/`machiScreenToCell`で投影・逆投影し、地面とマス目はSVG data URIで描画、zIndex=col+rowの画家のアルゴリズムで奥行きを出す。ドラッグのスナップは足元座標の逆投影で判定（検証済み）。建物画像の生成指定はアイソメ視点に変更（MACHI_DESIGN.md更新済み）。
- 2026-07-12、**「じぶんのまち」の骨組みを前倒しで実装した**（ユーザー指示で庭完成前に着手。仕様はMACHI_DESIGN.md、画像は絵文字プレースホルダー）。
  - **グリッドエンジン**: 16列×10行、建物は1×1/2×2（`MACHI_ITEM_CATALOG`: スターター自宅＋無料12種＋プレミアム6種）。ドラッグで自由に動かし、離すと最寄りマスへスナップ（`machiCanPlace`で枠内・占有判定、置けなければ差し戻し）。自宅（2×2）は初回に中央(7,4)へ自動配置（`ensureMachiHome`）、移動可・撤去不可、**タップすると庭が開く**（庭z-index:44＞街43で上に重なり、庭を閉じると街に戻る）。
  - **獲得フローを2択化**: 旧`maybeAwardGardenItem`→`maybeAwardSticker`。全部○達成で`award-pending`に日付を保存し、2択トースト（`#awardChoiceToast`「🌸庭に置く/🏙街に置く/あとで」）を表示。選択で`chooseAwardCanvas()`→該当プールから抽選・配置・その画面を開いて思い出チップ表示。**庭・街あわせて1日1枚**（`hasAwardForDate`が両方を見る）。選択前に閉じてもload時に今日の分なら再提示（古いpendingは破棄）。人気計測カウンタ`award-choice-*`を加算。
  - ステッカー帳に「まち」セクション追加（サイズ表記・スターター/プレミアムバッジ・所持件数）。マス目は背景イラストが無い間は常時表示（入ったら配置モード時のみに変える予定）。
  - **直したバグ**: `openMachiView`が表示前に描画してマスサイズ0になる問題（表示→描画の順に修正）。庭と街のz-index重なり。
  - 未実装（設計書のスコープ通り）: 街の背景イラスト、建物ステッカー画像、自宅アップグレード、季節スキン。
  - 確認状況: ローカルPlaywright（スマホ幅）で2択トースト→街に配置→カウンタ→スナップ移動→占有差し戻し→自宅タップで庭→庭を閉じて街→同日再獲得なし、まで確認済み。実機未確認。

## 直近でCodexが変更した内容

コード上確認できた事実:

- App Store配信を見据え、1週間タブの横長表を「俯瞰用」として残しつつ、日付セルをタップして日別詳細パネル（`#weekDayPanel`）を開くUIを追加した。日別パネルには、その日の教材予定、○/×ボタン、教材詳細を開くボタン、Googleカレンダー予定、Google予定追加ボタン、感想・振り返り用textareaを表示する。
- 日別パネルの○/×は既存の `YYYY-MM-DD-subN-status` を使い、週表・今日やることタブと同じ状態を共有する。Google予定は既存の `googleEvents` / `getGoogleEventsForISO()` を再利用する。感想・振り返りは既存の `YYYY-MM-DD-sub8-content` を読み書きする。
- 日別パネルを開いている状態で週送りした場合、選択日が表示中の週から外れたらパネルを閉じる。Google予定同期後や○/×変更後は開いている日別パネルを再描画する。
- 1週間タブのスマホ表示をタップ中心に変更した。`#mobileWeekStrip` に7日分の日付カードを表示し、スマホ幅では `#weekTableScroll`（横長表）を初期非表示にする。`#weekOverviewToggleBtn` で「週間表を表示/隠す」を切り替える。PC幅では従来通り横長表を主表示し、日付カードは非表示。
- スマホ幅では、表示中の週に今日が含まれる場合は今日を自動選択し、含まれない場合は週初日を自動選択して日別詳細パネルを開く。日付カードには曜日、日付、予定件数、達成率を表示する。
- スマホ幅ではスクロール量を減らすため、教材追加欄と一週間の振り返りを `mobile-collapsible` で初期折りたたみにした。PC幅では従来通り中身を表示する。
- スマホ幅の1週間タブは `body.week-mobile-shell` を付け、ページスクロールを撤廃する固定レイアウトにした。`#weekView` をviewport内に固定し、日付カード・週移動ボタン・日別パネル・下部の教材追加/週振り返りトグルを1画面内に収める。今日やることタブ/Googleカレンダータブではこのbodyクラスを外し、通常スクロールに戻す。
- `index.html` に「バーコードで追加」ボタンと `isbnScannerModal` を追加した。
- カメラ読み取りはブラウザ標準の `BarcodeDetector` を使う。非対応時もISBN手入力で検索できる。
- ISBNは13桁チェックサムを検証する。10桁ISBNは13桁へ変換して検索する。
- 書籍情報は openBD API を先に参照し、未取得なら Google Books API の公開検索へフォールバックする。
- 検索結果はプレビュー表示し、「この教材を追加」で `materials-list` に書名、`material-details` にISBN・書名・著者・出版社・出版日・表紙URL・ページ数・取得元を保存する。
- 教材詳細パネルに書籍メタ情報を表示する `bookMetaPanel` を追加した。
- 教材詳細の「保存」と「毎日」は `Object.assign` で既存詳細を引き継ぎ、ISBN/書籍メタ情報を消さないようにした。

未確認事項:

- 実カメラでのバーコード読み取り。
- 日付セルタップ→日別詳細パネル表示、日別パネル内の○/×、教材詳細ボタン、Google予定追加ボタン、振り返りtextareaの実ブラウザ手動操作。
- 公開URL上でのopenBD/Google Books通信とCORS。
- iPhone/Androidでの `BarcodeDetector` 対応。非対応時はISBN手入力にフォールバックする設計。
- ローカルPlaywrightでの日別詳細パネル操作は確認済み。ISBN手入力フロー確認は未実施。

## 保存キー・データ構造

コード上確認できた事実:

- 教材リスト: `materials-list`
- 教材詳細: `material-details`
- 週始まり設定: `weekStart`
- 週の振り返り: `weekly-summary-YYYY-MM-DD`
- 一週間の目標（2026-07-12追加）: `weekly-goal-YYYY-MM-DD`（キーは週開始ISO、週の区切りは`weekStart`設定に従う）。一度保存したらUI上は変更不可。Firestore同期は`weeklySummaries/{ISO}`ドキュメントの`goal`フィールドに相乗り。
- セル内容: `YYYY-MM-DD-subN-content`
- 完了状況: `YYYY-MM-DD-subN-status`
- 日記（2026-07-08追加、日別詳細パネルの「感想・振り返り」の下に追加）: `YYYY-MM-DD-diary`。科目に紐づかない、その日1件だけの自由記述欄。Firestore同期は`days/{iso}`ドキュメントの`diary`フィールド。
- 通知時刻: `notify-time`
- 今日は何の日キャッシュ: `today-trivia-YYYY-MM-DD`
- Googleカレンダー選択: `google-calendar-ids`
- じぶんのまちの建物（2026-07-12追加）: `machi-items`（JSON配列 `{uid,type,earnedDate,col,row}`。グリッド16×10のマス番地）。獲得の人気計測: `award-choice-garden`/`award-choice-machi`（数値文字列）。3キームとも`app/settings`同期（`machiItems`/`awardChoiceGarden`/`awardChoiceMachi`フィールド）。
- 未選択のごほうび: `award-pending`（ISO日付。庭/街の2択を選ぶ前にアプリを閉じた場合の再提示用。端末ローカルのみ・同期対象外）
- じぶんの庭のアイテム（2026-07-12追加）: `garden-items`（JSON配列 `{uid,type,earnedDate,sekki,x,y}`。x/yは庭に対する%座標）。Firestore同期は`app/settings`ドキュメントの`gardenItems`フィールド。
- Google access token一時保存: `google-token`
- Googleカレンダー長期連携セッション: `google-calendar-session-id`、`google-calendar-session-secret`（端末ローカルのみ。Firestore同期対象外）
- バーコード追加された教材の `material-details` には `isbn`、`bookTitle`、`authors`、`publisher`、`publishedDate`、`coverImage`、`description`、`pageCount`、`source` が入り得る。
- `material-details` の `completedUnits` は「進捗（完了済みの単位数）」。目次リスト（`tocList`）や数値単位（`units`）はそのまま残し、スケジュール計算（`scheduleMaterial`/`scheduleMaterialDaily`）だけがこの件数分を先頭からスキップする。
- `device-id`: プッシュ通知購読者IDとして使う端末ごとのランダムID（未サインイン時のみ使用）。クラウド同期の対象外。

Firestore同期対象（サインイン時のみ、`classifyStorageKey()`が分類）:

- `weekStart`、`notify-time`、`google-calendar-ids`、`header-sub1..8` → `users/{uid}/app/settings`
- `materials-list`、`material-details` → `users/{uid}/app/materials`（JSON文字列のまま）
- `<YYYY-MM-DD>-sub<N>-content/-status` → `users/{uid}/days/{YYYY-MM-DD}`
- `weekly-summary-<ISO>`・`weekly-goal-<ISO>` → `users/{uid}/weeklySummaries/{ISO}`（`text`/`goal`フィールド）
- 同期対象外: `google-token`、`google-calendar-session-id`、`google-calendar-session-secret`、`today-trivia-*`、`device-id`

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

### アカウント同期（Firebase）

コード上確認できた事実:

- `FIREBASE_CONFIG`（`index.html`内、`GOOGLE_CLIENT_ID`の近く）は実際のFirebaseプロジェクト（`keikakuchou-37440`）の値に設定済み。Authentication（Googleプロバイダ）・Firestore（Nativeモード）・セキュリティルール・承認済みドメイン（`michael-anderson-official.github.io`）はユーザーがコンソールで設定済み。
- `.account-section`（設定モーダル内）の`#accountSignInContainer`に、Google Identity Servicesの「サインインボタン」を`renderGoogleSignInButton()`で描画する。クリックで取得したIDトークンを`handleGoogleIdCredential()`が受け取り、`window.appAuth.signInWithIdToken(idToken)`（内部で`signInWithCredential`）を呼ぶ。
- 当初`signInWithPopup`→`signInWithRedirect`の順で試したが、どちらも実機（iPhone Safari）で失敗を確認した：`signInWithPopup`は承認済みドメイン未設定時に`auth/unauthorized-domain`、承認済みドメイン設定後も`signInWithRedirect`は「Unable to process request due to missing initial state」（Safariのストレージ分離/ITPが`firebaseapp.com`とのセッション受け渡しをブロックするため）。最終的にGoogleカレンダー連携と同じGIS方式に統一して解決した。
- サインイン成功時は`window.handleAuthStateChange(user)`が呼ばれ、`window.appDb.pullAll(uid)`で既存のクラウドデータを確認する。空なら現在の`localStorage`をシードとしてアップロード（`seedCloudFromLocalStorage()`）、空でなければクラウドのデータを`localStorage`へ書き戻して`loadMaterials()`/`updateWeekUI()`/`updateCellsForCurrentWeek()`で再描画する（`applyCloudDataToLocalStorage()`）。
- 以後の`localStorage`書き込みは`Storage.prototype`フック経由で自動的に検知され、1.5秒debounce後にFirestoreへ洗い替え保存される（`markCloudSyncDirty`/`flushCloudSync`）。個別の保存関数は変更していない。
- サインインは任意。サインインしなければFirebase関連コードは一切呼ばれず、今まで通り`localStorage`のみで動く。

実機確認済み（2026-07-08、iPhone Safari）:

- GIS方式でのGoogleサインイン成功。初回シード（「この端末のデータをクラウドに保存しました。」表示）まで一連で動作した。
- 前提としてFirebaseコンソール側で、Googleプロバイダの「外部プロジェクトのクライアントIDの許可リスト」に`GOOGLE_CLIENT_ID`（Calendar用OAuthクライアント）を登録済み。これが無いとIDトークンが`auth/invalid-credential`で拒否される。

未確認事項:

- 2台目端末でサインインした際に、意図通りクラウドのデータで`localStorage`が上書きされるか（空でないクラウドへ誤って空のシードをアップロードしていないか）。
- サインイン後の日常操作（セル入力・教材保存など）がdebounce経由でFirestoreに反映され続けるかの長期動作。
- Firebase Authの独自セッション永続化（IndexedDB）と`localStorage`という2つの永続化機構が長期的に問題を起こさないか。

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
- Workerは `/subscribe` のPOSTで `{ subscriberId, subscription, hour, minute }` を受け取り、KV `sub:<subscriberId>` に保存する（`lastSentDate`は既存値があれば引き継ぐ）。
- WorkerはGoogleカレンダー長期連携用に `POST /google/code` と `POST /google/token` を持つ。`/google/code` はGISの認可コードをGoogle token endpointへ交換し、KV `googlecal:<sessionId>` にrefresh token/access token/期限/セッション秘密情報のハッシュを保存する。`/google/token` は保存済みrefresh tokenで新しいaccess tokenを返す。
- WorkerのGoogleカレンダー長期連携にはCloudflare側で `GOOGLE_OAUTH_CLIENT_ID`（変数）と `GOOGLE_OAUTH_CLIENT_SECRET`（secret）の設定が必要。`GOOGLE_OAUTH_CLIENT_ID` は `worker/wrangler.toml` の `[vars]` に追加済み。`GOOGLE_OAUTH_CLIENT_SECRET` は2026-07-08にWranglerで設定済み。client secretとrefresh tokenはリポジトリやブラウザに置かない。
- Workerのscheduled handlerは `sub:` プレフィックスで全購読を`KV.list()`して走査し、購読ごとにJST換算で指定時刻を過ぎていて`lastSentDate`が今日でなければpush送信し、送信後に購読ごとの`lastSentDate`を更新する。
- Workerは `VAPID_PRIVATE_JWK`、`VAPID_PUBLIC_KEY`、`VAPID_SUBJECT` をCloudflare env/secretから読む。
- `worker/wrangler.toml` には `NOTIFY_KV` binding idと cron `* * * * *` が書かれている。
- 公開Workerは `OPTIONS /subscribe` に200、CORS `Access-Control-Allow-Origin: *`、`Access-Control-Allow-Methods: POST, OPTIONS`、`Access-Control-Allow-Headers: Content-Type` を返した。
- 公開Workerは空JSONの `POST /subscribe` に400 `{"error":"invalid body"}` を返した。

未確認事項:

- 実際に有効なsubscriptionを保存してpush送信できるかは未確認。
- Cloudflare側のKV binding、VAPID secrets、Cron Triggerが本番で正しく設定されているかは未確認。
- Cloudflare側の `GOOGLE_OAUTH_CLIENT_SECRET` は本番設定済み。公開Workerの `/google/token` はダミーsessionにHTTP 401を返すところまで確認済み（secret未設定時の503は解消）。
- Worker logsでscheduled eventが毎分動いているかは未確認。

危険箇所:

- push送信に失敗しても `lastSentDate` を書くため、その日は再送されない（購読ごとの状態になったが、失敗時に再試行しない挙動自体は変わっていない）。
- Worker本体は2026-07-08にWranglerで本番デプロイ済み（Version ID: `7d320142-2306-4dc2-b633-9abeb228baf1`）。`GOOGLE_OAUTH_CLIENT_SECRET` も設定済みだが、実ブラウザでの初回認可コード交換と1時間後の自動更新は未確認。

## secret混入確認

確認済み:

- 現在のファイルとGit履歴で `-----BEGIN`、`PRIVATE KEY`、JWK秘密値の `"d":` は検出されなかった。
- リポジトリ内にあるのは公開VAPID鍵、Google OAuth client ID、Cloudflare Workerの環境変数名、KV namespace id。

注意:

- Google OAuth client ID、Firebase apiKey、VAPID public keyは公開情報。
- `VAPID_PRIVATE_JWK`、`GOOGLE_OAUTH_CLIENT_SECRET`、Cloudflare API token、Google refresh tokenは絶対にコミットしない。
- 実行時のGoogle access tokenは `localStorage` の `google-token` に短時間保存される。refresh tokenはWorker側のKVにのみ保存する。

## 確認済みの動作

コード/HTTP応答で確認済み:

- `index.html` の最終 `<script>` は `new Function(script)` で構文OK。
- 2026-07-08時点の `index.html` は、Firebaseのmodule scriptを除いた非module scriptと `manifest.json` の構文確認OK。
- ISBN/バーコード追加後の `index.html` の最終 `<script>` も `new Function(script)` で構文OK。
- 外部HTTPSテストで openBD は `9784003101018` に対してHTTP 200、タイトル `吾輩は猫である` を返した。
- 同じ外部HTTPSテストで Google Books はHTTP 429を返した。この環境の一時的な制限か、API側のレート制限かは未切り分け。
- `worker/worker.js` はES moduleとしてimportできる。
- `worker/worker.js` の `/google/token` はローカルモックで、OAuth secret未設定時503、保存セッションなし401、保存済みaccess tokenあり200を確認済み。
- `manifest.json` はJSON parseできる。
- GitHub Pagesのdeployment状態は作業時点ごとにGitHub側または公開URLで確認する。
- 公開 `index.html` が通知Worker URLとGoogle client IDを含むことは過去に確認済み。最新push後は再確認する。
- 公開 `sw.js` はpush通知表示処理を含む。
- 公開Workerの `/subscribe` はCORS preflightと不正bodyへの400を返す。
- 公開Workerの `/google/token` はダミーsessionにHTTP 401を返す（`GOOGLE_OAUTH_CLIENT_SECRET` 設定済みで、保存済みsessionがない場合の想定どおりのエラー）。
- 2026-07-08のApp Store向けタップ操作UI追加後、`index.html` の非module scriptは `new Function(script)` で構文OK。ローカルHTTPサーバー（`python -m http.server 4173`）で `index.html` がHTTP 200を返し、`weekDayPanel` / `renderWeekDayPanel` を含むことを確認済み。
- Playwright 1.61.1 + Chromiumを一時フォルダ（`%TEMP%\codex-playwright-study-plan`）へインストールし、スマホ幅390x844とPC幅1280x900で、日付セルタップ→日別詳細パネル表示、教材予定2件表示、○ボタン選択、週表バッジ同期、振り返りtextarea保存、未連携時のGoogle予定追加ボタン非表示を自動確認済み。スクリーンショットは `%TEMP%\study-plan-mobile.png` / `%TEMP%\study-plan-desktop.png`。
- スマホ幅390x844で、日付カード7件表示、日別詳細パネル自動表示、横長表の初期非表示、週初日カードタップ後の教材予定2件表示、「週間表を表示」ボタンによる横長表表示をPlaywrightで確認済み。PC幅1280x900では日付カード非表示、横長表表示のままを確認済み。スクリーンショットは `%TEMP%\study-plan-week-mobile.png` / `%TEMP%\study-plan-week-desktop.png`。
- スマホ幅390x844で、教材追加欄と一週間の振り返りが初期折りたたみ、教材追加欄タップで展開、展開時の内側見出し非表示をPlaywrightで確認済み。スクリーンショットは `%TEMP%\study-plan-collapse-initial-mobile.png`。
- スマホ幅390x844で、1週間タブの `body` overflow が `hidden`、`window.scrollY` がホイール後も0、主要表示要素の下端がviewport内に収まることをPlaywrightで確認済み。初期状態スクリーンショットは `%TEMP%\study-plan-no-scroll-initial-mobile.png`、週振り返り展開状態は `%TEMP%\study-plan-no-scroll-mobile.png`。

## 未確認の動作

- PC/スマホでの最新UIの実操作。
- 1週間タブの日付カード/日別詳細パネル/週間表トグルの手動実機操作。
- 実カメラでのISBNバーコード読み取り。
- ISBN手入力からopenBD/Google Booksで書籍情報を取得し、教材追加できるかの公開URL上での実操作。
- ISBN手入力から教材追加するフローのローカルPlaywright確認。
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
- 教材詳細保存や「毎日」は `clearMaterialContentCells(idx)` で該当列の全日付セルを消してから再割り当てする。
- 科目1〜7のセルは直接編集を廃止した（`contenteditable`を外した）。タップで○✕切り替えの吹き出し（`#statusBubble`）が出る。空セルでは出ない。今日以前の日付に新しく✕を付けると後ろ倒しの確認ポップアップが出る。8列目（感想・振り返り）だけは`contenteditable`のまま。
- 教材列は実質7教材分。8列目は感想・振り返り用。
- `sw.js` の通知クリックはURLに `index.html` を含むクライアントだけフォーカス対象にしている。ルートURLで開いているタブはフォーカスされない可能性がある。
- `holidays2026` は固定リスト。
- `FIREBASE_CONFIG`は実際のFirebaseプロジェクト `keikakuchou-37440` の公開クライアント設定に置き換え済み。apiKey等は公開クライアント向けの値でsecretではない。アカウント同期の実際の保護はFirestoreセキュリティルール側で行う。
- `BarcodeDetector` はブラウザ対応差がある。Safari等の非対応環境ではCDN読み込みの `ZXing`（`@zxing/library@0.23.0`）にフォールバックする。両方使えない環境ではISBN手入力を使う。
- openBD/Google Booksの公開API仕様、CORS、レート制限に依存する。APIキーや秘密情報は使っていない。Google Booksが429を返す場合は、検索失敗ではなく取得失敗として扱う。
- 目次自動取得（`/toc`）は非公式スクレイピング。hanmoto.comの公式APIではなくHTML構造に依存しているため、サイト改修で無言で取れなくなる可能性がある。取得失敗時は静かに諦める設計（エラー表示せず、手入力のまま）。

## 次にやるべき作業

優先度高:

- **Googleカレンダーのサインインが約1時間で切れる問題への対応（2026-07-08に認可コードフロー方式を実装）。**
  - 旧状態: `initTokenClient()`のトークンモデルだけを使っていたため、access tokenが約1時間で失効し、期限切れ後は手動サインインが必要だった。
  - 新状態: `index.html` の `initGoogleAuth()` は `google.accounts.oauth2.initCodeClient()` を使う。取得した認可コードをWorker `POST /google/code` に渡し、WorkerがGoogle token endpointでaccess token/refresh tokenに交換する。以後、`fetchGoogleApi()` が期限切れや401時に `POST /google/token` でaccess tokenを更新する。
  - ブラウザ側に保存するのは `google-token`（短期access token）と `google-calendar-session-id` / `google-calendar-session-secret`（Worker上の保存済みrefresh tokenを取り出すための端末ローカル秘密情報）のみ。refresh tokenとclient secretはWorker/KV側だけに置く。
  - 完了済み: Cloudflare Worker本番デプロイ、`GOOGLE_OAUTH_CLIENT_ID` 変数追加、Cloudflare Worker secret `GOOGLE_OAUTH_CLIENT_SECRET` 設定、公開Worker `/google/token` のダミーsession 401応答確認。
  - **2026-07-08、ユーザーが実機（iPhone）で確認: 再サインインを求められなくなったことを報告済み。** ただし「厳密に1時間以上放置してから自動更新される瞬間を確認した」わけではなく、日常利用の中で再サインイン不要になったという報告ベース。致命的な問題は無さそうだが、正式に「解決済み」と扱ってよい。
- **2026-07-08、Claude Codeが「今日やること」「Googleカレンダー」タブを廃止し、1週間タブ1本＋右上の通知ベルに統合した（詳細は上の「直近でClaude Codeが変更した内容」参照）。構文チェックのみ済み、実ブラウザでの見た目は未確認。** 特に以下は要確認:
  - モバイル幅で`#weekView`のtop位置オフセットを`5.9rem`→`3rem`に見積もりで変更した。タブバー分の高さを引いただけの概算のため、実機で隙間や重なりが無いか確認する。（2026-07-08追記: 教材追加欄/週の振り返りの展開時オーバーレイ`.mobile-collapsible.is-open`側にも同じ`5.9rem`が残っていて直し忘れていたため、こちらも`3rem`に合わせて修正済み。`5.9rem`の値自体はもう残っていないことを確認済み）
- 2026-07-08、「節気の写真が綺麗なのにほとんど見えない」との指摘を受け、モバイルの日別詳細パネル・日付カード・空状態表示の背景不透明度を下げた（`.week-day-panel` 0.72→0.48、`.week-day-task` 不透明`#fff`→0.6、`.mobile-week-day-card` 0.72→0.55、`.week-day-empty` 0.62→0.48、`.mobile-collapsible.is-open` 0.92→0.8）。あわせて背景写真自体の白オーバーレイ（`applySekkiPhoto()`内）も0.4→0.28に下げた。フォーム系（`.week-day-reflection`のtextarea、ボタン類）はあえて不透明のまま残した（可読性・入力欄としての視認性を優先）。
  - 同日、追加で「背景見えるように透過させて」との要望があり、上記で不透明のまま残した`.week-day-reflection`（不透明`#fff`→0.55）と`.mobile-collapsible.is-open`（0.8→0.55）もさらに透過させた。フォームの可読性より背景の視認性を優先する方針に変更（ユーザーの明示的な指示のため）。
- 2026-07-08、日別詳細パネルの「感想・振り返り」の下に「日記」欄（`#weekDayDiary`、`week-day-reflection`と同じスタイルを流用）を追加した。データは新しい`YYYY-MM-DD-diary`キー（科目に紐づかない、その日1件だけ）。`classifyStorageKey()`に`^(\d{4}-\d{2}-\d{2})-diary$`のマッチを追加し、`days/{iso}`ドキュメントの`diary`フィールドとしてFirestore同期される。表本体（週表・日付セル）には表示しない（日別パネル限定の欄）。
  - 設定アイコン（左上）と通知ベル（右上）が両方とも`position:fixed`で正しく表示されるか、重ならないか。
  - 通知ベルのバッジ（未チェック件数）が正しく表示・非表示されるか、モーダルの開閉・○✕操作が問題なく動くか。
  - 設定モーダル内に移設したGoogleカレンダー連携セクション（サインイン・カレンダー選択・同期ボタン）が、タブ時代と同じように動くか。
  - 複数カレンダーのチェックボックスで選択・解除したときに、週表・日別パネルの予定表示が正しく増減するか。既存予定の編集・削除が正しいカレンダーに対して行われるか（特に、複数カレンダーで同名の予定IDが衝突しないか）。
- push失敗時に `lastSentDate` を書かない、または失敗状態を記録して再試行できるようにする。
- Cloudflareダッシュボードまたは `wrangler` でKV binding、VAPID secrets、Cron Triggerの実設定を確認する。
- 実機で通知購読と翌分/翌日のpush送信を確認する（Firebaseサインイン中のuid単位の購読は2026-07-08に実機確認済み、未サインイン時のdevice-id単位は未確認）。

優先度中:

- Worker `/toc` エンドポイントの実際のISBNでの目次自動取得を、複数の書籍で追加確認する（1件は実機確認済み）。
- 教材削除後の既存予定の扱いを仕様決定する。
- 教材詳細保存時に手入力セルを消してよいか確認し、必要なら自動割り当て分だけを管理する設計へ変更する。
- `sw.js` の通知クリック時フォーカス判定をルートURLにも対応させる。
- 2台目端末でのFirebaseサインイン→クラウドデータのpull（空でないシード上書き防止）を実機確認する。

優先度低:

- 2027年以降の祝日対応。
- PC/スマホ幅の表示崩れ確認。
- 最小限のDOM操作テスト方針を決める。
- 二十四節気テーマを実機で確認し、配色や季節モチーフの密度を調整する。
