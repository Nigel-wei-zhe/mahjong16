# 今夜有局｜台灣十六張麻將

霓虹夜街風格的四人麻將網頁遊戲，支援單機練習與朋友連線包廂。以原生 HTML、CSS、JavaScript 製作，使用 three.js 呈現 3D 牌桌，無需 npm 安裝或建置。

遊戲入口：[mahjong.nigel-lee.com](https://mahjong.nigel-lee.com/)

本說明依本目錄程式碼整理（2026-11-20）。原始碼版本顯示為 `dev`，發布腳本會另外寫入時間版本號。

## 本機啟動

在專案根目錄執行（需要 Python 3）：

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

開啟 <http://127.0.0.1:8766/>。建議使用 HTTP 伺服器，讓 ES modules、import map 與本機資源正常載入。介面針對手機橫向操作設計，也可在桌面瀏覽器遊玩。

遊戲本體與 three.js、PeerJS 已包含在專案中；Google Fonts 與連線模式仍需存取外部服務。

## 目前功能

- **練習**：一位玩家與三位 AI 對局，可開啟託管。
- **包廂**：以四碼房號或 `?room=房號` 邀請連結加入，最多四位真人，空位由 AI 補上。房主設定牌局並開局。
- **八位角色**：瑟琳、蕾歐、薇拉、蜜雅、凜、白音、艾莉絲、露娜，具有不同 AI 風格、角色介紹、立繪與語音。每桌抽出四位，可在大廳隨機入座，整場沿用陣容。
- **牌桌**：3D 麻將牌、洗發牌與骰子動畫、吃碰槓胡特效、結算及整場排名。
- **操作**：點一下選牌、再點一下出牌，或按住往上滑；設定內可查看台數表、規則與連線狀態。連線時可送快捷語及表情。
- **錢莊**：本機虛擬點數、每日紅包、救濟金與最近 50 筆戰績。金錢無法儲值或兌換。

大廳的「大老二」目前僅為「即將開幕」入口，尚未實作。

### 牌局設定與規則

| 設定 | 可選值 | 預設 |
| --- | --- | --- |
| 局數 | 一圈（4 局）、一將（16 局），連莊另計 | 一圈 |
| 底／每台 | 100／20、300／50、500／100 | 100／20 |
| 出牌倒數 | 15、30、60 秒 | 30 秒 |

採 144 張牌（含 8 張花），每人 16 張，基本胡牌為五組順子／刻子加一對。牌牆保留 16 張，無人胡牌即流局；莊家胡牌或流局會連莊。

- 回應優先序為胡 ＞ 碰／槓 ＞ 吃；吃牌僅限上家的牌。多人同時胡牌時，依放槍者下家起的座次取一位贏家。
- 吃碰後有禁打限制；例如用 4、5 吃 3，隨後不能打 3、6。若整手牌都屬禁打牌則解除限制。
- 可摸牌剩 8 張以內，禁止吃、碰、明槓與加槓，仍可胡牌及暗槓。
- 能胡卻放過（含逾時或改選吃碰槓）會進入過水，直到自己打出下一張牌前不能胡，包含自摸。
- 支援加槓搶胡、八仙過海與七搶一；兩種花牌胡固定 8 台，不看手牌。
- 每家支付「底＋台數×每台」；涉及莊家時另加 `1＋2×連莊次數` 台。放槍者單獨付，自摸由三家付。

台型計算實作在 `calcTai()`。調整規則時，需同步修改設定面板內的「台數表」與「規則說明」。

### 連線與存檔

一般瀏覽器透過 PeerJS／WebRTC 連線，由房主推進牌局並發送各玩家可見的狀態；其他玩家的手牌與牌牆內容會遮蔽。程式也保留 Claude artifact 的 room 介面相容層。

- **TURN 包廂**：需要向管理員索取通行碼。前端向 `https://turn.nigel-lee.com/api/ice` 取得短效 ICE 憑證，通行碼只存在記憶體中。此 API 的後端不在本專案內。
- **網路包廂**：房號以 `L` 開頭，只用 STUN、不要求通行碼；能否連通取決於網路與 NAT，並非完全離線的區域網路模式。
- 玩家斷線時會暫停等待，房主可改為託管。房主重新整理可嘗試從本機快照恢復；房主主動離開會解散包廂。

暱稱、音效、牌局設定、錢莊與房主快照存於瀏覽器 `localStorage`（`mjName`、`mjSnd`、`mjCfg`、`mjWallet`、`mjHost`），連線識別另使用 `sessionStorage`。房主快照有效期為 6 小時；資料不會跨裝置同步。清除網站資料後，錢莊重新從 10,000 點開始。

入座需要至少「底×30」的餘額；打到一半離開會在後續結算逃跑費（一底）。iPhone／iPad 的音效尊重裝置靜音設定。

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `index.html` | 正式入口；樣式、大廳、規則引擎、AI、連線、錢莊、音效及 3D 牌桌 |
| `avatars.js` | `window.AVATARS` 八位角色圖像及 `window.BG`，圖像以 base64 WebP 嵌入 |
| `tiles.js` | 牌面 SVG／CSS，`.k0`–`.k41` |
| `voices.js` | `window.VOICES`，角色語音以 base64 音訊嵌入 |
| `lib/` | 本機 three.js、RoundedBoxGeometry、PeerJS 與 PeerJS 授權 |
| `img/` | 夜街、店內、包廂等 WebP 素材 |
| `tools/pack.py` | 將定稿圖像／語音打包進遊戲的工具 |
| `test/` | Playwright 腳本、mock room、測試頁副本及截圖 |
| `proto/`、`wip-room/`、`review-characters/` | 原型、房間實驗及角色審稿頁，非正式入口 |
| `research/`、`docs/` | 研究與美術規劃資料 |
| `backup/` | 歷次修改及打包備份 |
| `deploy-pages.sh` | 同步正式資源至獨立的 GitHub Pages 發布 repo 並推送 |
| `CLAUDE.md` | 開發交接與設計規範 |

## 開發與驗證

遊戲主要狀態為 `G`，房主以 `hostTick()`、`act()`、`resolve()`、`endHand()`、`nextHand()` 推進，由 `render()` 更新畫面。`window.__dbg` 提供讀取／替換狀態、呼叫動作與調整模擬速度等除錯功能。

現有測試多數固定讀取 `http://localhost:8766/test.html`。先安裝 Python Playwright 與 Chromium：

```sh
python3 -m venv /tmp/mahjong16-test-venv
source /tmp/mahjong16-test-venv/bin/activate
python3 -m pip install playwright
python3 -m playwright install chromium
```

從根目錄更新測試副本，注入以 BroadcastChannel 模擬的 room，並同步正式資源：

```sh
python3 - <<'PY'
from pathlib import Path
import shutil

root = Path.cwd()
page = (root / 'index.html').read_text()
page = page.replace('<script>', '<script src="mock.js"></script><script>', 1)
(root / 'test/test.html').write_text(page)
for name in ('avatars.js', 'tiles.js', 'voices.js'):
    shutil.copy2(root / name, root / 'test' / name)
for name in ('lib', 'img'):
    shutil.copytree(root / name, root / 'test' / name, dirs_exist_ok=True)
PY
python3 -m http.server 8766 --directory test --bind 127.0.0.1
```

另開終端，使用同一個虛擬環境，從根目錄執行需要的檢查：

```sh
source /tmp/mahjong16-test-venv/bin/activate
cd test
python3 err.py    # 輸出頁面 JavaScript 錯誤
python3 sim.py    # 300 局模擬：牌數、手牌張數、合法胡牌及零和結算
python3 rules.py  # 特定規則案例
python3 ui.py     # 單機與 mock 雙人互動
```

這些是各自執行的驗證腳本，部分只列印結果，需檢查輸出的錯誤／異常清單；沒有統一的測試 runner。Mock 測試無法驗證實際的 WebRTC／TURN 連通性；執行其他測試腳本前，應先核對其目標網址與操作流程。手機畫面建議至少驗收 755×395、844×390 橫向尺寸。

## 素材打包

### 現行美術與語音

角色美術以角色卡為基準，採用 `cel-gloss`（賽璐璐光澤）畫風，透過 comfy-lib 的 `common/image/pose`、`outfit`、`refine` 完成姿勢、服裝與局部精修；姿勢與換裝使用 Qwen Image Edit 工作流程。

目前瑟琳、蕾歐、薇拉、蜜雅、凜及夜街瑟琳已套用此畫風；白音製作中，艾莉絲、露娜待更新。

語音使用 **VoxCPM2**（`openbmb/VoxCPM2`）：八位角色各 40 個鍵（`chi pon kan hu zimo flower t0..t33`），合計 320 段。每位先設計並確認聲線，再以固定參考音生成各句；聲線設計為 Nigel Lee。

| 角色 | 現行聲線 |
| --- | --- |
| 瑟琳 | 慵懶耳語 |
| 蕾歐 | 得意起鬨 |
| 薇拉 | 難以捉摸 |
| 蜜雅 | 勝券在握 |
| 凜 | 執法威嚴 |
| 白音 | 狡黠巫女 |
| 艾莉絲 | 甜美女僕 |
| 露娜 | 派對女王 |

角色介紹提供吃、碰、胡台詞的語音試聽；大廳對話與出牌梗維持純文字。瀏覽器播放打包後的素材，無需載入產圖或語音模型。

### 打包工具

使用 `tools/pack.py` 整合已定稿素材。需 Python、NumPy、Pillow；語音轉檔另需 `ffmpeg`。工具包含本機 `~/tools/comfy-library` 路徑，無透明通道的圖片會呼叫 comfy-lib 去背，並非獨立可攜的素材產製環境。

```sh
python3 tools/pack.py show
python3 tools/pack.py avatar 蜜雅 w /path/to/image.png --dry
python3 tools/pack.py voice 薇拉 hu /path/to/voice.wav --dry
```

`--dry` 將預覽寫入 `/tmp`；確認後移除選項才寫入遊戲。正式寫入前會備份至 `backup/`，並保留 `avatars.js` 的 `window.BG`。完整選項見 `python3 tools/pack.py --help`。

## 發布

可部署至支援 ES modules 的靜態網站空間，正式資源為：

```text
index.html
avatars.js
tiles.js
voices.js
lib/
img/*.webp
```

既有 `deploy-pages.sh` 為 macOS／原開發機使用，預期 `~/tools/mahjong16` 已存在且是有遠端推送權限的 GitHub Pages repo：

```sh
./deploy-pages.sh "更新遊戲"
```

腳本會在發布 repo 執行 stash、pull --rebase、drop stash，複製遊戲檔案、改寫該副本的 `VER` 為時間版本號，接著 `git add -A`、commit、push。執行前需確認發布 repo 乾淨；腳本會丟棄其暫存的本機修改。一般靜態部署只涵蓋前端，TURN 憑證 API 仍需另外維運。

## 製作與素材授權

製作人、企劃、美術指導、聲線設計：Nigel Lee；劇本：Nigel Lee、Claude Opus；程式：Claude Opus（Anthropic）。

依遊戲資訊頁列示：

- 牌面：Cangjie6 等（維基共享資源），CC BY-SA 4.0。
- AI 合成語音：VoxCPM2（OpenBMB），Apache 2.0。
- 字型：Zen Maru Gothic、Noto Sans TC、Noto Serif TC、DotGothic16、Hachi Maru Pop、LXGW WenKai TC，SIL OFL 1.1。
- 圖示：Noto Emoji（Google），Apache 2.0。
- 程式庫：three.js、PeerJS，MIT。

第三方素材授權不代表整個遊戲或原創素材採用相同授權；使用或重新發布時請保留各素材的署名及授權資訊。
