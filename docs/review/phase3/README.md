# 第三期验收材料

当前页面：`proto/c3-city.html`，七个展厅、39 件展品；可用 `python3 -m http.server 3300` 打开。

|内容|桌面 1440 × 900|手机 390 × 844|
|---|---|---|
|节奏展厅全景（整厅长截图）|[桌面](desktop-timing.png)|[手机](mobile-timing.png)|
|钉住滚动，三幕章节与路标|[桌面](desktop-scroll.png)|[手机](mobile-scroll.png)|
|揭示进行中，底稿始终有内容|[桌面](desktop-scroll-reveal.png)|[手机](mobile-scroll-reveal.png)|
|粘贴口令的输入画面|[桌面](desktop-phrase-input.png)|[手机](mobile-phrase-input.png)|
|读回后恢复参数并重播|[自定义回弹曲线](desktop-phrase-restored.png)|[果冻弹簧](mobile-phrase-restored.png)|
|感觉索引，选择“弹”|[桌面](desktop-feeling-index.png)|[手机](mobile-feeling-index.png)|

口令演示：桌面恢复 0.75x、`cubic-bezier(0.34,1.35,0.64,1.00)`、1200ms；手机恢复 0.75x、刚度 250、阻尼 7。

`checks.json` 保存浏览器交互验收结果，包含 39 件口令往返、参数恢复与拒绝部分更新、真实鼠标拖动、标签交集与定位、四档宽度、减少动态效果、DPR 3 画布限制、离屏停止 WebGL 与静态降级。

性能原始数字见 `performance/before.json` 与 `performance/after.json`。每个场景的 `*.trace.json.gz` 是压缩的 Chrome 时间线，保留 devtools.timeline 事件与调用栈；解压后可导入 Chrome DevTools Performance 或 Perfetto。`high-dpi.json` 为 DPR 3 的补充验证。

复现命令：`node tools/phase3-check.mjs`；截图：`node tools/phase3-review.mjs`；性能：`node tools/motion-trace.mjs after`；高 DPI：`TRACE_DPR=3 node tools/motion-trace.mjs high-dpi`。

性能以 rAF 帧间隔估算主线程交互帧率，掉帧按 60Hz 间隔估算。Paint 面积采用 clip 的几何面积、每次上限一屏累计，不是屏幕去重面积。滚动脚本以初始页面高度确定恒定速度，并通过 ResizeObserver 更新实际终点，直到页底，避免 content-visibility 固有高度变化漏测页面末尾。所有数据来自本机 Chrome 154、Metal GPU；未使用 CPU 节流。
