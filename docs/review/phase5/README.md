# 第五期验收目录

入口仍为 `proto/c3-city.html`。桌面截图为 1440×900，手机为 390×844；截图已逐张人工查看。完整结果见 [第五期报告](../../phase5-report.md)。

## 先看这些图

| 内容 | 截图 |
|---|---|
| 同一张弹簧卡片，默认界面的前后对照 | [并排对照](card-comparison.png) |
| 桌面瘦身前／后 | [第四期](card-before-desktop.png) · [第五期](card-after-desktop.png) |
| 手机瘦身前／后 | [第四期](card-before-mobile.png) · [第五期](card-after-mobile.png) |
| 完整卡片裁切，对齐演示与参数 | [桌面前](card-before-desktop-detail.png) · [桌面后](card-after-detail.png) · [手机前](card-before-mobile-detail.png) · [手机后](card-after-mobile-detail.png) |
| 工具展开，分享／代码／A/B／讲解仍然可用 | [工具抽屉](card-tools-desktop.png) |
| NPC 初次问候 | [桌面](welcome-desktop.png) · [手机](welcome-mobile.png) |
| 当前首屏 | [桌面](desktop-hero.png) · [手机](mobile-hero.png) |
| 手机讲解跟在卡片下方 | [内联导览](mobile-inline-guide.png) |
| 键盘焦点 | [焦点样式](keyboard-focus.png) |
| 最新节奏与手势展厅 | [节奏入口](desktop-timing.png) · [节奏全景](desktop-timing-full.png) · [桌面手势](desktop-gesture.png) · [手机手势](mobile-gesture.png) |
| WebKit / Firefox 的首屏 | [WebKit 桌面](webkit-desktop-hero.png) · [WebKit 手机](webkit-mobile-hero.png) · [Firefox 桌面](firefox-desktop-hero.png) · [Firefox 手机](firefox-mobile-hero.png) |

“前”截图来自第五期开始前的 `01a598d`，用独立静态服务读取归档代码，字体、素材和参数均保留当时的状态；“后”来自当前成品。桌面卡片高度 765→554px，手机 707→510px；裁切图另外留了 15px 边框与投影空间。

## 数据与范围

- [Lighthouse 优化前 HTML](lighthouse-before.report.html) / [JSON](lighthouse-before.report.json)，[优化后 HTML](lighthouse-after.report.html) / [JSON](lighthouse-after.report.json)。Lighthouse 13.5.0、Chrome 154、本地服务器、412×823 / DPR 1.75、标准手机模拟慢 4G、4 倍 CPU 节流、冷缓存；性能 74→92，无障碍 88→100。
- [双内核检查](browsers.json)：WebKit 26.6、Firefox 155；各跑桌面与手机，合计 266 项。43 件口令恢复与重播、四种实际拖拽、A/B、工具展开期间代码弹窗键盘关闭、41 个 OGG 解码与录音播放、四种实时着色器均通过。静止状态的 WCAG A/AA 扫描、未捕获错误、资源失败均为 0；刷新中主动取消的请求单列记录，不算资源损坏。
- [Chrome 无障碍扫描](accessibility.json)：桌面、手机的初访、全展厅静止、全部工具与播放控制台展开、复制状态、代码弹窗及手机讲解弹窗，共 11 次扫描为 0 违规；19 项结构与键盘检查通过。代码预览 iframe 在此扫描中排除，独立实现另由代码检查覆盖；自动扫描不能替代完整读屏器人工验收。
- [原有功能回归](regression.json)：50 项；[真实触摸输入](touch-checks.json)：54 项，使用 Chrome 的 touchStart / touchMove / touchEnd / touchCancel，包含取消手势、快甩慢放与下拉刷新。
- [代码与分享检查](code-checks.json)：43 份独立 HTML 在 iframe 内运行并接收真实鼠标输入，验证 A/B 导出、四种减少动态效果和分享 URL 实际重载。
- [初访与键盘流程](experience-checks.json)：包括实际等待 24 秒后收起、本地记忆、禁用存储、Enter / Escape、默认复制口令、43 个读屏说明。
- [桌面性能](performance/desktop.json)、[手机性能](performance/mobile.json)：沿用 `tools/motion-trace.mjs` 的八场景，无 CPU 节流；压缩原始时间线与 JSON 放在同一目录。FPS 按两位小数均不低于第四期记录；桌面、手机滚动均零掉帧、零长任务，实际到达页底。
- 手机使用浏览器模拟，并非实体手机；WebGL 不可用、减少动态效果、上下文丢失与低帧率的静态降级继续保留。首次音频设备启动仍有一次性开销：本次桌面 141ms、手机 112ms，第四期为 130ms、116ms；桌面冷启动时长有波动，掉帧仍为 7 帧，测量前未预热声音。

## 复现

网站依然不需要 npm 或构建。在项目根目录运行 `python3 -m http.server 3300`。验收工具安装在项目外：

```bash
npm install --prefix /tmp/motion-phase5-qa playwright lighthouse @axe-core/playwright
/tmp/motion-phase5-qa/node_modules/.bin/playwright install webkit firefox
node tools/phase5-browsers.mjs
node tools/phase5-accessibility.mjs
node tools/phase5-experience.mjs
node tools/phase5-review.mjs
QA_OUT=docs/review/phase5/regression.json node tools/phase4-check.mjs
QA_OUT=docs/review/phase5/touch-checks.json node tools/phase4-touch.mjs
QA_OUT=docs/review/phase5/code-checks.json node tools/phase4-code.mjs
TRACE_OUT=docs/review/phase5/performance node tools/motion-trace.mjs desktop
TRACE_OUT=docs/review/phase5/performance TRACE_MOBILE=1 TRACE_DPR=3 node tools/motion-trace.mjs mobile
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' /tmp/motion-phase5-qa/node_modules/.bin/lighthouse http://localhost:3300/proto/c3-city.html --only-categories=performance,accessibility --chrome-flags='--headless=new --no-first-run' --output=json --output=html --output-path=docs/review/phase5/lighthouse-after --quiet
```

Playwright/axe 的路径可通过 `QA_NODE_MODULES` 改到其他项目外目录；字体维护使用 `python3 tools/phase5-fonts.py`，只重新生成本地子集，不参与网站运行。Lighthouse 与性能追踪应单独运行，避免其他浏览器验收竞争机器资源。

瘦身前图可从 `01a598d` 的独立归档复拍，卡片位置与当前截图使用相同的 125px 上边距；裁切时暂时隐藏固定导航，避免混入卡片。先在一个终端运行：

```bash
mkdir -p /tmp/motion-phase5-before
git archive 01a598d | tar -x -C /tmp/motion-phase5-before
python3 -m http.server 3301 --directory /tmp/motion-phase5-before
```

再在项目根目录的另一个终端运行 `QA_BEFORE_URL=http://localhost:3301/proto/c3-city.html node tools/phase5-review.mjs`，输出仅更新四张 `card-before-*.png`。
