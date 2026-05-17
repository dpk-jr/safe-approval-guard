"""
Safe Approval Guard API - Deployed on PythonAnywhere/Railway/Render
"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

os.chdir("docs")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    server = HTTPServer(("0.0.0.0", port), SimpleHTTPRequestHandler)
    print(f"Server running on port {port}")
    server.serve_forever()
