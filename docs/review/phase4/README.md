# 第四期验收资料

入口：`proto/c3-city.html`。在仓库根目录运行 `python3 -m http.server 3300`，用浏览器打开 `http://localhost:3300/proto/c3-city.html`。

| 文件 | 内容 |
|---|---|
| desktop-gesture.png | Hall 08 桌面全景，四件手势展品 |
| mobile-gesture-full.png | 390px 手机展厅完整布局 |
| mobile-gesture.png / mobile-swipe.png | 手机操作区域与真实触摸拖动中的滑卡 |
| desktop-ab.png / mobile-ab.png | 刚度 180、阻尼 18 的 A，与刚度 250、阻尼 7 的 B 同步播放 |
| slow-console.png | 0.1x 爆炸暂停现场与逐帧控制台 |
| shared-restored.png | 实际重新打开 URL，恢复摩擦 2.75、质量 2.2、速度 0.75x |
| desktop-code.png | 无依赖 HTML 代码、独立 iframe 预览、复制与下载 |
| mobile-shader.png | 手机 DPR 1、674 个 WebGL 粒子实时聚合 |
| guide-expressions.png | 原版眨眼比耶 + 得意 / 认真讲解 / 捂耳朵 / 打哈欠 |
| checks.json | 50 项回归检查，含 30 轮 CSS 暂停边界、13 件 A/B、43 件口令、物理 / WAAPI / CSS 暂停逐帧 |
| touch-checks.json | 54 项 390×844、DPR 3 的真实浏览器触摸输入检查 |
| code-checks.json | 43 份独立 HTML 经鼠标输入运行；减少动态效果、A/B 导出与 URL 重载 |
| performance/ | 桌面、手机八个场景的 JSON 与压缩 CDP 时间线 |
| shared-example.txt | 分享链接样例，部署后由当前域名自动生成 |

截图使用 `node tools/phase4-review.mjs`；全景暂时隐藏固定导航以完整观察布局。所有成品截图已经人工看图检查。

回归：`node tools/phase4-check.mjs`；触屏：`node tools/phase4-touch.mjs`；独立代码：`node tools/phase4-code.mjs`。

性能复现：

```sh
TRACE_OUT=docs/review/phase4/performance node tools/motion-trace.mjs desktop
TRACE_OUT=docs/review/phase4/performance TRACE_MOBILE=1 TRACE_DPR=3 node tools/motion-trace.mjs mobile
```

桌面 1440×900 / DPR 1；手机 390×844 / DPR 3，着色器画布限制 DPR 1。Chrome 154 / Metal GPU / 60Hz，无 CPU 节流。
手机检查使用 CDP 的 touchStart、touchMove、touchEnd、touchCancel 与触摸滚动输入；不是实体手机实测，不代表全部手机的 GPU 性能。
原来的六个测量场景保留，新增手势与 A/B 场景。冷启动声音开销保留在测量里，没有预先暖机。
导览员的完整生成提示词、处理过程与产物路径见 `../../phase4-guide-prompts.md`。
