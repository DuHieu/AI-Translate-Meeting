#!/usr/bin/env python3
"""
License Token Generator for AI-Translate-Meeting
Generates cryptographically signed HMAC-SHA256 licenses for testing and provisioning.
"""

import argparse
import base64
import hashlib
import hmac
import json
import sys
import time


def generate_license(
    org: str,
    tier: str,
    max_rooms: int,
    max_participants: int,
    features: list[str],
    expires_in_days: int,
    signing_key: str,
) -> str:
    now = int(time.time())
    exp = now + (expires_in_days * 86400) if expires_in_days > 0 else 0

    payload = {
        "org": org,
        "tier": tier,
        "max_rooms": max_rooms,
        "max_participants": max_participants,
        "features": features,
        "exp": exp,
    }

    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_b64 = (
        base64.urlsafe_b64encode(payload_json.encode("utf-8"))
        .decode("utf-8")
        .rstrip("=")
    )

    sig = hmac.new(
        signing_key.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256
    ).digest()
    sig_b64 = (
        base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")
    )

    return f"{payload_b64}.{sig_b64}"


def main():
    parser = argparse.ArgumentParser(description="Generate AI-Translate-Meeting License Key")
    parser.add_argument("--org", default="Load Benchmark Lab", help="Organization name")
    parser.add_argument("--tier", default="business", choices=["pilot", "team", "business", "enterprise"], help="License tier")
    parser.add_argument("--rooms", type=int, default=50, help="Max concurrent rooms")
    parser.add_argument("--participants", type=int, default=100, help="Max participants per room")
    parser.add_argument("--days", type=int, default=365, help="Validity period in days")
    parser.add_argument("--signing-key", required=True, help="HMAC signing key configured in License:SigningKey")
    parser.add_argument("--features", default="glossary,minutes_export", help="Comma-separated feature list")

    args = parser.parse_args()
    features = [f.strip() for f in args.features.split(",") if f.strip()]
    token = generate_license(
        org=args.org,
        tier=args.tier,
        max_rooms=args.rooms,
        max_participants=args.participants,
        features=features,
        expires_in_days=args.days,
        signing_key=args.signing_key,
    )
    print(token)


if __name__ == "__main__":
    main()
