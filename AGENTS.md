# AGENTS.md

このリポジトリは、AIエージェントが引き継いで作業する前提です。最初にこのファイルを読んでください。

## プロジェクト概要

- 目的: 1週間の学習計画を、予習欄・復習欄・教材リスト・週の振り返りで管理する静的Webアプリ。
- 実装: ルート直下の `index.html` だけで動く単一HTMLアプリ。
- 使用技術: HTML / CSS / Vanilla JavaScript。外部ライブラリ、ビルドツール、npm依存はなし。
- 保存: ブラウザの `localStorage`。
- 公開: GitHub Pages。

## 起動・ビルド・テスト

- 起動: 任意の静的HTTPサーバーでルートを配信する。例: `python -m http.server 8765`
- 公開URL: `https://michael-anderson-official.github.io/study-plan-app/`
- ビルド: 不要。
- 構文確認: `index.html` 内の `<script>` を抽出して `new Function(script)` で確認する。
- 手動確認: PC幅とスマホ幅の両方で、教材追加、教材詳細、削除、週移動、リセット、振り返り保存を確認する。

## コーディング方針

- 依存関係を増やさない。必要がなければ単一HTML構成を維持する。
- 既存の素朴な Vanilla JS スタイルに合わせる。
- `localStorage` から読むJSONは、必ず `try/catch` と `Array.isArray` などで型を確認する。
- 既存データを壊す変更を避ける。保存キーを変える場合は移行処理を書く。
- 既存の教材リスト、教材詳細、週ごとの記録を勝手に削除しない。

## 日付・週表示の注意

- 日本時間で使う前提。`toLocalISO(date)` と `parseISOToDate(iso)` を使い、UTC由来の日付ずれを避ける。
- 週の開始日は `localStorage` の `weekStart` に保存される。値は `monday` または `sunday`。
- `window.currentWeekStartISO` を基準に、表の行ラベルと各セルの `data-key` を更新する。
- 今日ハイライトはブラウザのローカル日付を `toLocalISO` で比較する。
- 祝日判定は現在 `holidays2026` の固定セット。年をまたぐ変更では更新が必要。

## UI確認時の注意

- カレンダー上部のヘッダーには教材名が入る。セル内に教材名を重複表示しない。
- 「一週間をリセット」は、現在週のセル内容だけを消す。教材、教材詳細、ヘッダー、週の振り返りは消さない。
- 教材削除は教材詳細パネル内の「削除」ボタンで行う。
- 教材削除後も、カレンダーにすでに記入済みの予定は残る。
