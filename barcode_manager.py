from absl import logging as log
import requests


class Barcode:
    def __init__(self, code: str, name: str, household_id: str) -> None:
        self.code = code
        self.name = name
        # Either household id or e.g. "ext:openfoodfacts"
        self.household_id = household_id

    def __iter__(self):
        # Omitting "code" since it is used as the ID.
        yield "name", self.name
        yield "household_id", self.household_id


class BarcodeManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def get_barcode(self, code: str) -> Barcode | None:
        if not code or code.isspace():
            log.error("get_barcode(): code must not be empty")
            return None
        try:
            data = self.__db.collection("barcodes").document(code).get().to_dict()
            if data:
                return Barcode(code, data.get("name", ""), data.get("household_id", ""))
            else:
                log.info(
                    "Barcode [%s] not found in Firestore, fetching from Open Food Facts",
                    code,
                )
                return self.fetch_open_food_facts(code)
        except Exception as err:
            log.error("[%s] Unable to fetch barcode data: %s", code, err)
            return None

    def add_barcode(self, barcode: Barcode) -> bool:
        if not barcode or not barcode.code or barcode.code.isspace():
            log.error("add_barcode(): code must not be empty")
            return False
        if not barcode.name or barcode.name.isspace():
            log.error("add_barcode(): name must not be empty")
            return False
        try:
            # Log the attempt to add the barcode
            log.info(
                "Attempting to add barcode: %s with name: %s",
                barcode.code,
                barcode.name,
            )

            # Attempt to store the barcode in Firestore
            self.__db.collection("barcodes").document(barcode.code).set(
                {"name": barcode.name, "household_id": barcode.household_id}
            )

            # Log success
            log.info(
                "Barcode [%s] added successfully with name: %s",
                barcode.code,
                barcode.name,
            )
            return True
        except Exception as err:
            # Log the error
            log.error("Failed to add barcode [%s]: %s", barcode.code, err)
            return False

    def fetch_open_food_facts(self, code: str) -> Barcode | None:
        if not code or code.isspace():
            log.error("fetch_open_food_facts(): code must not be empty")
            return None
        try:
            # Log the attempt to request the barcode from Open Food Facts
            log.info("Attempting to request barcode: %s from Open Food Facts", code)
            # Make request to https://world.openfoodfacts.org/api/v2/product/{code}.json
            response = requests.get(
                f"https://world.openfoodfacts.org/api/v2/product/{code}.json"
            )
            if response.status_code == 404:
                log.info("Barcode not found in Open Food Facts: %s", code)
                return None
            if response.status_code != 200:
                log.error("Failed to request barcode: %s", response.status_code)
                return None
            data = response.json()
            if not data:
                log.error("Failed to request barcode: %s", data)
                return None

            return Barcode(
                code,
                data.get("product", {}).get("product_name", ""),
                "ext:openfoodfacts",
            )
        except Exception as err:
            log.error("Failed to request barcode: %s", err)
            return None
