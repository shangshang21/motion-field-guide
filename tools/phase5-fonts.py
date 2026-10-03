"""Regenerate the local Chinese fonts; a maintenance task, never a site build."""
from pathlib import Path
import re,subprocess
root=Path(__file__).resolve().parent.parent
html=root/'proto/c3-city.html';text=html.read_text()
alltext=text+''.join(p.read_text() for p in (root/'proto/c3').rglob('*') if p.suffix in ('.js','.css'))
chars=set(re.findall(r'[　-鿿＀-￯]',alltext))
hero=text[:text.index('<div class="tapes">')]+text[text.index('<div class="dialog"'):]
hero_chars=set(re.findall(r'[　-鿿＀-￯]',hero))
fonts=root/'assets/fonts'
for filename,letters,out in [('c3-chars.txt',chars,'NotoSansSC-Black-sub.woff2'),('c3-hero-chars.txt',hero_chars,'NotoSansSC-Hero.woff2')]:
 (fonts/filename).write_text(''.join(sorted(letters)))
 subprocess.run(['python3','-m','fontTools.subset',str(fonts/'NotoSansSC-Black.ttf'),f'--text-file={fonts/filename}','--unicodes=U+0020-007E','--flavor=woff2',f'--output-file={fonts/out}'],check=True)
# Overlapping faces are avoided: each glyph has exactly one local source.
hrange='U+0020-007E,'+','.join(f'U+{ord(c):04X}' for c in sorted(hero_chars))
text=re.sub(r"(@font-face \{ font-family: 'Heavy SC'; src: url\('../../assets/fonts/NotoSansSC-Hero.woff2'\).*?unicode-range: )[^;]+;",lambda m:m[1]+hrange+';',text)
html.write_text(text)
gallery=root/'proto/c3/gallery-font.css';font=gallery.read_text();grange=','.join(f'U+{ord(c):04X}' for c in sorted(chars-hero_chars));gallery.write_text(re.sub(r'unicode-range: [^;]+;',lambda m:'unicode-range: '+grange+';',font))
print(f'Chinese glyphs: hero {len(hero_chars)}, gallery {len(chars-hero_chars)}')
