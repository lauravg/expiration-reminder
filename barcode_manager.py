from absl import logging as log

import json

class Barcode:
    def __init__(
        self,
        code: str,
        name: str,
    ) -> None:
        self.code = code
        self.name = name

    def __iter__(self):
        # Omitting "code" since it is used as the ID.
        yield "name", self.name

class BarcodeManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def get_barcode(self, code: str) -> Barcode | None:
        if code is None or code.isspace():
            log.error("get_barcode(): code must not be empty")
            return None
        try:
            data = self.__db.collection("barcodes").document(code).get().to_dict()
            if data is None:
                log.error("[%s] Cannot find barcode", code)
                return None
            return Barcode(code, data["name"])
        except Exception as err:
            log.error("[%s] Unable to fetch barcode data, %s", code, err)
            return None

    def add_barcode(self, barcode: Barcode) -> bool:
        if barcode is None:
            log.error("add_barcode(): barcode is None")
            return False
        if barcode.code.isspace():
            log.error("add_barcode(): code must not be empty")
            return False
        if barcode.name.isspace():
            log.error("add_barcode(): name must not be empty")
            return False
        try:
            self.__db.collection("barcodes").document(barcode.code).set(dict(barcode))
        except Exception as err:
            log.error("[%s] Unable to store new barcode: %s", barcode.code, err)
            return False
        return True

    def delete_barcode(self, code: str) -> bool:
        if code is None or code.isspace():
            log.error("delete_barcode(): code must not be empty")
            return False
        try:
            self.__db.collection("barcodes").document(code).delete()
        except Exception as err:
            log.error("Unable to delete barcode: %s", err)
            return False
        return True

    def import_from_rt(self, file: str):
        """Used to import data from legacy RTDB"""

        with open(file, "r") as fd:
            data = json.load(fd)
            from pprint import pprint
            # pprint(data)

            barcodes = data["barcodes"]
            for uuid in barcodes:
                code = barcodes[uuid]["barcode_value"]
                name = barcodes[uuid]["barcode_item_name"]

                self.add_barcode(code, name)
                log.info("[ADDED] %s ==> %s", code, name)