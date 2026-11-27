<p align="right"><a href="README.md">English</a> | <strong>日本語</strong></p>

# Pathway

### 🏆 Oxford Venture 2026 Hackathon 優勝

**参加者115人の大会で、初対面の4人が36時間で開発。**

古いスマートフォンを歩行器に取り付け、足元の障害物を検出し、転倒の可能性があったときに介護者へ知らせられないか。その問いから始まったプロジェクトです。

[**ブラウザーデモを試す**](https://jsmitty78.github.io/Pathway-Oxford1stPlaceHackathon/) · [**写真付きの全編ストーリー**](docs/HACKATHON_STORY.ja.md) · [当時の動画](README.md#original-hackathon-footage) · [技術仕様の全編](README.md)

<img src="assets/hackathon/first-place-team.jpg" alt="オックスフォードで優勝証書を持つ4人のPathwayチーム" width="720">

*会場で出会い、36時間後に優勝したチーム。*

## 最初に知っていただきたいこと

このリポジトリでは、ハッカソンの試作を**後から再構築したブラウザーデモ**を動かせます。当時のPython危険物検出器は元の判定ルールとともに残っていますが、元のiOSソースはありません。JavaScriptの判定エンジンは後から再構築し、27件のテストを用意しています。[当時の成果と再構築の区別](docs/HACKATHON_STORY.ja.md)を詳しく説明しています。

現在の[iPhone 15 Pro向けSwiftUI実装案](https://github.com/Jsmitty78/Pathway-Oxford1stPlaceHackathon/pull/1)は新しい実装です。シミュレータービルドとコアのテスト7件は成功していますが、モデルの導入と実機確認は残っています。

## 36時間の中で取り組んだこと

街頭で32人に話を聞き、屋内の障害物に焦点を絞りました。歩行器が借りられず、午前2時ごろに友人の友人からラクロスのスティックを、午前3時ごろには別の友人から3Dプリンターを借りました。クリップを設計し、即席のフレームにスマートフォンを固定してテストしました。

Saïd Business Schoolの近くで試し、発表ではフレームを倒して転倒を模擬し、チームの電話への実際の着信を見せました。元の記録では連絡のすべての段階が自動か確認できません。ブラウザーデモでは連絡を模擬し、実際のSMS・通話は送りません。

私は調査、実機統合、テスト、ピッチを担当しました。Caleb Byrne、Antony He、Aiyush Guptaとの共同開発です。受賞、Keble Collegeでのお祝い、J-StarXでの新しい友人との時間まで、[全編の日本語ストーリー](docs/HACKATHON_STORY.ja.md)に写真とともに残しています。

## 動作を試す

ブラウザーデモはビルド不要です。ホスト版を開くか、Node.js **22以降**でローカル起動します。

```sh
git clone https://github.com/Jsmitty78/Pathway-Oxford1stPlaceHackathon.git
cd Pathway-Oxford1stPlaceHackathon
npm start
```

`http://localhost:5173`を開きます。依存パッケージのインストールは不要です。録画の再生に必要なHTTP Rangeに対応するため、付属のサーバーを使用してください。

```sh
npm run check
```

構文と27件の合成シナリオのテストを確認します。実際の人の転倒検出精度やカメラの精度を測定するものではありません。

## 仕組みを見る

```mermaid
flowchart TD
    Camera["カメラの検出・室内の障害物"] --> Hazard["足元の条件と危険度を評価"]
    Motion["合成した運動センサー入力"] --> Fall["転倒の可能性を評価"]
    Hazard --> Triage["優先度と対応を判断"]
    Fall --> Triage
    Triage --> UI["本人への確認・模擬の介護者通知"]
```

| 確認する内容 | 資料・コード |
|---|---|
| 全体構成、センサー、処理の流れ | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| しきい値、重み、優先度の技術判断 | [TECHNICAL_DECISIONS.md](docs/TECHNICAL_DECISIONS.md) |
| 当時のコードと再構築した部分 | [RECONSTRUCTION_NOTES.md](docs/RECONSTRUCTION_NOTES.md) |
| 当時のPython検出器 | [hazard_detector.py](vision/hazard_detector.py) |
| ブラウザーの判定エンジン | [pathwayEngine.js](src/pathwayEngine.js) |
| 合成シナリオとテスト | [サンプル](data/sampleEvents.js) · [テスト](test/hazardEngine.test.js) |
| 次の開発計画 | [ROADMAP.md](docs/ROADMAP.md) |
| 元の動画・画像の扱い | [assets/README.md](assets/README.md) |

元の英語READMEには、当時の市場数値、費用の仮定、数式、全ファイルの説明、動画をそのまま保存しています。詳細な開発記録は[全編ストーリー](docs/HACKATHON_STORY.ja.md)、数式を含む仕様は[元の技術資料](README.md)から確認できます。

Pathwayは医療機器ではなく、臨床検証も行っていません。転倒の危険がある方の安全を、この試作に依存させることはできません。


## ピッチで示した課題と費用の考え方

当時は、英国で2024年に転倒が原因となった救急受診22万件（NICE）、65歳以上の外傷関連死の主な原因が転倒であることと2021年の死亡者3万8,000人以上（米国CDC）、NHSの年間約23億ポンドの費用（NHS England）をピッチに使いました。これは当時の調査として記録している数値です。

NHSが無償提供する歩行器に対し、比較した製品は2,499ドルから、さらに月50ドルがかかり、創業6年後にも未出荷でした。すでにある歩行器とスマートフォンを使う前提で、追加ハードウェアを**0.24ポンド**、比較対象の約1万分の1と見積もりました。全製品の費用を測定した数字ではありません。

> 「自分が転ぶことより、誰も助けられないときに両親が転ぶことが一番怖い。」
>
> — オックスフォードシャーのSarahさん、42歳。ピッチデックに掲載した言葉の日本語訳。

| 提案した機能 | 目指した動作 |
|---|---|
| 足元を見る | 端末で物体を検出し、ソファや台の上のカップを除外して足元の物を示す。 |
| 部屋を覚える | ラグの端や段差など、固定の危険物を室内マップに残す。 |
| 転倒を感じ取る | 角加速度、衝撃、その後の静止などを組み合わせて評価する。 |
| 人につなぐ | 取り消せる画面確認の後、位置付きのメッセージ、電話へ進む。 |

## 36時間の進行

| 時点 | 取り組んだこと |
|---|---|
| 0時間 | 会場でチームを組み、高齢者の転倒を課題にしてホワイトボードで考える。 |
| 3〜8時間 | 街頭で32人に聞き取り。68%が過去1年に転倒した高齢者を知っていた。屋内中心の生活という声で、屋内検出を中心に変更。 |
| 並行して | 介護施設4か所へ連絡し2か所が後日のデモに関心。専門家2人からも関心を得る。 |
| 機材探し | 知り合いや介護施設に電話したが、間に合う歩行器は借りられない。 |
| 午前2時ごろ | 友人の友人から古いラクロスのスティックを借り、テープでデモ用フレームを組む。 |
| 午前3時ごろ | 別の友人の3Dプリンターを街中で運ぶ。まだ誰も寝ていなかった。 |
| 夜通し | クリップを設計・印刷し、スマートフォンを固定してテストと調整。 |
| 発表前 | オックスフォード駅に近いSaïd Business Schoolの周辺でテストし、人にもデモを試してもらう。 |
| 36時間 | 最終ピッチと、模擬転倒から実際のチームの電話への着信を見せる実演。 |

即席のフレームの形、安定性、材質を実際の歩行器として検証したわけではありません。体重を支える道具ではなく、実演用でした。介護施設との正式な提携や試験も未成立で、調査の数値は当時チームが発表したものであり、このリポジトリで独立検証した結果ではありません。

J-StarXで来たオックスフォードでは、Caleb、Antony、Aiyushと協力し、新しい友人もたくさんできました。発表と優勝の後はKeble Collegeの舞踏会とバーでお祝いしました。午前2時・3時は記憶に基づくおおよその時刻で、カレッジの写真はその夜だけでなく滞在中の記録です。

## 当時の映像

ここにあるのは再構築版ではなく、当時の映像です。H.264、音声なし、各0.4〜6.7MBで、ブラウザーから開けます。iOSの映像は、撮影した歩行映像を入力するシミュレーター録画です。冒頭の「demo video」表示はそのためで、画面、重ねた表示、履歴は当時のアプリのものです。

| 動画 | 見られる内容 |
|---|---|
| [1：物体検出](assets/videos/original-live-object-detection.mp4) | ソファもぬいぐるみも物体として緑の枠で表示。まだ危険かどうかは判断しない。 |
| [2：床の危険物](assets/videos/original-floor-hazard-detection.mp4) | 床のぬいぐるみだけが赤い枠になり、ソファ、カップ、テーブルは除外される。`classifyDetection()`へ移植したルール。 |
| [3：当時のiPhoneアプリ](assets/videos/original-pathway-ios-app.mp4) | カメラ、大きな操作ボタン、矢印、「Rug detected」「Teddy bear detected」の通知。 |
| [4：当時の履歴](assets/videos/original-incident-log.mp4) | `t = 1s`のめくれたラグ、`t = 10s`の床の障害物を、画像と時刻付きで記録。 |

ピッチ全体の動画には実際の電話番号、個人名、介護施設名が映るため、公開していません。下の最終発表の画像はそれらを含まない静止画で、動画全編へのリンクではありません。[出典と伏せた箇所](assets/README.md)を記載しています。

## 再利用を考えた理由

既存の歩行器を置き換えず、使わなくなったスマートフォンのカメラ、加速度計、ジャイロ、通信、計算機能を再利用できないかと考えました。新しい装置を一式つくる必要を減らし、眠っている端末に別の用途を与える可能性に関心がありました。

デックでは、40.4%が2〜3年ごとにスマートフォンを買い替えること、世界で毎年50億台以上が廃棄されるという数字を引用しました。**Pathway自体の環境負荷削減は測定していません。** 設計の方向性として考えたもので、定量的な成果ではありません。[市場規模・競合・顧客像のまとめ](docs/PITCH_DECK_SUMMARY.md)もあります。

## デモで試してほしい操作

1. **Play demo flow**で、ピッチの6段階と、転倒確認・介護者への模擬連絡を順に確認します。
2. **Distance walked toward the scene**を動かします。近づくと物体が大きくなり、画面の下側へ移動します。ぬいぐるみが危険領域に入り、追跡から警告へ変わります。座標を決め打ちした演出ではなく、投影した形状にルールを適用しています。
3. **Clear path**で前進します。テーブルは危険物になり得ますが、椅子は上端の除外ルールに該当します。
4. **Why objects were filtered out**で、除外した物体とその理由を確認します。
5. **Possible fall**のカウントダウン中に**Crisis averted**を押すと、連絡の流れを取り消せます。どの場合も実際の連絡は行いません。

| 段階 | 表示する内容 |
|---|---|
| 1：動的物体検出 | 認識した物に、当時のPythonと同じ緑の枠を付ける。 |
| 2：室内の固定マップ | COCOのクラスでは扱えない固定の危険物も、水色の線で示す。 |
| 3：危険物の選別 | 条件を通過した物だけに太い赤枠を付ける。 |
| 4：D.A.I.屋内案内 | 通れる経路を探し、方向や小さな段差を越える案内を表示。 |
| 5：転倒検出 | 角加速度と6種類の信号の内訳。 |
| 6：イベントへの対応 | 記録→確認→点滅→メッセージ→通話を、模擬の介護者画面へ表示。 |

## 詳細な構成とモジュール

```mermaid
flowchart LR
    CAM["カメラ"] --> DYN["動的物体検出"] --> FIL["危険物の選別"]
    LID["LiDAR・深度"] --> MAP["室内の固定マップ"] --> FIL
    FIL --> SCO["危険度の計算"] --> DAI["通行経路の探索"] --> GUI["矢印・音声による案内"]
    SCO --> TRI["イベントの優先度"]
    IMU["ジャイロ・加速度計"] --> FAL["角加速度を中心とする転倒判定"] --> TRI
    TRI --> LOG["履歴と室内マップ"]
    TRI -->|緊急| HLP["HELP表示・15秒の取り消し"] -->|取り消さない| ESC["点滅・SMS・通話の模擬"]
    TRI -->|注意・高リスク| GUI
```

| 関数 | 役割 |
|---|---|
| `projectPoint` / `projectDetection` | 高さ0.92m、下向き20°のカメラによるピンホール投影。 |
| `classifyDetection` | 当時のPythonの`isHazard()`を移植。 |
| `scoreHazards` | 距離、進路との位置、種類の深刻度、確信度で優先順位を付ける。 |
| `detectFallRisk` | 角加速度を最も重くした6信号の評価。 |
| `planGuidance` | 障害物を避け、低い段差を越える経路の探索。 |
| `triageEvent` | 動きと場面の根拠を組み合わせ、対応段階を決める。 |
| `runPathway` | デモの表示とテストで共通して使う、一連の処理の入口。 |

**元の危険物ルールを維持しました。** `classifyDetection()`は画面のしきい値0.65・0.15、除外リスト`{person, bed, suitcase, couch}`、確信度0.5をそのまま引き継ぎます。当時のPythonと比較できるようにするためです。将来、距離空間の別のルールを使う余地はありますが、その場合は元の判定の再現ではなくなります。

**シーンはピクセルでなくメートルで定義しました。** 危険物になる位置へ枠を手で置けば、結論を最初から埋め込むことになります。カメラモデルを通すことで形状から判定され、前進によって結果が変わります。

## テストで確認すること

`runPathway()`を入口に、27件のテストで以下を確認します。

- 転倒の可能性は0.8超となり、`fall-confirmed`へ進む。
- 初期の安全な通路は0.25未満で、危険物は0件。
- 最も危険度が高い物が先頭に来る。
- 転倒イベント、または動きの根拠だけで`critical`になり得る。
- 緊急時は取り消し時間の後にSMS、次に通話へ進む（模擬）。
- 立て直したつまずきでは通話しない。
- 除外するCOCOクラスは危険物にならない。
- 高い位置の物は近くても除外する。
- 前進により危険領域へ入った物の判定が変わる。
- 低い段差は越え、障害物は避け、通路が塞がれば架空の経路ではなく`stop`を返す。
- 2つの重みの表はそれぞれ合計1になる。
- 対応のしきい値は重ならない順序にする。

再構築中には、角加速度主導と説明しているのに衝撃の重みが最大になっていた不整合をテストで見つけました。角加速度を最大の重みに修正し、その関係をテストに残しました。

## 当時のもの・再構築・未回収の区別

| 区分 | 内容 |
|---|---|
| 当時の成果 | 261行のPython検出器（互換性修正3か所をコード内に明記）、デック、構成図、実機とマウント、実際の電話実演、調査、写真、4本の録画。 |
| 後からの再構築 | ブラウザー画面、JavaScriptエンジン、カメラモデル、合成運動シナリオ、優先度、介護者の模擬画面、テスト、技術資料。 |
| 未回収 | iOSソース、センサー記録、実運用のSMS・通話連携、Core MLコード、臨床検証済みのしきい値。`data/sampleEvents.js`の運動値はすべて合成。 |

動画は元の動作を見るための記録であり、コンパイルやテスト、拡張できるアプリのコードではありません。新しいiPhone実装は別の仕事です。重みとしきい値は測定値ではなく技術上の判断で、実際の転倒に対して検証していません。[visionの説明](vision/README.md)と[再構築メモ](docs/RECONSTRUCTION_NOTES.md)でも区別しています。

## 次に取り組むこと

まず実際のセンサー記録を取り、しきい値をデータで評価したいと考えています。その後はCOCOで扱えない床の危険物、時系列の追跡、Core MLへの変換、iOSの再実装です。成立しない可能性のある前提も[ロードマップ](docs/ROADMAP.md)に残しています。

## ファイルと配信

```text
index.html                  デモ画面
src/pathwayEngine.js        依存なしの判定処理
src/app.js                  デモ操作・Canvas描画
src/styles.css              スタイル
scripts/serve.mjs           Range対応のNodeサーバー
data/sampleEvents.js        3種類の空間シナリオ
test/hazardEngine.test.js   27件のテスト
vision/hazard_detector.py   当時の検出器
vision/requirements.txt     Pythonの依存関係
docs/                       ストーリー・設計・判断・再構築・計画・アクセシビリティ
assets/hackathon/           当時の写真
assets/videos/              当時の動画とサムネイル
```

静的サイトとして配信できます。GitHubのSettings → PagesでDeploy from a branchを選び、`main`のルートを指定します。相対パスなのでサブディレクトリでも動作し、他の静的ホストも使えます。`file://`ではES modulesが制限されるため、ローカルでもサーバーを使ってください。

## アクセシビリティ

スコアをバー・数値・文章の3通りで示し、色だけに頼らないようにしています。転倒リスクの色は値ではなく検出段階に合わせるため、92%を緑で表示しません。`prefers-reduced-motion`を尊重し、フォーカスを可視化し、判定メッセージをARIAライブ領域にしています。[確認事項と残る課題](docs/ACCESSIBILITY.md)を記載しています。

## チームと担当

| メンバー | 主な担当 |
|---|---|
| Jake Smith | 構想・調査のリード、実機の試作・統合・テスト・デモ前の調整。顧客調査とピッチにも参加。 |
| Caleb Byrne | ソフトウェアアーキテクチャ。 |
| Antony He | CADと市場調査。 |
| Aiyush Gupta | プロダクトと戦略。 |

初対面の4人で、街頭調査、設計、画像認識、CAD・3Dプリント、実機、市場の確認、発表を進めました。主な担当はありましたが、お互いを助けてつくったチームの成果です。

## ライセンスと資料

コードは[MIT](LICENSE)です。デックの静止画と写真はチームの資料として当時の開発を記録するために掲載しています。住所と電話番号を含む2枚のスライドは除外し、デモでは仮のデータを使いました。公開写真のうち1枚は通行人の顔を、1枚は2か所の文字を伏せています。[画像・映像の説明](assets/README.md)に記録しています。

## 写真・デモ画面の一覧

日本語ページからも、元のREADMEの写真とデモ画面をすべて確認できます。元画像は編集していません。

<img src="assets/prototype-walker-mount.jpg" alt="ラクロスのフレームに取り付けた3Dプリントのマウント。" width="720">

*ラクロスのフレームに取り付けた3Dプリントのマウント。*

<img src="assets/demo-dynamic-detection.jpg" alt="当時の部屋での物体検出。" width="720">

*当時の部屋での物体検出。*

<img src="assets/demo-app-ui.jpg" alt="取り付けたスマートフォンで動く当時のアプリ。" width="720">

*取り付けたスマートフォンで動く当時のアプリ。*

<img src="assets/hackathon/whiteboard-planning-session.jpg" alt="ホワイトボードで課題と発表を整理。" width="720">

*ホワイトボードで課題と発表を整理。*

<img src="assets/hackathon/overnight-team-working.jpg" alt="チームで夜通し作業。" width="720">

*チームで夜通し作業。*

<img src="assets/hackathon/oxford-street-interview.jpg" alt="街頭でのインタビュー。" width="720">

*街頭でのインタビュー。*

<img src="assets/hackathon/walker-fall-test.jpg" alt="模擬転倒のためのフレームの組み立て。" width="720">

*模擬転倒のためのフレームの組み立て。*

<img src="assets/hackathon/outdoor-walker-test.jpg" alt="オックスフォードの屋外テスト。" width="720">

*オックスフォードの屋外テスト。*

<img src="assets/hackathon/final-presentation.jpg" alt="審査員への最終発表。" width="720">

*審査員への最終発表。*

<img src="assets/hackathon/first-place-announcement.jpg" alt="優勝の発表。" width="720">

*優勝の発表。*

<img src="https://raw.githubusercontent.com/Jsmitty78/Pathway-Oxford1stPlaceHackathon/1c59fad8ff585d24ed01839bd61e7b358f0d9725/assets/hackathon/oxford-college-friends.jpg" alt="滞在中にできた友人たち。" width="720">

*滞在中にできた友人たち。*

<img src="assets/hackathon/oxford-college-dinner.jpg" alt="カレッジでの食事。" width="720">

*カレッジでの食事。*

<img src="assets/videos/thumbnails/live-object-detection.jpg" alt="元の物体検出動画の静止画。" width="720">

*元の物体検出動画の静止画。*

<img src="assets/videos/thumbnails/floor-hazard-detection.jpg" alt="床のぬいぐるみだけが危険物になる動画。" width="720">

*床のぬいぐるみだけが危険物になる動画。*

<img src="assets/videos/thumbnails/original-ios-app.jpg" alt="当時のiPhone画面。" width="720">

*当時のiPhone画面。*

<img src="assets/videos/thumbnails/incident-log-demo.jpg" alt="画像と時刻を残す履歴。" width="720">

*画像と時刻を残す履歴。*

<img src="assets/videos/thumbnails/original-final-pitch.jpg" alt="最終ピッチの静止画。動画全編は非公開。" width="720">

*最終ピッチの静止画。動画全編は非公開。*

<img src="assets/demo-screenshot.jpg" alt="再構築したD.A.I.屋内案内デモ。" width="720">

*再構築したD.A.I.屋内案内デモ。*

<img src="assets/demo-caregiver-loop.jpg" alt="模擬の介護者画面と段階的な連絡。" width="720">

*模擬の介護者画面と段階的な連絡。*
