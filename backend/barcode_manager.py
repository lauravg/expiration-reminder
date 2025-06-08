from absl import logging as log
import requests
from typing import List, Tuple, Optional


class Barcode:
    def __init__(self, code: str, names: List[Tuple[str, str]]) -> None:
        self.code = code
        self.names = names

    def __iter__(self):
        # Omitting "code" since it is used as the ID.
        yield "names", self.names


class BarcodeManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def get_product_name(
        self, barcode: str, household_id: str
    ) -> Optional[Tuple[str, bool]]:
        """
        Get a barcode from the household's collection or from the global cache.
        Returns a tuple of (product_name, is_ext).
        """

        if not barcode or barcode.isspace():
            log.error("get_product_name(): barcode must not be empty")
            return None
        if not household_id or household_id.isspace():
            log.error("get_product_name(): household_id must not be empty")
            return None

        try:
            # If we have a barcode in the global cache, return it.
            data = self.__db.collection("barcodes").document(barcode).get().to_dict()

            # If we don't have any data or the data we got does not have data from
            # the Open Food Facts, fetch from Open Food Facts and store it.
            if not data:
                product_name = self.fetch_open_food_facts_name(barcode)

                # If product_name is None, then something went wrong and we don't
                # want to store is permanently. If the request was successful, but
                # the resulting name empty, then we couldn't find the product and
                # we store it as such to avoid future requests.
                # TODO: We could at some point retry in the future in case the product
                #       was added to the database.
                if product_name:
                    barcode = Barcode(
                        barcode, [{"name": product_name, "source": "ext:openfoodfacts"}]
                    )
                    self.add_barcode(barcode)
                    return product_name, True
                else:
                    log.warning(
                        "get_product_name(): failed to fetch product name for [%s]",
                        barcode,
                    )
                    return None

            names = data.get("names", [])
            open_food_facts_name = ""
            for name in names:
                if name["source"] == "ext:openfoodfacts":
                    open_food_facts_name = name["name"]
                if name["source"] == household_id:
                    # If the barcode was added for this household, immediately return it.
                    return name["name"], False

            # If we got here, we don't have a local household name for the product. So return
            # the name from Open Food Facts if we have it, otherwise return empty string.
            return open_food_facts_name, True

        except Exception as err:
            log.error("[%s] Unable to fetch barcode data: %s", barcode, err)
            return None

    def add_barcode(self, barcode: Barcode) -> bool:
        if not barcode or not barcode.code or barcode.code.isspace():
            log.error("add_barcode(): code must not be empty")
            return False
        if len(barcode.names) == 0:
            log.error("add_barcode(): must have at least one name")
            return False
        try:
            log.info(
                "Attempting to add barcode: %s with names: %s",
                barcode.code,
                barcode.names,
            )

            # First check if data about this barcode already exists.
            data = (
                self.__db.collection("barcodes").document(barcode.code).get().to_dict()
            )
            if data:
                # If data already exists, add the new data.
                data["names"].append(
                    {
                        "name": barcode.names[0]["name"],
                        "source": barcode.names[0]["source"],
                    }
                )
            else:
                # If data does not exist, create a new document.
                data = {
                    "names": [
                        {
                            "name": barcode.names[0]["name"],
                            "source": barcode.names[0]["source"],
                        }
                    ]
                }

            # Attempt to store the barcode in Firestore
            self.__db.collection("barcodes").document(barcode.code).set(data)

            # Log success
            log.info(
                "Barcode [%s] added successfully with names: %s",
                barcode.code,
                barcode.names,
            )
            return True
        except Exception as err:
            # Log the error
            log.error("Failed to add barcode [%s]: %s", barcode.code, err)
            return False

    def fetch_open_food_facts_name(self, code: str) -> str | None:
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
                return ""
            if response.status_code != 200:
                log.error("Failed to request barcode: %s", response.status_code)
                return None
            data = response.json()
            if not data:
                log.error("Failed to request barcode: %s", data)
                return None
            return data.get("product", {}).get("product_name", "")
        except Exception as err:
            log.error("Failed to request barcode: %s", err)
            return None
