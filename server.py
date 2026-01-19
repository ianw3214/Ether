import http.server
import socketserver
import mimetypes

# Patch in the correct extensions
mimetypes.init() # Ensure mimetypes are loaded
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')

# Use the default handler
Handler = http.server.SimpleHTTPRequestHandler

# Override the extensions_map to use the updated mimetypes
Handler.extensions_map.update({
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
})

PORT = 8000

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
