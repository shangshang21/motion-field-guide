# 把 proto/ 里的原型打包成可发布的 Artifact：
# 去掉外壳标签（发布时会自动套 skeleton）、字体内联成 data URI、../assets 改成相对路径。
import re, base64, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src, out = root / 'proto' / sys.argv[1], root / 'dist' / sys.argv[2] / 'index.html'
s = src.read_text()
def font_uri(m):
    f = root / 'assets' / 'fonts' / m.group(1)
    return "url('data:font/woff2;base64," + base64.b64encode(f.read_bytes()).decode() + "')"
s = re.sub(r"url\('\.\./assets/fonts/([^']+)'\)", font_uri, s)
s = s.replace('../assets/', 'assets/')
s = re.sub(r'<!doctype html>\s*|</?html[^>]*>\s*|</?head>\s*|</?body[^>]*>\s*|<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', s, flags=re.I)
out.parent.mkdir(parents=True, exist_ok=True); out.write_text(s)
print(out, len(s) // 1024, 'KB')
