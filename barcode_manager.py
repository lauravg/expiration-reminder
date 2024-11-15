from absl import logging as log

class Barcode:
    def __init__(self, code: str, name: str) -> None:
        self.code = code
        self.name = name

    def __iter__(self):
        # Omitting "code" since it is used as the ID.
        yield "name", self.name

class BarcodeManager:
    def __init__(self, firestore) -> None:
        self.__db = firestore

    def get_barcode(self, code: str) -> Barcode | None:
        if not code or code.isspace():
            log.error("get_barcode(): code must not be empty")
            return None
        try:
            data = self.__db.collection("barcodes").document(code).get().to_dict()
            if not data:
                log.error("[%s] Cannot find barcode", code)
                return None
            return Barcode(code, data.get("name", ""))
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
            log.info("Attempting to add barcode: %s with name: %s", barcode.code, barcode.name)

            # Attempt to store the barcode in Firestore
            self.__db.collection("barcodes").document(barcode.code).set({
                "name": barcode.name
            })

            # Log success
            log.info("Barcode [%s] added successfully with name: %s", barcode.code, barcode.name)
            return True
        except Exception as err:
            # Log the error
            log.error("Failed to add barcode [%s]: %s", barcode.code, err)
            return False