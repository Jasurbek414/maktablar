import markdown
import os

with open('integration_guide.md', 'r', encoding='utf-8') as f:
    text = f.read()

html = markdown.markdown(text)

full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }}
h1, h2, h3 {{ color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px; }}
code {{ background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: Consolas, monospace; }}
pre {{ background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; font-family: Consolas, monospace; }}
ul {{ padding-left: 20px; }}
li {{ margin-bottom: 5px; }}
</style>
</head>
<body>
{html}
</body>
</html>"""

with open('integration_guide.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

print("HTML generated.")
