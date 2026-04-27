"""
DAW Warehouse — Python Dev Server
Serves .php files by processing <?php include '...'; ?> directives.
Run: python server.py
Then open: http://localhost:8080
"""
import http.server
import re
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8080

def process_php(content, base_dir):
    """Strip PHP tags and resolve include/require directives."""
    # Remove <?php ... ?> blocks that are not includes
    # Process includes
    def replace_include(m):
        path = m.group(1).strip().strip("'\"")
        full = os.path.join(base_dir, path.replace('/', os.sep))
        if os.path.exists(full):
            with open(full, encoding='utf-8') as f:
                inc = f.read()
            return process_php(inc, os.path.dirname(full))
        return f'<!-- missing include: {path} -->'

    content = re.sub(
        r'<\?php\s+(?:include|require)(?:_once)?\s+([^;]+);\s*\?>',
        replace_include, content)

    # Remove remaining simple <?php ... ?> blocks (variable assignments etc.)
    content = re.sub(r'<\?php[^?]*?\?>', '', content, flags=re.DOTALL)
    # Remove standalone <?php lines (no closing ?>)
    content = re.sub(r'<\?php.*?$', '', content, flags=re.MULTILINE)
    return content


class PHPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0].lstrip('/')
        if path == '' or path == '/':
            path = 'homepage.php'

        full = os.path.join(ROOT, path.replace('/', os.sep))

        if full.endswith('.php') and os.path.exists(full):
            with open(full, encoding='utf-8') as f:
                raw = f.read()
            html = process_php(raw, os.path.dirname(full))
            data = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', len(data))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}")


if __name__ == '__main__':
    print(f"DAW Warehouse server running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.\n")
    with http.server.HTTPServer(('', PORT), PHPHandler) as srv:
        srv.serve_forever()
