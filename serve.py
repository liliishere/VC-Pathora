"""Server lokal untuk Pathora. Mengerti alamat tanpa .html (sama seperti Netlify).

Jalankan dari folder ini:   python3 serve.py
Lalu buka:                  http://localhost:8000
Berhenti:                   Ctrl+C
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split("?")[0].split("#")[0]
        if p != "/" and "." not in os.path.basename(p) and os.path.exists("." + p + ".html"):
            path = p + ".html" + (("?" + path.split("?", 1)[1]) if "?" in path else "")
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # saat uji lokal, selalu muat versi terbaru
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as srv:
    print("Pathora jalan di http://localhost:%d  (Ctrl+C untuk berhenti)" % PORT)
    srv.serve_forever()
