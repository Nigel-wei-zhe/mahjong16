# 🀄 今夜有局｜台灣十六張麻將

> 四人台灣十六張麻將網頁遊戲。打開網址就能玩，不用安裝、不用帳號。

**▶ 立即開打：<https://mahjong.nigel-lee.com/>**（手機請橫放）

---

## 特色

- **完整台灣十六張規則**：吃碰槓、搶槓胡、過水、補花，花牌胡（八仙過海、七搶一），天胡／地胡／人胡，連莊與台數結算
- **單機練習**：和三位電腦角色同桌，每位角色有自己的牌風（速攻、守備、愛碰、做大牌…），強弱等級依上千局模擬實測而定
- **包廂連線**：開包廂把四碼房號或邀請連結給牌友，WebRTC 點對點直連；有人斷線會暫停等人，也能讓電腦先代打
- **3D 牌桌**：three.js 繪製的斜俯視牌桌，出牌拋物線、吃碰滑入、胡牌推鏡
- **八位角色**：各有立繪、吃碰胡演出、結算圖、台詞與語音

## 技術

純前端單頁，沒有建置步驟，也沒有後端遊戲伺服器。

| 部分 | 做法 |
|---|---|
| 畫面 | 原生 HTML／CSS／JavaScript，一個 `index.html` |
| 3D | [three.js](https://threejs.org/) |
| 連線 | [PeerJS](https://peerjs.com/)（WebRTC），房主的瀏覽器就是遊戲伺服器；房主依座位遮蔽資料再送出，客人收不到別人的手牌與牌山 |
| NAT 穿透 | Google STUN；嚴格網路環境另有 TURN 轉送（需向管理員索取連線密碼） |
| 素材 | 立繪、語音、牌面都以 base64 內嵌在 `avatars.js`、`voices.js`、`tiles.js` |

## AI 生成素材

角色立繪與語音都是用開源模型在本機生成，沒有使用任何商業遊戲素材。

**立繪**（[ComfyUI](https://github.com/comfyanonymous/ComfyUI) 流程）

| 步驟 | 模型 |
|---|---|
| 文生圖底圖 | NoobAI-XL（SDXL 動漫系） |
| 換臉、改姿勢、改服裝、臉部精修 | Qwen-Image-Edit |
| 去背 | BiRefNet |

**語音**

| 用途 | 模型 | 參考聲音 |
|---|---|---|
| 牌名、補花 | [BreezyVoice](https://github.com/mtkresearch/BreezyVoice)（台灣口音中文） | Kokoro v1.1 中文女聲 |
| 吃碰槓胡自摸台詞 | [IndexTTS 2](https://github.com/index-tts/index-tts) | 日系聲線：Kokoro-82M 日文聲音、つくよみちゃんコーパス、JVNV |

生成後用 Whisper 辨識比對台詞，每句從多個版本挑念得最清楚的一版。

## 本機執行

```sh
git clone https://github.com/Nigel-wei-zhe/mahjong16.git
cd mahjong16
python3 -m http.server 8000
# 開 http://localhost:8000/
```

## 素材與授權

- 牌面：Cangjie6 等，維基共享資源，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- 3D：three.js（MIT）
- 連線：PeerJS（MIT，見 `lib/peerjs.LICENSE`）；連線媒合使用 PeerJS 公開伺服器，牌局資料在玩家之間直接傳送
- 語音參考音：
  - つくよみちゃんコーパス（CV.夢前黎）
  - JVNV 語料庫，CC BY-SA 4.0
  - [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)，Apache 2.0
- 角色立繪與語音成品為本專案自行生成
