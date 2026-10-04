"""Loopback-only draft preview server with byte ranges for long WAV seeking."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import shutil

DIRECTORY = Path(__file__).resolve().parents[2] / "artifacts/audio-drafts"


class AudioHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        self.remaining = None
        value = self.headers.get("Range")
        path = Path(self.translate_path(self.path))
        if not value or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", value.strip())
        size = path.stat().st_size
        if not match or not any(match.groups()) or not size:
            return self.unsatisfiable(size)
        first, last = match.groups()
        if first:
            start = int(first)
            end = min(int(last), size - 1) if last else size - 1
        else:
            suffix = int(last)
            if not suffix:
                return self.unsatisfiable(size)
            start, end = max(0, size - suffix), size - 1
        if start >= size or start > end:
            return self.unsatisfiable(size)
        try:
            source = path.open("rb")
        except OSError:
            self.send_error(404)
            return None
        source.seek(start)
        self.remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self.remaining))
        self.end_headers()
        return source

    def unsatisfiable(self, size):
        self.send_response(416)
        self.send_header("Content-Range", f"bytes */{size}")
        self.send_header("Content-Length", "0")
        self.end_headers()
        return None

    def copyfile(self, source, outputfile):
        try:
            if self.remaining is None:
                shutil.copyfileobj(source, outputfile)
            else:
                while self.remaining > 0:
                    data = source.read(min(65536, self.remaining))
                    if not data:
                        break
                    outputfile.write(data)
                    self.remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            # Media players cancel superseded reads when switching or seeking.
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4178)
    args = parser.parse_args()
    handler = partial(AudioHandler, directory=str(DIRECTORY))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Audio preview: http://127.0.0.1:{args.port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
