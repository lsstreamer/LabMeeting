"""Serve the offline slides with Python's standard library.

Run as a normal user: python3 preview_server.py --port 12024
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    timeout = 30.0

    def guess_type(self, path):
        content_type = super().guess_type(path)
        if content_type.startswith('text/') or content_type in ('application/javascript', 'application/json'):
            content_type += '; charset=utf-8'
        return content_type


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=12024)
    args = parser.parse_args()
    handler = partial(Handler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer((args.host, args.port), handler) as server:
        print(f'Presentation: http://{args.host}:{server.server_port}/', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('Server stopped.', flush=True)


if __name__ == '__main__':
    main()
