"""
Microsoft Graph OAuth Setup — Device Code Flow

Run this ONCE to authenticate Axis with your Microsoft account.
After auth, tokens are cached at ~/.axis/msgraph_token.json and
refreshed automatically for all future sessions.

Usage:
    cd axis && uv run python scripts/auth_msgraph.py

You'll be prompted to:
  1. Visit https://microsoft.com/devicelogin
  2. Enter a short code
  3. Sign in with your Microsoft account

Requires MICROSOFT_CLIENT_ID in axis/.env

─────────────────────────────────────────────────────────────────────
How to get a Client ID (one-time, 5 minutes):

  1. Go to portal.azure.com → App registrations → New registration
  2. Name: "Axis" | Account type: Personal accounts only
  3. Redirect URI: leave blank (public client / Device Code Flow)
  4. After creation: Authentication → Add platform → Mobile/Desktop
     → Check "https://login.microsoftonline.com/common/oauth2/nativeclient"
     → Toggle "Allow public client flows" ON → Save
  5. Copy the Application (client) ID → add to axis/.env as MICROSOFT_CLIENT_ID
─────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from connectors.msgraph import MSGraphAuth, TOKEN_CACHE_PATH


def main() -> None:
    print("=" * 55)
    print("  Axis — Microsoft Graph Authentication")
    print("=" * 55)

    client_id = os.environ.get("MICROSOFT_CLIENT_ID", "")
    if not client_id:
        print("\n  ERROR: MICROSOFT_CLIENT_ID not set in axis/.env")
        print("\n  How to get one (5 min):")
        print("  1. portal.azure.com → App registrations → New registration")
        print('  2. Name it "Axis", account type: Personal accounts only')
        print("  3. Authentication → Mobile/Desktop → enable public client flows")
        print("  4. Copy the Application (client) ID → add to axis/.env")
        sys.exit(1)

    if TOKEN_CACHE_PATH.exists():
        print(f"\n  Token cache found at {TOKEN_CACHE_PATH}")
        answer = input("  Re-authenticate? (y/N): ").strip().lower()
        if answer != "y":
            print("  Skipped. Using existing token.")
            _verify_existing_token()
            return
        TOKEN_CACHE_PATH.unlink()

    auth = MSGraphAuth(client_id=client_id)

    print("\n  Starting Device Code Flow...")
    print("  ─────────────────────────────────────")
    token = auth.device_code_flow()
    print("  ─────────────────────────────────────")

    print(f"\n  Authenticated. Token cached at:")
    print(f"  {TOKEN_CACHE_PATH}")
    print("\n  Verifying calendar and email access...")
    _verify_with_token(token)


def _verify_existing_token() -> None:
    try:
        from connectors.msgraph import MSGraphClient
        client = MSGraphClient()
        events = client.get_todays_events()
        msgs = client.get_unread_emails(limit=3)
        print(f"\n  Calendar: {len(events)} event(s) today.")
        print(f"  Email: {len(msgs)} unread message(s).")
        print("\n  Microsoft Graph is connected.")
    except Exception as e:
        print(f"\n  Verification failed: {e}")
        print("  Run the script again to re-authenticate.")


def _verify_with_token(token: str) -> None:
    try:
        from connectors.msgraph import MSGraphClient
        client = MSGraphClient()
        events = client.get_todays_events()
        msgs = client.get_unread_emails(limit=3)
        print(f"\n  Calendar: {len(events)} event(s) today.")
        print(f"  Email: {len(msgs)} unread message(s).")
        print("\n  Microsoft Graph is connected and ready.")
        print("  Axis will now use these credentials automatically.")
    except Exception as e:
        print(f"\n  Auth succeeded but verification failed: {e}")


if __name__ == "__main__":
    main()
