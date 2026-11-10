#!/usr/bin/env python3
"""Serve LabMeeting with UTF-8 and Markdown rendering; no external dependencies."""
import argparse
from functools import partial
from pathlib import Path
import sys
from urllib.parse import parse_qs, urlsplit

sys.dont_write_bytecode = True
from shared.markdown_page import render_document
from shared.evaluation_proxy import Handler as EvaluationHandler, PreviewServer

ROOT = Path(__file__).resolve().parent


class LabMeetingHandler(EvaluationHandler):
    def guess_type(self, path):
        content_type = super().guess_type(path)
        if content_type.startswith("text/") or content_type in ("application/javascript", "application/json"):
            content_type += "; charset=utf-8"
        return content_type

    def send_head(self):
        request = urlsplit(self.path)
        path = Path(self.translate_path(request.path))
        if path.suffix.lower() != ".md" or not path.is_file():
            return super().send_head()
        try:
            source = path.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeError):
            self.send_error(500, "Cannot read Markdown document")
            return None
        raw = parse_qs(request.query).get("raw") == ["1"]
        root_prefix = "../" * len(path.parent.relative_to(ROOT).parts)
        data = (source if raw else render_document(source, root_prefix=root_prefix)).encode("utf-8")
        from io import BytesIO
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8" if raw else "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        return BytesIO(data)


def build_docs():
    for source in sorted(ROOT.rglob("README.md")):
        destination = source.with_suffix(".html")
        root_prefix = "../" * len(source.parent.relative_to(ROOT).parts)
        destination.write_text(render_document(source.read_text(encoding="utf-8-sig"), root_prefix=root_prefix), encoding="utf-8")
        print("Updated:", destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--bind", default="0.0.0.0")
    parser.add_argument("--evaluation-port", type=int, default=7870)
    parser.add_argument("--build-docs", action="store_true", help="Update README.html and exit")
    args = parser.parse_args()
    if args.build_docs:
        build_docs()
        return
    handler = partial(LabMeetingHandler, directory=str(ROOT))
    return_path = "/2026_10_24_Reference_Driven_Shader_and_Control_Maps/#20"
    with PreviewServer((args.bind, args.port), handler, evaluation_port=args.evaluation_port, evaluation_return_path=return_path) as server:
        print(f"LabMeeting: http://localhost:{server.server_port}/", flush=True)
        print(f"Readme:     http://localhost:{server.server_port}/README.html", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.", flush=True)


if __name__ == "__main__":
    main()
