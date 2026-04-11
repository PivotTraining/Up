#!/usr/bin/env python3
"""
Lightweight dev server for Jaxon Basketball.
Serves cdn.html at the root so Python can preview the game
without needing Node.js / Vite.
"""
import http.server
import socketserver
import os

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # Serve cdn.html when the root or index.html is requested
        if self.path in ("/", "/cdn.html"):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} — {fmt % args}")


with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🏀  Jaxon Basketball — Python CDN server")
    print(f"    http://localhost:{PORT}")
    print(f"    Press Ctrl-C to stop\n")
    httpd.serve_forever()
