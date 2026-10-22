import http.server
import socketserver
import json
import subprocess
import sys
import os
import urllib.request
import urllib.error

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_gemini_api_key():
    key = os.environ.get("GEMINI_API_KEY", "")
    if key:
        return key
    cfg_path = os.path.join(DIRECTORY, "config.json")
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                return json.load(f).get("GEMINI_API_KEY", "")
        except Exception:
            pass
    return ""

GEMINI_API_KEY = get_gemini_api_key()
GEMINI_MODEL = "gemini-2.5-flash"

import urllib.parse

class JupyterHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/practicals"):
            self.handle_get_practicals()
        else:
            super().do_GET()

    def handle_get_practicals(self):
        try:
            p_path = os.path.join(DIRECTORY, "practicals.json")
            if not os.path.exists(p_path):
                self.send_error(404, "practicals.json not found")
                return

            with open(p_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if "?file=" in self.path:
                fname = self.path.split("?file=")[1].split("&")[0]
                fname = urllib.parse.unquote(fname)
                for item in data:
                    if item["filename"] == fname or item["cleanName"] == fname:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps(item).encode("utf-8"))
                        return
                self.send_error(404, "Practical not found")
                return

            summaries = [{
                "filename": item["filename"],
                "cleanName": item["cleanName"],
                "title": item["title"],
                "totalCells": item["totalCells"]
            } for item in data]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(summaries).encode("utf-8"))
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def do_POST(self):
        if self.path == "/api/run":
            self.handle_run_code()
        elif self.path == "/api/gemini":
            self.handle_gemini_proxy()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_run_code(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode("utf-8"))
            code = data.get("code", "")

            # Run code with python
            proc = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=8,
                cwd=DIRECTORY
            )

            response = {
                "success": proc.returncode == 0,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "returncode": proc.returncode
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))
        except subprocess.TimeoutExpired:
            response = {
                "success": False,
                "stdout": "",
                "stderr": "TimeoutError: Execution timed out after 8 seconds.",
                "returncode": -1
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))
        except Exception as e:
            response = {
                "success": False,
                "stdout": "",
                "stderr": f"Server execution error: {str(e)}",
                "returncode": 1
            }
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))

    def handle_gemini_proxy(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode("utf-8"))

            key = data.get("apiKey") or GEMINI_API_KEY
            model = data.get("model") or GEMINI_MODEL
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

            payload = json.dumps({"contents": data.get("contents", [])}).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=30) as resp:
                result = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(result)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", PORT), JupyterHandler) as httpd:
        print(f"Jupyter clone server with Gemini AI running at http://localhost:{PORT}")
        httpd.serve_forever()
