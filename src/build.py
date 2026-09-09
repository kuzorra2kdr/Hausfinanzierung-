import base64, pathlib, sys
tpl = pathlib.Path('tool-template.html').read_text(encoding='utf8')
eng = pathlib.Path('engine.js').read_text(encoding='utf8')
# Ohne Master-Pfad wird eine Variante ohne eingebetteten Master gebaut
# (Tool fragt dann per Datei-Dialog nach dem Master). Fuer oeffentliche Ablagen.
master_path = sys.argv[1] if len(sys.argv) > 1 else None
master = pathlib.Path(master_path).read_bytes() if master_path else b''
b64 = base64.b64encode(master).decode('ascii')
assert '__ENGINE__' in tpl and '__MASTER_B64__' in tpl
deck = pathlib.Path('deck-content.json').read_text(encoding='utf8')
demo = pathlib.Path('demo-content.json').read_text(encoding='utf8')
out = tpl.replace('__ENGINE__', eng).replace('__DECK__', deck).replace('__DEMO__', demo).replace('__MASTER_B64__', b64)
name = sys.argv[2] if len(sys.argv) > 2 else 'storycraft-blueprint.html'
pathlib.Path(name).write_text(out, encoding='utf8')
print(f'-> {name}: master {len(master)/1024/1024:.2f} MB -> base64 {len(b64)/1024/1024:.2f} MB')
print(f'HTML total {len(out.encode("utf8"))/1024/1024:.2f} MB')
