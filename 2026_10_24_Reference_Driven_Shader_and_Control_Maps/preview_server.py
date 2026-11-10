"""Serve the offline slides and forward the evaluation app through the same port.

Run as a normal user: python3 preview_server.py --port 12024
Only Python's standard library is required for this optional server.
"""
from __future__ import annotations

import argparse
import http.client
import json
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


EVALUATION_PATH = '/__evaluation__/'
STATUS_PATH = '/__evaluation_status__'
HOP_HEADERS = {
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade',
}


class PreviewServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 64

    def __init__(self, address, handler, evaluation_host='127.0.0.1', evaluation_port=7870):
        self.evaluation_host = evaluation_host
        self.evaluation_port = evaluation_port
        super().__init__(address, handler)


class Handler(SimpleHTTPRequestHandler):
    timeout = 30.0

    def evaluation_available(self):
        # Avoid an HTTP request here: rendering uses a single CUDA thread and
        # may be busy. Close the probe immediately so it cannot occupy a worker.
        try:
            with socket.create_connection(
                (self.server.evaluation_host, self.server.evaluation_port), timeout=1
            ):
                return True
        except OSError:
            return False

    def send_status(self):
        body = json.dumps({'available': self.evaluation_available()}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def evaluation_route(self):
        path = urlsplit(self.path).path
        return path.startswith(EVALUATION_PATH) or path.startswith('/api/')

    def forward_evaluation(self):
        # The evaluation UI uses root-relative /api/ URLs. Keep those URLs on
        # the presentation origin and forward them to the same fixed backend.
        path = self.path
        if urlsplit(path).path.startswith(EVALUATION_PATH):
            path = '/' + path[len(EVALUATION_PATH):]
        connection = http.client.HTTPConnection(
            self.server.evaluation_host, self.server.evaluation_port, timeout=3
        )
        headers_sent = False
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 <= length <= 65536:
                self.send_error(413, 'Request too large')
                return
            if self.command == 'POST':
                origin = self.headers.get('Origin')
                expected = f'http://{self.headers.get("Host")}'
                if origin and origin != expected:
                    self.send_error(403, 'Origin does not match this server')
                    return
            body = self.rfile.read(length) if length else None
            # Preserve Host and Origin together for the evaluation application's
            # own same-origin validation; the upstream address is fixed above.
            headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP_HEADERS}
            headers['Connection'] = 'close'
            if urlsplit(self.path).path.startswith(EVALUATION_PATH):
                self.log_message('Forwarding evaluation page to %s:%s',
                                 self.server.evaluation_host, self.server.evaluation_port)
            connection.connect()
            connection.sock.settimeout(180)
            connection.request(self.command, path, body=body, headers=headers)
            response = connection.getresponse()
            self.send_response(response.status, response.reason)
            for key, value in response.getheaders():
                if key.lower() not in HOP_HEADERS | {'server', 'date'}:
                    self.send_header(key, value)
            self.end_headers()
            headers_sent = True
            if self.command != 'HEAD':
                while chunk := response.read(65536):
                    self.wfile.write(chunk)
        except (OSError, http.client.HTTPException, ValueError) as error:
            if not headers_sent:
                self.log_error('Evaluation upstream failed: %s', error)
                timed_out = isinstance(error, TimeoutError)
                title = '评估服务暂未响应' if timed_out else '评估服务连接失败'
                detail = ('评估服务可能正在处理其他请求，请稍后重试。' if timed_out
                          else '无法连接服务器端的评估服务，请确认 7870 服务正在运行。')
                body = (f'<!doctype html><meta charset="utf-8"><title>{title}</title>'
                        f'<h1>{title}</h1><p>{detail}</p>'
                        f'<p><a href="{EVALUATION_PATH}">重试</a> · '
                        '<a href="/#20">返回汇报网页</a></p>').encode()
                self.send_response(504 if timed_out else 502)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                try:
                    self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError):
                    pass
        finally:
            connection.close()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == STATUS_PATH:
            self.send_status()
        elif path == EVALUATION_PATH.rstrip('/'):
            self.send_response(302)
            self.send_header('Location', EVALUATION_PATH)
            self.send_header('Content-Length', '0')
            self.end_headers()
        elif self.evaluation_route():
            self.forward_evaluation()
        else:
            super().do_GET()

    def do_HEAD(self):
        if self.evaluation_route():
            self.forward_evaluation()
        else:
            super().do_HEAD()

    def do_POST(self):
        if self.evaluation_route():
            self.forward_evaluation()
        else:
            self.send_error(405, 'Method not allowed')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=12024)
    parser.add_argument('--evaluation-port', type=int, default=7870)
    args = parser.parse_args()
    handler = partial(Handler, directory=str(Path(__file__).resolve().parent))
    with PreviewServer((args.host, args.port), handler, evaluation_port=args.evaluation_port) as server:
        print(f'Presentation: http://{args.host}:{args.port}/', flush=True)
        print(f'Evaluation: same connection -> 127.0.0.1:{args.evaluation_port}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
