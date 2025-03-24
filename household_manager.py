from absl import logging as log
from flask import session
import flask_login
from google.cloud.firestore_v1 import Query, DocumentSnapshot
from google.cloud.firestore_v1.base_query import FieldFilter
import uuid


class Household:
    def __init__(
        self,
        hid: str,
        owner_uid: str,
        name: str,
        participants: list[str],
        categories: list[str] = None,
        locations: list[str] = None,
    ) -> None:
        self.id = hid
        self.owner_uid = owner_uid
        self.name = name
        self.participants = participants
        self.categories = categories if categories is not None else ["Veggies", "Fruits", "Baking", "Spices", "Others"]
        self.locations = locations if locations is not None else ["Pantry", "Fridge", "Freezer"]

    def __iter__(self):
        # Note, we don't want to persist ID in the DB.
        # Order fields as requested: name, owner_uid, participants, categories, locations
        yield "name", self.name
        yield "owner_uid", self.owner_uid
        yield "participants", self.participants
        yield "categories", self.categories
        yield "locations", self.locations


class HouseholdManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def user_has_household(self, uid: str, household_id: str) -> bool:
        household = self.get_household(household_id)
        if household is None:
            return False
        return uid in household.participants

    def get_household(self, id: str) -> Household | None:
        if id is None or id.isspace():
            log.error("get_household(): id must not be empty")
            return None
        try:
            data = self.__collection().document(id).get()
            if data is None:
                log.error("[%s] Cannot find household", id)
                return None
            return self.__household_from_dict(data)
        except Exception as err:
            log.error("[%s] Unable to fetch household data, %s", id, err)
            return None

    def get_households_for_user(self, uid: str) -> list[Household]:
        if uid is None or uid.isspace():
            log.error("get_households_for_user(): uid must not be empty")
            return None
        try:
            found_household_ids = []
            results = []
            # Add the household where the user is an owner first.
            query: Query = self.__collection().where(
                filter=FieldFilter("owner_uid", "==", uid)
            )
            for household in query.stream():
                results.append(self.__household_from_dict(household))
                found_household_ids.append(household.id)

            # Next, add the households the user is a participant.
            query: Query = self.__collection().where(
                filter=FieldFilter("participants", "array_contains", uid)
            )
            for household in query.stream():
                if household.id not in found_household_ids:
                    results.append(self.__household_from_dict(household))
            return results
        except Exception as err:
            log.error("[%s] Unable to fetch households for user, %s", uid, err)
            return None

    def add_or_update_household(self, household: Household) -> bool:
        hid = str(uuid.uuid4()) if not household.id else household.id
        if not household.owner_uid or household.owner_uid.isspace():
            log.error("add_or_update_household(): owner_id must be set")
            return False
        if not household.name or household.name.isspace():
            log.error("add_or_update_household(): name must be set")
            return False
        try:
            d = dict(household)
            self.__collection().document(hid).set(d)
        except Exception as err:
            log.error("[%s] Unable to store household: %s", household.name, err)
            return False
        return True

    def delete_household(self, id: str, uid: str) -> bool:
        if id is None or id.isspace():
            log.error("delete_household(): id must not be empty")
            return False
        try:
            self.__collection().document(id).delete()
        except Exception as err:
            log.error("delete_household(): Unable to delete household: %s", err)
            return False
        return True

    def add_participant(self, id: str, uid: str, participant_id: str) -> bool:
        if id is None or id.isspace():
            log.error("add_participant(): id must not be empty")
            return False
        if uid is None or uid.isspace():
            log.error("add_participant(): uid must not be empty")
            return False
        if participant_id is None or participant_id.isspace():
            log.error("add_participant(): participant_id must not be empty")
            return False

        household = self.get_household(id)
        if household is None:
            log.error("add_participant(): Unable to get household with id %s", id)
            return False
        if participant_id not in household.participants:
            household.participants.append(participant_id)
            if not self.add_or_update_household(household):
                log.error("add_participant(): Unable to update household")
                return False
        return True

    def __collection(self):
        return self.__db.collection("households")

    def __household_from_dict(self, doc: DocumentSnapshot) -> Household:
        dict = doc.to_dict()
        return Household(doc.id, dict["owner_uid"], dict["name"], dict["participants"], dict["categories"], dict["locations"])
