import JsBarcode from 'jsbarcode';

export const printLabels = (product) => {
    // Create a hidden canvas to generate the base64 barcode
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, product.sku, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 30,
        margin: 0
    });
    const barcodeData = canvas.toDataURL("image/png");

    const html = `
        <html>
            <head>
                <title>Labels - ${product.name}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .label-grid { 
                        display: grid; 
                        grid-template-columns: repeat(3, 1fr); /* 3 Labels per row */
                        gap: 15px; 
                    }
                    .label { 
                        border: 1px dashed #ccc; 
                        padding: 10px; 
                        text-align: center; 
                        border-radius: 8px;
                        page-break-inside: avoid;
                    }
                    .name { font-weight: bold; font-size: 12px; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .price { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                    img { max-width: 100%; height: auto; }
                    
                    @media print {
                        body { padding: 0; }
                        .label { border: 1px solid #eee; } /* Lighter border for print */
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 20px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print Labels</button>
                    <p>Printing 12 copies of: <strong>${product.name}</strong></p>
                </div>

                <div class="label-grid">
                    ${Array(12).fill('').map(() => `
                        <div class="label">
                            <div class="name">${product.name}</div>
                            <div class="price">$${(product.price / 100).toFixed(2)}</div>
                            <img src="${barcodeData}" />
                        </div>
                    `).join('')}
                </div>
            </body>
        </html>
    `;

    const popup = window.open('', '_blank', 'width=800,height=600');
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
};