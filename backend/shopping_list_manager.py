from datetime import datetime
import uuid
from typing import Any, Dict

from absl import logging as log
from google.cloud.firestore_v1 import Query, DocumentSnapshot
from google.cloud.firestore_v1.base_query import FieldFilter


class ShoppingListItem:
    def __init__(
        self,
        id: str,
        product_name: str,
        household_id: str,
        added_by: str,
        added_timestamp: int,
        completed: bool = False,
        completed_timestamp: int = 0,
        note: str = "",
        quantity: int = 1,
    ) -> None:
        self.id = id
        self.product_name = product_name
        self.household_id = household_id
        self.added_by = added_by
        self.added_timestamp = added_timestamp
        self.completed = completed
        self.completed_timestamp = completed_timestamp
        self.note = note
        self.quantity = quantity

    def __iter__(self):
        # Note: we don't want to persist the ID.
        yield "product_name", self.product_name
        yield "household_id", self.household_id
        yield "added_by", self.added_by
        yield "added_timestamp", self.added_timestamp
        yield "completed", self.completed
        yield "completed_timestamp", self.completed_timestamp
        yield "note", self.note
        yield "quantity", self.quantity

    def added_date_str(self, format="%b %d %Y") -> str:
        return datetime.utcfromtimestamp(self.added_timestamp / 1000).strftime(format)

    def completed_date_str(self, format="%b %d %Y") -> str | None:
        if self.completed_timestamp == 0:
            return None
        return datetime.utcfromtimestamp(self.completed_timestamp / 1000).strftime(format)


class ShoppingListManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def get_shopping_list_item(self, id: str) -> ShoppingListItem | None:
        if id is None or id.isspace():
            log.error("get_shopping_list_item(): id must not be empty")
            return None
        try:
            data = self.__collection().document(id).get()
            if data is None:
                log.error("[%s] Cannot find shopping list item", id)
                return None
            return self.__item_from_dict(data)
        except Exception as err:
            log.error("[%s] Unable to fetch shopping list item data, %s", id, err)
            return None

    def get_household_shopping_list(self, household_id: str) -> list[ShoppingListItem]:
        if household_id is None or household_id.isspace():
            log.error("get_household_shopping_list(): household_id must not be empty")
            return []
        try:
            results = []
            query: Query = self.__collection().where(
                filter=FieldFilter("household_id", "==", household_id)
            ).where(
                filter=FieldFilter("completed", "==", False)
            )
            for item in query.stream():
                results.append(self.__item_from_dict(item))
            return results
        except Exception as err:
            log.error(
                "[%s] Unable to fetch shopping list for household, %s", household_id, err
            )
            return []

    def add_shopping_list_item(self, item: ShoppingListItem) -> bool:
        if item is None:
            log.error("add_shopping_list_item(): item is missing")
            return False
        item_id = str(uuid.uuid4()) if not item.id else item.id
        try:
            self.__collection().document(item_id).set(dict(item))
        except Exception as err:
            log.error("[%s] Unable to store new shopping list item: %s", item.product_name, err)
            return False
        return True

    def update_shopping_list_item(self, item: ShoppingListItem) -> bool:
        if item is None or not item.id:
            log.error("update_shopping_list_item(): item and item.id must not be empty")
            return False
        try:
            self.__collection().document(item.id).set(dict(item))
        except Exception as err:
            log.error("[%s] Unable to update shopping list item: %s", item.product_name, err)
            return False
        return True

    def delete_shopping_list_item(self, id: str) -> bool:
        if id is None or id.isspace():
            log.error("delete_shopping_list_item(): id must not be empty")
            return False
        try:
            self.__collection().document(id).delete()
        except Exception as err:
            log.error("Unable to delete shopping list item: %s", err)
            return False
        return True

    def mark_item_completed(self, id: str) -> bool:
        item = self.get_shopping_list_item(id)
        if item is None:
            return False

        item.completed = True
        item.completed_timestamp = int(datetime.now().timestamp() * 1000)
        return self.update_shopping_list_item(item)

    def __collection(self):
        return self.__db.collection("shopping_list")

    def __item_from_dict(self, doc: DocumentSnapshot) -> ShoppingListItem:
        dict_data: Dict[str, Any] | None = doc.to_dict()
        if dict_data is None:
            raise ValueError(f"Document {doc.id} has no data")

        completed_timestamp = dict_data.get("completed_timestamp", 0)
        note = dict_data.get("note", "")
        quantity = dict_data.get("quantity", 1)

        return ShoppingListItem(
            doc.id,
            dict_data["product_name"],
            dict_data["household_id"],
            dict_data["added_by"],
            dict_data["added_timestamp"],
            dict_data.get("completed", False),
            completed_timestamp,
            note,
            quantity,
        )
