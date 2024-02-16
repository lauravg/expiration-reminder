from datetime import datetime
import json
import uuid

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
        wasted_timestamp: int
    ) -> None:
        self.id = id
        self.barcode = barcode
        self.category = category
        self.created = created
        self.expires = expires
        self.location =location
        self.product_name = product_name
        self.household_id = household_id
        self.wasted = wasted
        self.wasted_timestamp = wasted_timestamp
    def __iter__(self):
        yield "barcode", self.barcode
        yield "category", self.category
        yield "created", self.created
        yield "expires", self.expires
        yield "location", self.location
        yield "product_name", self.product_name
        yield "household_id", self.household_id
        yield "wasted", self.wasted
        yield "wasted_timestamp", self.wasted_timestamp
    def creation_str(self, format="%b %d %Y") -> str:
        return datetime.utcfromtimestamp(self.created / 1000).strftime(format)
    def expiration_str(self, format="%b %d %Y") -> str | None:
        if self.expires == 0:
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
            return None
        try:
            results = []
            query: Query = self.__collection().where(filter=FieldFilter("household_id", "==", household_id))
            for product in query.stream():
                results.append(self.__product_from_dict(product))
            return results
        except Exception as err:
            log.error("[%s] Unable to fetch products for household, %s", household_id, err)
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
        dict = doc.to_dict()
        wasted_timestamp = dict["wasted_timestamp"] if "wasted_timestamp" in dict else 0
        household_id = dict["household_id"] if "household_id" in dict else ""
        return Product(doc.id, dict["barcode"], dict["category"], dict["created"], dict["expires"], dict["location"], dict["product_name"], household_id, dict["wasted"], wasted_timestamp)

    @classmethod
    def parse_import_date(cls, date_str: str) -> int:
        try:
            date_obj = datetime.strptime(date_str, "%d %b %Y")
            epoch_obj = datetime.utcfromtimestamp(0)
            return int((date_obj - epoch_obj).total_seconds() * 1000)
        except ValueError:
            raise ValueError(f"Invalid date format: {date_str}")
