from datetime import datetime
import json
import uuid
from typing import Any, Dict

from absl import logging as log
from google.cloud.firestore_v1 import Query, DocumentSnapshot
from google.cloud.firestore_v1.base_query import FieldFilter


class Product:
    def __init__(
        self,
        id: str,
        barcode: str,
        category: str,
        created: int,
        expires: int,
        location: str,
        product_name: str,
        household_id: str,
        wasted: bool,
        wasted_timestamp: int,
        note: str,
        image_url: str | None = None,
    ) -> None:
        self.id = id
        self.barcode = barcode
        self.category = category
        self.created = created
        self.expires = expires
        self.location = location
        self.product_name = product_name
        self.household_id = household_id
        self.wasted = wasted
        self.wasted_timestamp = wasted_timestamp
        self.note = note
        self.image_url = image_url

    @property
    def does_expire(self) -> bool:
        return self.expires != 0

    def __iter__(self):
        # Note: we don't want to persist the ID.
        yield "barcode", self.barcode
        yield "category", self.category
        yield "created", self.created
        yield "expires", self.expires
        yield "location", self.location
        yield "product_name", self.product_name
        yield "household_id", self.household_id
        yield "wasted", self.wasted
        yield "wasted_timestamp", self.wasted_timestamp
        yield "note", self.note
        yield "image_url", self.image_url

    def creation_str(self, format="%b %d %Y") -> str:
        return datetime.utcfromtimestamp(self.created / 1000).strftime(format)

    def expiration_str(self, format="%b %d %Y") -> str | None:
        if not self.does_expire:
            return None
        return datetime.utcfromtimestamp(self.expires / 1000).strftime(format)

    def wasted_date_str(self, format="%b %d %Y") -> str | None:
        if self.wasted_timestamp == 0:
            return None
        return datetime.utcfromtimestamp(self.wasted_timestamp / 1000).strftime(format)


class ProductManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def get_product(self, id: str) -> Product | None:
        if id is None or id.isspace():
            log.error("get_product(): id must not be empty")
            return None
        try:
            data = self.__collection().document(id).get()
            if data is None:
                log.error("[%s] Cannot find product", id)
                return None
            return self.__product_from_dict(data)
        except Exception as err:
            log.error("[%s] Unable to fetch product data, %s", id, err)
            return None

    def get_household_products(self, household_id: str) -> list[Product]:
        if household_id is None or household_id.isspace():
            log.error("get_household_products(): uid must not be empty")
            return []
        try:
            results = []
            query: Query = self.__collection().where(
                filter=FieldFilter("household_id", "==", household_id)
            )
            for product in query.stream():
                results.append(self.__product_from_dict(product))
            return results
        except Exception as err:
            log.error(
                "[%s] Unable to fetch products for household, %s", household_id, err
            )
            return []

    def add_product(self, product: Product) -> bool:
        if product is None:
            log.error("add_product(): product is missing")
            return False
        pid = str(uuid.uuid4()) if not product.id else product.id
        try:
            self.__collection().document(pid).set(dict(product))
        except Exception as err:
            log.error("[%s] Unable to store new product: %s", product.product_name, err)
            return False
        return True

    def delete_product(self, id: str) -> bool:
        if id is None or id.isspace():
            log.error("delete_product(): id must not be empty")
            return False
        try:
            self.__collection().document(id).delete()
        except Exception as err:
            log.error("Unable to delete product: %s", err)
            return False
        return True

    def __collection(self):
        return self.__db.collection("products")

    def __product_from_dict(self, doc: DocumentSnapshot) -> Product:
        dict_data: Dict[str, Any] | None = doc.to_dict()
        if dict_data is None:
            raise ValueError(f"Document {doc.id} has no data")

        wasted_timestamp = dict_data.get("wasted_timestamp", 0)
        household_id = dict_data.get("household_id", "")
        image_url = dict_data.get("image_url")

        return Product(
            doc.id,
            dict_data["barcode"],
            dict_data["category"],
            dict_data["created"],
            dict_data["expires"],
            dict_data["location"],
            dict_data["product_name"],
            household_id,
            dict_data["wasted"],
            wasted_timestamp,
            dict_data["note"],
            image_url,
        )

    @classmethod
    def parse_import_date(cls, date_str: str) -> int:
        date_obj = None
        try:
            date_obj = datetime.strptime(date_str, "%d %b %Y")
        except ValueError:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")

        epoch_obj = datetime.utcfromtimestamp(0)
        return int((date_obj - epoch_obj).total_seconds() * 1000)
