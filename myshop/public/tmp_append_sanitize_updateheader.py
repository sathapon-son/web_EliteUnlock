from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")
old = "        updateCartCount();\n      }\n    }\n  }\n\n  async"
new = "        updateCartCount();\n      }\n    }\n  sanitizeSearchPrefill();\n  }\n\n  async"
if old not in text:
    raise SystemExit("updateHeaderAuth closing block not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
