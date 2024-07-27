import requests

from absl import logging as log

from secrets_manager import SecretsManager
from firebase_admin import auth


class AuthResponse:
    ok: bool
    uid: str
    id_token: str
    refresh_token: str

    def __init__(self, ok: bool) -> None:
        self.ok = ok


class AuthManager:
    def __init__(self, secrets_mgr: SecretsManager) -> None:
        self.secrets_mgr = secrets_mgr

    def login(self, email: str, password: str) -> AuthResponse:
        firebase_web_api_key = self.secrets_mgr.get_firebase_web_api_key()

        # Make a request to Firebase Authentication REST API for sign-in
        request_data = {"email": email, "password": password, "returnSecureToken": True}

        response = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={firebase_web_api_key}",
            json=request_data,
        )

        if not response.ok:
            return AuthResponse(ok=False)

        # See https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithPassword
        user_data = response.json()
        auth_response = AuthResponse(ok=True)
        auth_response.uid = user_data["localId"]
        auth_response.id_token = user_data["idToken"]
        auth_response.refresh_token = user_data["refreshToken"]

        if not auth_response.uid:
            log.error("localId is not found")
            return AuthResponse(ok=False)
        if not auth_response.id_token:
            log.error("idToken is not found")
            return AuthResponse(ok=False)
        if not auth_response.refresh_token:
            log.error("refreshToken is not found")
            return AuthResponse(ok=False)
        return auth_response

    def refresh(self, refresh_token: str) -> AuthResponse:
        firebase_web_api_key = self.secrets_mgr.get_firebase_web_api_key()

        # Make a request to Firebase Authentication REST API for sign-in
        request_data = {"grant_type": "refresh_token", "refresh_token": refresh_token}

        response = requests.post(
            f"https://securetoken.googleapis.com/v1/token?key={firebase_web_api_key}",
            json=request_data,
        )

        if not response.ok:
            return AuthResponse(ok=False)

        # See https://firebase.google.com/docs/reference/rest/auth#section-refresh-token
        user_data = response.json()
        auth_response = AuthResponse(ok=True)
        auth_response.uid = user_data["user_id"]
        auth_response.id_token = user_data["id_token"]
        auth_response.refresh_token = user_data["refresh_token"]

        if not auth_response.uid:
            log.error("localId is not found [refresh]")
            return AuthResponse(ok=False)
        if not auth_response.id_token:
            log.error("idToken is not found [refresh]")
            return AuthResponse(ok=False)
        if not auth_response.refresh_token:
            log.error("refreshToken is not found [refresh]")
            return AuthResponse(ok=False)

        return auth_response

    def user_id_from_token(self, id_token: str) -> str | None:
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token["uid"]
        except Exception as err:
            # TODO: Add a way to refresh the token if its expired.
            # Note, this would output "Token expired, NNNNN < NNNNN" if the token expired.
            log.error(f"Cannot verify id token: {err}")
            return None
