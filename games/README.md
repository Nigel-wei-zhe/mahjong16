# 遊戲資料夾（2026-11-20 遊戲殼）

`index.html` 是「店」：夜街、店內、大廳、座位、錢包、戰績、連線、角色資料都在裡面，所有遊戲共用。
每款遊戲把自己的程式與素材放在 `games/<id>/`，玩家點進那款遊戲才下載（`loadGame(id)`）。

麻將的規則程式還寫在 `index.html`（函式前綴 `mj`），只有素材放在外面：`tiles.js`（牌面）和 `games/mahjong/table3d.js`（three.js 3D 牌桌）。

## 加一款新遊戲
1. `index.html` 的 `GAMES` 下面登記空殼（只寫這幾個欄位，開站時就要知道）：
   ```js
   GAMES.big2={id:'big2',name:'大老二',sub:'四人比大小',files:[{src:'games/big2/big2.js'}]};
   ```
   `files` 依序載入；ES module 寫 `{src:'…',mod:1}`（用 `import()`）。
2. `games/big2/big2.js` 補上其餘介面：`Object.assign(GAMES.big2,{…})`。完整清單在 `index.html` 的 `GAMES` 註解，最小範例是 `test/stubgame.js`（四家擲數字，從頭到尾都走殼）。
3. 店內選桌：`ST_GAMES` 改成 2，選桌按鈕 `#st-gBig` 改成設定 `curGame='big2'` 並 `loadGame('big2')`（照 `#st-gMj` 的寫法）。
4. 設定面板：這款遊戲的規則頁加 `<section data-p="…">`，入口按鈕加 `data-g="big2"`（只在這款遊戲的牌桌出現）。
5. 角色：`GAME_AI.big2={name,ai,stat,styd,lab}`（等級各遊戲自己實測，只分 A B C；AI 參數從 `TRAIT` 換算）。語音用前綴鍵（`b2:pass`）。立繪只能用不拿麻將牌的鍵（`w` 是麻將專用）。
6. 測試：參考 `test/lazy.py` 第 2 段（練習打到整場結束、錢包＝帳本、戰績有 `g`、沒有載到麻將的檔案）。

## 殼提供給遊戲的
`G`（殼已建好 `st game gid seats cfg score bk chs`）、`cfg()`、`settle(d)`（一局輸贏入本場分數＋帳本）、`bump(ev)`（狀態變更，連線會同步）、`seg()`（設定小窗按鈕）、`isBot(s)`、`mySeat()`、`chr(s)`（座位的角色索引）、`BOTS` `CCOL` `AVATARS` `VOICES`。

## 規則
- 狀態全部放在 `G`，房主權威；`redact(G,seat)` 一定要遮掉別人看不到的東西（手牌、牌堆）。
- 座位固定 4 個。
- 畫面掛在 `#root` 底下，class／id 用遊戲前綴（例 `b2-`），別撞到麻將或殼的名稱（`.t` 是麻將牌面，`.rm-` 是房間頁）。
- 視覺照 CLAUDE.md 的霓虹規範；大廳不加無限循環動畫。

## 私密動作的 presence（十三支起）

除了 `redact(G,seat)`，遊戲可提供 `redactPresence(presence,senderId,recipientId)`。PeerJS 的首次座位表與後續廣播，都會逐收件者經過這個函式；房主本地仍保留原始動作用於權威驗證。沒提供此函式的既有遊戲行為不變。

十三支的 `set` 動作含整手排法，開牌前不能直接廣播給其他客人；`games/c13/game.mjs` 會從其他人的 presence 移除該動作。只遮 `G` 不足以防止這條路徑洩漏。

十三支僅在支援私密狀態的 PeerJS 包廂開局；舊 artifact 的公開 presence 模式不允許開十三支連線桌。
