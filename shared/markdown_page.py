"""Render the Markdown features used in LabMeeting notes using the standard library."""
from html import escape
from pathlib import Path
import re
from urllib.parse import urlsplit


def inline(text):
    """Escape text first; only create markup for explicit inline Markdown tokens."""
    tokens = re.compile(r"(`+)(.+?)\1|\[([^\]]+)\]\(([^\s)]+)\)|\*\*(.+?)\*\*|\*([^*]+)\*")
    result, offset = [], 0
    for match in tokens.finditer(text):
        result.append(escape(text[offset:match.start()]))
        if match.group(1):
            result.append("<code>" + escape(match.group(2)) + "</code>")
        elif match.group(3):
            url = match.group(4)
            if urlsplit(url).scheme not in ("", "http", "https", "mailto"):
                result.append(escape(match.group(0)))
            else:
                external = ' target="_blank" rel="noopener noreferrer"' if urlsplit(url).scheme in ("http", "https") else ""
                result.append('<a href="' + escape(url, quote=True) + '"' + external + '>' + inline(match.group(3)) + '</a>')
        elif match.group(5):
            result.append("<strong>" + inline(match.group(5)) + "</strong>")
        else:
            result.append("<em>" + inline(match.group(6)) + "</em>")
        offset = match.end()
    result.append(escape(text[offset:]))
    return "".join(result)


def table_cells(line):
    # Keep pipes in inline code intact.
    return re.split(r"\|(?=(?:[^`]*`[^`]*`)*[^`]*$)", line.strip().strip("|"))


def render_markdown(source):
    lines = source.lstrip("\ufeff").splitlines()
    output, toc, index = [], [], 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        fence = re.match(r"^\s*(`{3,}|~{3,})(.*)$", line)
        if fence:
            language = fence.group(2).strip()
            code = []
            index += 1
            while index < len(lines) and not re.match(r"^\s*" + re.escape(fence.group(1)) + r"\s*$", lines[index]):
                code.append(lines[index])
                index += 1
            output.append('<div class="code-block"><span class="code-language">' + escape(language or "text") + '</span><pre><code>' + escape("\n".join(code)) + '</code></pre></div>')
            index += 1
            continue
        heading = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", line)
        if heading:
            level, text = len(heading.group(1)), heading.group(2)
            anchor = "section-" + str(index + 1)
            output.append(f'<h{level} id="{anchor}">{inline(text)}</h{level}>')
            if level == 2:
                toc.append((anchor, text))
            index += 1
            continue
        if index + 1 < len(lines) and "|" in line:
            separators = table_cells(lines[index + 1])
            if separators and all(re.fullmatch(r"\s*:?-{3,}:?\s*", cell) for cell in separators):
                headers = table_cells(line)
                rows = []
                index += 2
                while index < len(lines) and lines[index].strip() and "|" in lines[index]:
                    cells = table_cells(lines[index])
                    rows.append("<tr>" + "".join("<td>" + inline(cell.strip()) + "</td>" for cell in cells) + "</tr>")
                    index += 1
                output.append('<div class="table-scroll"><table><thead><tr>' + "".join("<th>" + inline(cell.strip()) + "</th>" for cell in headers) + '</tr></thead><tbody>' + "".join(rows) + '</tbody></table></div>')
                continue
        item = re.match(r"^\s*(?:[-+*]|\d+[.)])\s+(.+)$", line)
        if item:
            ordered = bool(re.match(r"^\s*\d+[.)]", line))
            tag = "ol" if ordered else "ul"
            items = []
            pattern = r"^\s*\d+[.)]\s+(.+)$" if ordered else r"^\s*[-+*]\s+(.+)$"
            while index < len(lines):
                match = re.match(pattern, lines[index])
                if not match:
                    break
                items.append("<li>" + inline(match.group(1)) + "</li>")
                index += 1
            output.append(f'<{tag}>' + "".join(items) + f'</{tag}>')
            continue
        paragraph = [line.strip()]
        index += 1
        while index < len(lines) and lines[index].strip():
            if re.match(r"^\s*(#{1,6}\s|`{3,}|~{3,}|[-+*]\s|\d+[.)]\s)", lines[index]):
                break
            paragraph.append(lines[index].strip())
            index += 1
        output.append("<p>" + inline(" ".join(paragraph)) + "</p>")
    return "\n".join(output), toc


def render_document(source, root_prefix=""):
    content, toc = render_markdown(source)

    def document_link(match):
        url = urlsplit(match.group(1))
        if not url.scheme and not url.netloc and Path(url.path).name in ("README.md", "CONTENTS.md", "讲稿.md"):
            return 'href="' + url._replace(path=url.path[:-3] + ".html").geturl() + '"'
        return match.group(0)

    # Markdown stays readable on GitHub; browser copies link to offline HTML.
    content = re.sub(r'href="([^"]+)"', document_link, content)
    heading = re.search(r"^#\s+(.+?)\s*#*\s*$", source.lstrip("\ufeff"), re.MULTILINE)
    title = heading.group(1) if heading else "文档"
    links = "".join('<a href="#' + anchor + '">' + escape(title) + '</a>' for anchor, title in toc)
    return '''<!doctype html>
<html lang="zh-Hans-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>''' + escape(title) + ''' · LabMeeting</title>
  <link rel="stylesheet" href="''' + escape(root_prefix, quote=True) + '''shared/presentation.css">
  <link rel="stylesheet" href="''' + escape(root_prefix, quote=True) + '''shared/documentation.css">
</head>
<body class="documentation">
  <header class="doc-header"><a href="''' + escape(root_prefix, quote=True) + '''index.html" class="doc-brand">LAB MEETING</a><span>文档</span><a href="''' + escape(root_prefix, quote=True) + '''index.html">返回演示稿目录 ↗</a></header>
  <div class="doc-layout">
    <aside class="doc-sidebar"><p>ON THIS PAGE</p><nav aria-label="文档目录">''' + links + '''</nav></aside>
    <main class="doc-content">''' + content + '''<footer class="doc-footer">LabMeeting · 本地可用，无需安装依赖</footer></main>
  </div>
</body>
</html>
'''
