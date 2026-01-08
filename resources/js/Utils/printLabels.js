import JsBarcode from 'jsbarcode';

export const printLabels = (product) => {
    // 1. Generate Base64 Barcode ONCE (Efficient)
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, product.sku, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 40,
        margin: 0,
        fontOptions: "bold"
    });
    const barcodeData = canvas.toDataURL("image/png");

    // 2. Generate the Label HTML (Repeated 12 times for a full sheet)
    const labelCount = 12;
    const singleLabelHTML = `
        <div class="label">
            <div class="store-name">SMART RETAIL</div>
            <div class="product-name">${product.name}</div>
            <div class="price">₱${(product.price / 100).toFixed(2)}</div>
            <img src="${barcodeData}" alt="Barcode" />
        </div>
    `;

    // 3. Build the Full Page HTML
    const html = `
        <html>
            <head>
                <title>Print Labels - ${product.name}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: white;
                    }
                    .label-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr); /* 3 Columns for A4/Letter */
                        gap: 15px;
                    }
                    .label {
                        border: 2px dashed #ccc;
                        padding: 15px;
                        text-align: center;
                        background: white;
                        border-radius: 8px;
                        page-break-inside: avoid; /* Prevent cutting labels in half */
                    }
                    .store-name {
                        font-size: 10px;
                        font-weight: bold;
                        color: #666;
                        letter-spacing: 1px;
                        margin-bottom: 5px;
                    }
                    .product-name {
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 5px;
                        height: 36px;
                        overflow: hidden;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                    }
                    .price {
                        font-size: 18px;
                        font-weight: 900;
                        color: #000;
                        margin-bottom: 5px;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        max-height: 50px;
                    }

                    /* Print Settings */
                    @media print {
                        @page { margin: 0.5cm; }
                        body { margin: 0; padding: 0; }
                        .label { border: 1px solid #ddd; } /* Clean border for print */
                    }
                </style>
            </head>
            <body>
                <div class="label-grid">
                    ${Array(labelCount).fill(singleLabelHTML).join('')}
                </div>
            </body>
        </html>
    `;

    // 4. Mobile-Friendly Printing (Using Iframe)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Trigger Print
    iframe.contentWindow.focus();
    setTimeout(() => {
        iframe.contentWindow.print();

        // Cleanup iframe after printing
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 5000);
    }, 500);
};