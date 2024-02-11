from absl import logging as log
from firebase_admin import credentials, auth, firestore
from firebase_admin.auth import UserRecord

class User:
    def __init__(self, record: UserRecord) -> None:
        self.record = record

    def email(self) -> str:
        return self.record.email

    def display_name(self) -> str:
        return self.record.display_name

    def is_authenticated(self) -> bool:
        return True

    def is_active(self) -> bool:
        return not self.record.disabled

    def is_anonymous(self) -> bool:
        return False

    def get_id(self) -> str:
        return self.record.uid

class UserManager:
    def __init__(self) -> None:
        pass

    def get_user(self, uid: str) -> User | None:
        try:
            # Fetch the user's display name and email from Firebase Authentication
            record = auth.get_user(uid)
            return User(record)

        except auth.AuthError as e:
            log.error(f'Error retrieving user information: {e}')
            return None