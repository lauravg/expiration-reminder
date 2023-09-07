const scanner = new Html5QrcodeScanner('reader', {
    qrbox: {
        width: 250,
        height: 250,
    },
    fps: 20,
});

scanner.render(success, error);

function success(result) {
    // Populate the barcode input field with the scanned barcode
    document.getElementById('input-barcode-number').value = result;

    // Send a request to check if the scanned barcode exists in the Barcode db
    fetch('/check_barcode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode: result }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                // If the barcode exists in the database, set the product name input field
                document.getElementById('input-product-name').value = data.productName;
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });

    scanner.clear();
    document.getElementById('reader').remove();
}

scanBarcode = document.getElementById('scan-barcode');
console.log('scanBrcode: ', scanBarcode)
scanBarcode.addEventListener('click', function () {
    barcodeScanner = document.getElementById('barcode-scanner');
    console.log('barcodeScanner: ', barcodeScanner)
    if ((barcodeScanner.classList == 'closed')) {
        barcodeScanner.classList.add('open');
        barcodeScanner.classList.remove('closed')
    } else {
        barcodeScanner.classList.remove('open');
        barcodeScanner.classList.add('closed');
    }
});

function error(err) {
    console.errro(err);
}
