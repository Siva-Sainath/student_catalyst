#!/usr/bin/env python3
"""Quick API smoke test against local server."""
import json
import sys
import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"


def main():
    r = requests.post(f"{BASE}/auth/demo", json={"email": "student@bmsce.ac.in", "name": "Rahul Sharma"}, timeout=10)
    r.raise_for_status()
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    paths = [
        "/health",
        "/data/dashboard",
        "/data/schedule",
        "/data/assignments",
        "/data/placement",
        "/data/attendance",
        "/data/finance",
        "/data/jobs",
        "/user/profile",
    ]
    for p in paths:
        res = requests.get(f"{BASE}{p}", headers=h, timeout=60)
        print(p, res.status_code, "ok" if res.ok else res.text[:80])
    print("smoke done")


if __name__ == "__main__":
    main()
