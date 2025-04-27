from absl import logging as log
from flask import session
import flask_login
from google.cloud.firestore_v1 import Query, DocumentSnapshot
from google.cloud.firestore_v1.base_query import FieldFilter
import uuid
from datetime import datetime


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


class Invitation:
    def __init__(
        self,
        id: str,
        household_id: str,
        household_name: str,
        inviter_uid: str,
        invitee_email: str,
        status: str = "pending",
        created_at: int = None,
    ) -> None:
        self.id = id
        self.household_id = household_id
        self.household_name = household_name
        self.inviter_uid = inviter_uid
        self.invitee_email = invitee_email
        self.status = status
        self.created_at = created_at

    def __iter__(self):
        yield "household_id", self.household_id
        yield "household_name", self.household_name
        yield "inviter_uid", self.inviter_uid
        yield "invitee_email", self.invitee_email
        yield "status", self.status
        yield "created_at", self.created_at


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

    def create_invitation(self, household_id: str, inviter_uid: str, invitee_email: str) -> Invitation | None:
        if household_id is None or household_id.isspace():
            log.error("create_invitation(): household_id must not be empty")
            return None
        if inviter_uid is None or inviter_uid.isspace():
            log.error("create_invitation(): inviter_uid must not be empty")
            return None
        if invitee_email is None or invitee_email.isspace():
            log.error("create_invitation(): invitee_email must not be empty")
            return None
            
        # First, check if the household exists
        household = self.get_household(household_id)
        if household is None:
            log.error("create_invitation(): Household not found")
            return None
            
        # Check if the inviter is a member of the household
        if inviter_uid not in household.participants:
            log.error("create_invitation(): Inviter is not a member of the household")
            return None
            
        # Check if an invitation already exists for this email and household
        existing_invitation = self.get_invitation_by_email_and_household(invitee_email, household_id)
        if existing_invitation is not None:
            if existing_invitation.status == "pending":
                # Return the existing invitation
                return existing_invitation
            elif existing_invitation.status == "accepted":
                log.error("create_invitation(): User already accepted an invitation to this household")
                return None
                
        # Create a new invitation
        invitation_id = str(uuid.uuid4())
        invitation = Invitation(
            invitation_id,
            household_id,
            household.name,
            inviter_uid,
            invitee_email,
            "pending",
            # Store the created_at timestamp in seconds since epoch
            int(datetime.now().timestamp())
        )
        
        try:
            d = dict(invitation)
            self.__invitations_collection().document(invitation_id).set(d)
            return invitation
        except Exception as err:
            log.error("[%s] Unable to store invitation: %s", invitation_id, err)
            return None
    
    def get_invitation(self, invitation_id: str) -> Invitation | None:
        if invitation_id is None or invitation_id.isspace():
            log.error("get_invitation(): invitation_id must not be empty")
            return None
        try:
            data = self.__invitations_collection().document(invitation_id).get()
            if data is None or not data.exists:
                log.error("[%s] Cannot find invitation", invitation_id)
                return None
            return self.__invitation_from_dict(data)
        except Exception as err:
            log.error("[%s] Unable to fetch invitation data, %s", invitation_id, err)
            return None
    
    def get_invitation_by_email_and_household(self, email: str, household_id: str) -> Invitation | None:
        if email is None or email.isspace():
            log.error("get_invitation_by_email_and_household(): email must not be empty")
            return None
        if household_id is None or household_id.isspace():
            log.error("get_invitation_by_email_and_household(): household_id must not be empty")
            return None
            
        try:
            query = self.__invitations_collection().where(
                filter=FieldFilter("invitee_email", "==", email)
            ).where(
                filter=FieldFilter("household_id", "==", household_id)
            )
            
            results = list(query.stream())
            if not results:
                return None
                
            # Return the first matching invitation
            return self.__invitation_from_dict(results[0])
        except Exception as err:
            log.error("Unable to fetch invitation by email and household: %s", err)
            return None
    
    def get_invitations_for_email(self, email: str) -> list[Invitation]:
        if email is None or email.isspace():
            log.error("get_invitations_for_email(): email must not be empty")
            return []
            
        try:
            query = self.__invitations_collection().where(
                filter=FieldFilter("invitee_email", "==", email)
            ).where(
                filter=FieldFilter("status", "==", "pending")
            )
            
            results = []
            for invitation in query.stream():
                results.append(self.__invitation_from_dict(invitation))
            return results
        except Exception as err:
            log.error("Unable to fetch invitations for email: %s", err)
            return []
    
    def accept_invitation(self, invitation_id: str, user_id: str) -> bool:
        if invitation_id is None or invitation_id.isspace():
            log.error("accept_invitation(): invitation_id must not be empty")
            return False
        if user_id is None or user_id.isspace():
            log.error("accept_invitation(): user_id must not be empty")
            return False
            
        # Get the invitation
        invitation = self.get_invitation(invitation_id)
        if invitation is None:
            log.error("accept_invitation(): Invitation not found")
            return False
            
        # Check if the invitation is still pending
        if invitation.status != "pending":
            log.error("accept_invitation(): Invitation is not pending")
            return False
            
        # Update the invitation status to accepted
        try:
            self.__invitations_collection().document(invitation_id).update({
                "status": "accepted"
            })
            
            # Add the user to the household
            if not self.add_participant(invitation.household_id, invitation.inviter_uid, user_id):
                log.error("accept_invitation(): Failed to add user to household")
                return False
                
            return True
        except Exception as err:
            log.error("[%s] Unable to accept invitation: %s", invitation_id, err)
            return False
    
    def reject_invitation(self, invitation_id: str) -> bool:
        if invitation_id is None or invitation_id.isspace():
            log.error("reject_invitation(): invitation_id must not be empty")
            return False
            
        # Get the invitation
        invitation = self.get_invitation(invitation_id)
        if invitation is None:
            log.error("reject_invitation(): Invitation not found")
            return False
            
        # Check if the invitation is still pending
        if invitation.status != "pending":
            log.error("reject_invitation(): Invitation is not pending")
            return False
            
        # Update the invitation status to rejected
        try:
            self.__invitations_collection().document(invitation_id).update({
                "status": "rejected"
            })
            return True
        except Exception as err:
            log.error("[%s] Unable to reject invitation: %s", invitation_id, err)
            return False

    def __collection(self):
        return self.__db.collection("households")
        
    def __invitations_collection(self):
        return self.__db.collection("household_invitations")

    def __household_from_dict(self, doc: DocumentSnapshot) -> Household:
        dict = doc.to_dict()
        return Household(doc.id, dict["owner_uid"], dict["name"], dict["participants"], dict["categories"], dict["locations"])
        
    def __invitation_from_dict(self, doc: DocumentSnapshot) -> Invitation:
        dict = doc.to_dict()
        return Invitation(
            doc.id,
            dict["household_id"],
            dict["household_name"],
            dict["inviter_uid"],
            dict["invitee_email"],
            dict["status"],
            dict["created_at"]
        )
