"""
AES-256-GCM decryption utilities for secure token handling.

Compatible with the TypeScript encryption implementation in the web app.
The worker only needs to decrypt tokens, not encrypt them.
"""

import base64
import json
from typing import Any, TypeVar

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

T = TypeVar("T")


def decrypt_token(encrypted_blob: str, iv: str, auth_tag: str) -> str:
    """
    Decrypt an AES-256-GCM encrypted token.

    Args:
        encrypted_blob: Base64-encoded ciphertext
        iv: Base64-encoded initialization vector
        auth_tag: Base64-encoded authentication tag

    Returns:
        Decrypted plaintext string

    Raises:
        ValueError: If encryption key is not configured
        cryptography.exceptions.InvalidTag: If authentication fails
    """
    key = _get_encryption_key()

    # Decode base64 inputs
    iv_bytes = base64.b64decode(iv)
    ciphertext = base64.b64decode(encrypted_blob)
    auth_tag_bytes = base64.b64decode(auth_tag)

    # GCM combines ciphertext and auth tag for decryption
    combined = ciphertext + auth_tag_bytes

    # Decrypt
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv_bytes, combined, None)

    return plaintext.decode("utf-8")


def decrypt_json(encrypted_blob: str, iv: str, auth_tag: str) -> dict[str, Any]:
    """
    Decrypt an encrypted JSON object.

    Args:
        encrypted_blob: Base64-encoded ciphertext
        iv: Base64-encoded initialization vector
        auth_tag: Base64-encoded authentication tag

    Returns:
        Decrypted JSON as a dictionary
    """
    plaintext = decrypt_token(encrypted_blob, iv, auth_tag)
    return json.loads(plaintext)


def _get_encryption_key() -> bytes:
    """
    Get the encryption key from settings.

    Returns:
        32-byte encryption key

    Raises:
        ValueError: If key is not configured or invalid
    """
    key_hex = settings.encryption_key

    if not key_hex:
        raise ValueError("ENCRYPTION_KEY environment variable is not set")

    if len(key_hex) != 64:
        raise ValueError(
            f"ENCRYPTION_KEY must be a 64-character hex string (32 bytes), "
            f"got {len(key_hex)} characters"
        )

    try:
        return bytes.fromhex(key_hex)
    except ValueError as e:
        raise ValueError(f"ENCRYPTION_KEY must be a valid hexadecimal string: {e}")
