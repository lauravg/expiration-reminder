const READER_EL_ID = 'reader';
let readerEl = document.getElementById(READER_EL_ID)

if (readerEl != undefined) {
  const scanner = new Html5QrcodeScanner(READER_EL_ID, {
      qrbox: {
          width: 250,
          height: 250,
      },
      fps: 20,
  });

  function success(result) {
      // Populate the barcode input field with the scanned barcode
      document.getElementById('input-barcode-number').value = result;

      // Send a request to check if the scanned barcode exists in the Barcode database
      fetch('/check_barcode', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ barcode: result }),
      })
          .then(response => {
              if (!response.ok) {
                  throw new Error('Network response was not ok');
              }
              return response.json();
          })
          .then(data => {
              if (data.exists) {
                  // If the barcode exists in the database, set the product name input field
                  document.getElementById('input-product-name').value = data.productName;
              }
          })
          .catch(error => {
              console.error('Error:', error);
          });
  }

  function closeBarcode() {
      barcodeScanner.classList.remove('open');
      barcodeScanner.classList.add('closed');
      scanner.clear().then((ignore) => {
          console.log('Scanning stopped successfully');
      }).catch((err) => {
          console.log('Failing to stop scanning.');
      });
  }

  scanBarcode = document.getElementById('scan-barcode');
  scanBarcode.addEventListener('click', function () {
      barcodeScanner = document.getElementById('barcode-scanner');
      if (barcodeScanner.classList == 'closed') {
          barcodeScanner.classList.add('open');
          barcodeScanner.classList.remove('closed');
          scanner.render(success, error);
      } else {
          closeBarcode();
      }
  });
}

function error(err) {
    console.error(err);
}