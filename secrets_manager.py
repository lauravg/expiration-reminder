from absl import logging as log
import os


class SecretNotFoundException(Exception):
    """Raised when a secret was not found."""


class SecretsManager:
    __cache: dict[str, str] = {}

    def __init__(self) -> None:
        self.__mapping = {
            "openai": ("OPENAI_API_KEY", "/run/secrets/openai_api_key"),
            "firebase_service_account": (
                "FIREBASE_SERVICE_ACCOUNT_JSON",
                "/run/secrets/firebase_service_account_json",
            ),
            "firebase_web_api_key": (
                "FIREBASE_WEB_API_KEY",
                "/run/secrets/firebase_web_api_key",
            ),
        }
        pass

    def get_openai_api_key(self) -> str:
        return self.__get_internal_cached("openai")

    def get_firebase_service_account_json(self) -> str:
        return self.__get_internal_cached("firebase_service_account")

    def get_firebase_web_api_key(self) -> str:
        return self.__get_internal_cached("firebase_web_api_key")

    def __get_internal_cached(self, id: str) -> str:
        if id in self.__cache:
            return self.__cache[id]
        value = self.__get_internal(id)
        self.__cache[id] = value
        return value

    def __get_internal(self, id: str) -> str:
        if id not in self.__mapping:
            log.error("UNKNOWN secret name: '%s'", id)
            return ""

        # 1) Find is as an environment variable
        env_name = self.__mapping[id][0]
        key = os.environ.get(env_name)
        if key is not None and not key.isspace():
            log.info(f"Found secret '{id}' through environment variable.'")
            return key

        # 2) Try to find the secret at the developer "secrets" location.
        file_name = f"./secrets/{env_name}"
        try:
            f = open(file_name, "r")
            key = f.read().strip("\n")
            if key is not None and not key.isspace():
                log.info(f"Found secret '{id}' through DEV secrets file'")
                return key
        except:
            raise SecretNotFoundException(f"Unable to read secret key for '{id}'.")

        # 3) Try to find it as the specified secrets file.
        file_name = self.__mapping[id][1]
        try:
            f = open(file_name, "r")
            key = f.read().strip("\n")
            if key is not None and not key.isspace():
                log.info(f"Found secret '{id}' through local secrets file'")
                return key
        except:
            raise SecretNotFoundException(f"Unable to read secret key for '{id}'.")
