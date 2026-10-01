# 把白底线稿角色抠成透明 PNG：从边缘泛洪填充“近白色”区域当作背景，
# 再把紧贴背景的一圈像素按亮度给半透明，保住黑色描边的抗锯齿。
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
src, dst, h = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
lum = im.convert('L')
near = lum.point(lambda v: 255 if v > 238 else 0)          # 近白 = 候选背景
W, H = near.size
seeds = [(x, 0) for x in range(0, W, 25)] + [(x, H - 1) for x in range(0, W, 25)] + \
        [(0, y) for y in range(0, H, 25)] + [(W - 1, y) for y in range(0, H, 25)]
for s in seeds:
    if near.getpixel(s) == 255:
        ImageDraw.floodfill(near, s, 128)
bg = near.point(lambda v: 255 if v == 128 else 0)          # 和边缘连通的白 = 真背景
band = ImageChops.subtract(bg.filter(ImageFilter.MaxFilter(5)), bg)  # 背景外沿 2px 的一圈
alpha = ImageChops.invert(bg)
soft = lum.point(lambda v: min(255, int((255 - v) * 1.7)))  # 越暗越不透明
alpha = Image.composite(soft, alpha, band)
out = im.convert('RGBA'); out.putalpha(alpha)
out.save(dst, optimize=True)  # 需要更小就再 quantize(256) 一次
print(dst, out.size)
