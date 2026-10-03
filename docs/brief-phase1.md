# 施工说明书 · 第一期（给 Codex）

你是这个项目的施工方。美术总监是 Claude，她只看成品好不好看、手感对不对，不审代码。所以**代码怎么组织由你决定，但成品必须达到下面的标准**。

## 质量标准（必须遵守）

以 Awwwards、Webby Awards、FWA 获奖网站为质量标准。完成后，从排版、留白、视觉层级、色彩、动效、微交互、响应式和原创性等方面自检并持续优化，直到页面没有明显可提升之处。

自检方法：用无头 Chrome 截图，**自己看图**判断，不要只看代码：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1440,900 --virtual-time-budget=6000 --screenshot=/tmp/shot.png "http://localhost:3300/proto/c3-city.html"
```

本地服务：在项目根目录 `python3 -m http.server 3300`（如果端口已被占用，说明已经在跑了，直接用）。手机宽度用 `--window-size=390,844` 再拍一次。

## 项目背景（先读）

- `README.md`：项目是什么、三轮迭代的故事
- `proto/c3-city.html`：**当前版本，用户已经验收通过的方向**。首屏、交叉警戒带、按钮展厅、导览员对话框都是定稿，**不要改它们的视觉风格**
- 设计语言（必须延续）：米白 `#f2f0eb` + 安全橙 `#ff5b00` + 黑 `#111110` 三色；斜切面板（skewX -12deg）、网点阴影、警戒斜条纹、硬投影（8px 8px 0 黑）、贴纸、Anton 粗斜体 + 思源黑体 Black。参考气质：《绝区零》式都市潮流游戏 UI
- 每件展品的标准结构：可玩的现场演示 + 中英文名字 + 导览员在对话框里用打字机讲原理（2～3 句，讲人话）+ 复制口令（格式：`名字 English｜速度 1.00x` 加上这件展品自己的关键参数）+ 受右上角全局速度档 `--spd` 控制

## 本期任务（按顺序做，每完成一项就 git commit 一次）

### 1. 重做两个爆炸效果（用户明确说“看起来廉价”）

对象：按钮展厅的 **05 长按充能**（按满时炸开）和 **06 粒子爆裂**。

现在的问题：平涂的小方块和三角形匀速往外飘，一看就是程序生成的。要做成游戏里那种有**打击感**的爆点，分层叠加：

1. **蓄力**：炸开前按钮先往里缩一下（约 80ms）
2. **命中定格（hit-stop）**：炸开瞬间画面停 2～3 帧
3. **闪光 + 冲击波环**：一圈快速扩散、越来越细的圆环，外加一瞬间的白色/橙色闪光
4. **火花**：细长的线段，**速度越快拉得越长**（按速度方向拉伸），带一点发光
5. **碎片**：大小不一，**有重力和空气阻力**（先飞出去，再减速下坠），带旋转
6. **残烟**：最后留几团淡淡的灰色烟雾，慢慢扩散消失

长按充能按满时还要加一点**屏幕微震**。音效也要分层重做（起爆的低频“咚”+ 高频碎裂声 + 尾音）。

可以用 canvas 叠加层来画粒子，也可以用现成的库（mo.js、canvas-confetti、tsParticles 等）。如果用库，**下载到 `assets/vendor/` 本地托管**，不要依赖外部 CDN（用户在国内，外网 CDN 不稳定）。颜色只用这三色加灰。

### 2. 新增 Hall 02 光标展厅

把第一轮原型里的效果移植进来，换成 c3 的视觉风格（参考 `proto/shared.js` 里的实现，但界面要重做成 c3 的卡片和对话框体系）：

- **磁吸 Magnetic**：按钮被鼠标吸过去（参数：强度、范围、跟手速度）
- **图片拖尾 Image Trail**：鼠标划过留下一串图片（素材用 `assets/web/motion-0*.jpg`）
- **聚光灯遮罩 Spotlight Reveal**：一块暗下来的区域，鼠标是手电筒，照到哪里才看见藏着的内容（参考 `proto/b-dark.html` 首屏）

保留第一轮的**透视模式（X-RAY）**：一键画出磁场范围、目标点、剩余距离等“原理线”。这是这个项目的特色，要做得好看，用橙色细线和等宽小字。

### 3. 新增 Hall 03 文字展厅

- **逐字错落 Split Text Stagger**：一句话按字拆开，依次从遮罩里升起来
- **乱码解码 Scramble**：字母先乱跳，再从左到右逐个锁定（参考 `proto/c-poster.html`）

### 4. 收藏页和导航

- 页面底部的收藏进度格子：光标、文字两个展厅改成“已开放”，点击跳到对应展厅
- 展厅之间的过渡沿用首屏的交叉警戒带或类似的“都市”元素，不要每个展厅长得一模一样

## 约束

- 纯静态网站，部署在 GitHub Pages：**不要引入构建步骤**（不要 Vite/webpack/npm build）。可以用原生 ES Modules，把 CSS/JS 拆到 `proto/c3/` 目录下的文件里，但页面入口必须仍然是 `proto/c3-city.html`
- 字体必须本地托管。如果页面新增了中文文字，用下面的命令重新生成思源黑体子集，否则新字会显示成系统字体：
  ```bash
  cd assets/fonts && python3 -c "import re;s=open('../../proto/c3-city.html').read();import glob;s+=''.join(open(f).read() for f in glob.glob('../../proto/c3/**/*.*',recursive=True));open('c3-chars.txt','w').write(''.join(sorted(set(re.findall(r'[　-鿿＀-￯]',s)))))" && python3 -m fontTools.subset NotoSansSC-Black.ttf --text-file=c3-chars.txt --unicodes="U+0020-007E" --flavor=woff2 --output-file=NotoSansSC-Black-sub.woff2
  ```
- 支持 `prefers-reduced-motion`；手机宽度（390px）不能横向滚动，悬停类效果在手机上改为点击触发
- 文案用中性的产品口吻，讲人话，不要营销腔
- 需要新的图片素材时，可以用你的图像生成能力；导览员的形象必须保持一致（黑色短波波头带一缕橙色挑染、超大安全橙机能夹克、白色短上衣、黑色工装裤、脖子上挂黑色耳机），生成在纯白背景上，再用 `python3 tools/cutout.py <输入> <输出.png> <高度>` 抠成透明
- 每次 commit 信息用中文，结尾加一行：`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **不要 push**，美术总监验收后再推

## 交付

全部做完后，在 `docs/phase1-report.md` 写一份不超过 30 行的报告：做了什么、每个新效果在页面的哪里、自检时发现并修掉了哪些问题、还有什么不满意的。然后把桌面宽度和手机宽度的截图存到 `docs/review/`（首屏、按钮展厅爆炸瞬间、光标展厅、文字展厅各一张）。
