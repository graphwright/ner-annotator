#!/usr/bin/env python3
"""
identity_service.py — minimal local identity service for NER Annotator.

Usage:
  python identity_service.py --port 7700

Then expose it with a tunnel, e.g. Cloudflare Tunnel:
  cloudflared tunnel --url http://localhost:7700
"""

import argparse
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

IDENTITY_DB = {
    "sherlock holmes": {
        "canonical_id": "character:sherlock_holmes",
        "label": "Sherlock Holmes",
        "url": "https://bakerstreet.fandom.com/wiki/Sherlock_Holmes",
        "description": "Consulting detective, 221B Baker Street.",
        "confidence": 0.99,
    },
    "irene adler": {
        "canonical_id": "character:irene_adler",
        "label": "Irene Adler",
        "url": "https://bakerstreet.fandom.com/wiki/Irene_Adler",
        "description": "Opera contralto and adventuress.",
        "confidence": 0.98,
    },
    "watson": {
        "canonical_id": "character:john_watson",
        "label": "Dr. John H. Watson",
        "url": "https://bakerstreet.fandom.com/wiki/John_H._Watson",
        "description": "Holmes's companion and narrator.",
        "confidence": 0.98,
    },
    "john watson": {
        "canonical_id": "character:john_watson",
        "label": "Dr. John H. Watson",
        "url": "https://bakerstreet.fandom.com/wiki/John_H._Watson",
        "description": "Holmes's companion and narrator.",
        "confidence": 0.98,
    },
}


def resolve_label(label: str) -> dict:
    key = (label or "").strip().lower()
    return IDENTITY_DB.get(
        key,
        {
            "canonical_id": None,
            "label": label,
            "url": None,
            "description": "No mapping found in local demo service.",
            "confidence": 0.0,
        },
    )


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length)

        try:
            payload = json.loads(raw_body or b"{}")
            if not isinstance(payload, dict):
                raise ValueError("payload must be an object")
        except Exception as exc:  # noqa: BLE001
            print(f"[identity] invalid JSON payload: {exc}")
            self.respond(400, {"error": "invalid JSON payload"})
            return

        response = resolve_label(str(payload.get("label") or ""))
        self.respond(200, response)

    def respond(self, status: int, body: dict):
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, fmt, *args):  # noqa: A003
        print(f"[identity] {fmt % args}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7700)
    args = parser.parse_args()

    server = HTTPServer(("", args.port), Handler)
    print(f"Identity service running on http://localhost:{args.port}")
    server.serve_forever()
