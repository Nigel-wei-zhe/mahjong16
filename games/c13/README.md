# 十三支（c13）正式遊戲模組

入口：店內「十三支」→ 練習或包廂。`index.html` 僅登記模組；選到遊戲後才載入程式、樣式、SVG 牌面與自動排牌 worker。小樣 `proto/chinese13/` 保留原狀。

## 狀態與連線

房主把發牌、提交排法、準備、局數、時間、統計、結算都記在 `G`：`c13Hands`、`c13Rows`、`c13Ready`、`c13Deadline`、`c13NextAt`、`hand`、`stat`、`res`。玩家的編輯草稿與選取只放在模組變數 `ui`，不放進 `G`、localStorage 或同步資料；以 `handKey()` 判斷換局，收到其他玩家的新快照時保留尚未送出的編輯。

`act(seat,{t:'set',gid,hand,rows})` 由房主檢查當局、13 張確實屬於該座位、沒有重複與倒水；已確認後不能改。四家都排好即開牌。預設 60 秒，可選 30／60／90 秒；逾時、空位、託管由房主計算並提交。重連或房主從長時間停頓恢復時重給排牌時間。

`redact` 採欄位白名單，開牌前只保留自己的牌與已提交排法，別家手牌用 13 個 `-1`、排法用 `null`；本地草稿、未來新增的未知欄位均不傳送。開牌後公開四家排法。

**動作也是私密資料**：殼新增可選 `redactPresence(p,sender,recipient)`，在 PeerJS 的首次座位表及後續廣播逐人套用。十三支移除其他人的 `set` 動作，防止它繞過狀態遮牌洩漏整手牌。房主仍保留原始動作；未提供 hook 的遊戲行為不變。舊 artifact 公開 presence 模式不允許開十三支連線局，因為沒有私密狀態通道。

## 規則與帳本

- A 大、2 小；A2345 最小順子；花色不比大小。頭墩只比散牌、一對、三條。
- 每墩 1 分，四家兩兩互比。打槍 ×2，全壘打再 ×2。倒水按三墩全輸打槍計；雙倒水互不計分。
- 1 分＝`cfg().b`；每局只呼叫殼 `settle(d)` 一次，四家總和為 0。錢包和戰績沿用殼，戰績 `g:'c13'`。
- 4／8 局，底 100／300／500，入座門檻底×30。特殊牌本版不做。
- 下一局使用殼 `act({t:'next'})`／`G.rdy`；連線全體真人準備就開，否則 15 秒後自動開。單機手動按下一局，託管可自動續局；整場結束需再按再來一場。

## AI 與素材

`profileFor(TRAIT)` 換算頭／中／尾權重及偶爾選較弱合法排法的機率。`simulate.mjs` 用固定種子、同一批 240 手牌，對三位中性 AI 測試八個角色；依總分排序分 A／B／C，實測結果在 `stats.mjs`。UI 顯示贏分率與每一對手的打槍率；是基本啟發式，不保證最優。

自動排牌增加葫蘆的權重與組合獎勵，避免小樣中能排葫蘆卻過度偏好雙同花的案例；有回歸案例。立繪取殼陣容 `chr(seat)` 的 `n`，依 `nx` 判斷寬版，不使用麻將胡牌 `w`。SVG 撲克牌面延續小樣自行繪製程式，無第三方牌面授權新增。

## 驗證

```sh
node games/c13/engine.test.mjs
node games/c13/shell.test.mjs
node games/c13/ui.test.mjs
node games/c13/transport.test.mjs
node games/c13/simulate.mjs 240
# 已更新 test/test.html、test/real.html，test/games 為 ../games 的既有符號連結
cd test
python c13.py c13_review
```

瀏覽器套件可用時，`test/c13.py` 會驗證 755×395／844×390、選桌／房間／排牌／開牌截圖、整場錢包及戰績、不載麻將素材、三位客戶端的 state/action 遮牌、準備機制，以及 WebKit。Claude 已在可用的瀏覽器環境通過初版整合與麻將回歸；第二輪 7 項修正的 Node 檢查與兩種尺寸原生 Chrome 截圖已完成，但本工作階段重跑 Playwright 仍被沙箱阻擋。最新驗證與截圖見 `docs/c13-review-fixes.md`。程式與 UI：Codex（OpenAI）。
