from absl import logging as log
import requests


class Barcode:
    def __init__(self, code: str, names: list[tuple[str, str]]) -> None:
        self.code = code
        self.names = names

    def __iter__(self):
        # Omitting "code" since it is used as the ID.
        yield "names", self.names


class BarcodeManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def get_product_name(self, barcode: str, household_id: str) -> str | None:
        """
        Get a barcode from the household's collection or from the global cache.
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
                    barcode = Barcode(barcode, [(product_name, "ext:openfoodfacts")])
                    self.add_barcode(barcode)
                    return
                else:
                    log.warning(
                        "get_product_name(): failed to fetch product name for [%s]",
                        barcode,
                    )
                    return None

            names = data.get("names", [])
            has_openfoodfacts = False
            for name, source in names:
                if source == "ext:openfoodfacts":
                    has_openfoodfacts = True
                if source == household_id:
                    return name

            # If we got here, we didn't have a local houehold name for the product.
            # If we also don't have a product name from Open Food Facts, then try to add it.
            if not has_openfoodfacts:
                product_name = self.fetch_open_food_facts_name(barcode)
                if product_name:
                    names.append((product_name, "ext:openfoodfacts"))
                    self.__db.collection("barcodes").document(barcode).set(
                        {"names": names}
                    )
                    return product_name

            return None

        except Exception as err:
            log.error("[%s] Unable to fetch barcode data: %s", barcode, err)
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
