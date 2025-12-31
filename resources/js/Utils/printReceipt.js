export const printReceipt = (data) => {
    // Format currency helper
    const currency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount / 100); 
    };

    const itemsHtml = data.items.map(item => `
        <div class="item">
            <div>${item.quantity} x ${item.name}</div>
            <div class="price">${currency(item.price * item.quantity)}</div>
        </div>
    `).join('');

    // --- DISCOUNT LOGIC ---
    let discountHtml = '';
    if (data.is_senior) {
        discountHtml = `
            <div class="row dashed-top">
                <span>Subtotal (VAT Inc):</span>
                <span>${currency(data.subtotal)}</span>
            </div>
            <div class="row">
                <span>VAT Exempt Sales:</span>
                <span>${currency(data.subtotal / 1.12)}</span>
            </div>
            <div class="row">
                <span>Less: 20% Senior/PWD:</span>
                <span>-${currency(data.discount)}</span>
            </div>
        `;
    }

    const html = `
        <html>
            <head>
                <title>Receipt ${data.invoice_number}</title>
                <style>
                    /* Reset & Basics */
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                        font-family: 'Courier New', monospace; 
                        font-size: 12px; 
                        background-color: #f3f4f6; /* Light gray background for the window */
                        display: flex;
                        justify-content: center;
                        padding-top: 20px;
                    }
                    
                    /* The Actual Receipt Paper */
                    .receipt-container {
                        width: 300px; /* Standard Thermal Width */
                        background-color: #fff;
                        padding: 15px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }

                    /* Content Styling */
                    .header { text-align: center; margin-bottom: 20px; }
                    .store-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
                    .meta { font-size: 10px; color: #555; margin-bottom: 15px; text-align: center; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .price { font-weight: bold; }
                    .totals { margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .total-row { font-size: 16px; font-weight: bold; margin-top: 10px; border-top: 2px solid #000; padding-top: 5px; }
                    .payment-info { margin-top: 10px; font-size: 11px; }
                    .dashed-top { border-top: 1px dashed #aaa; padding-top: 5px; margin-top: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dotted #ccc; padding-top: 10px; }
                    
                    /* Print Settings */
                    @media print {
                        body { background-color: #fff; padding: 0; display: block; }
                        .receipt-container { width: 100%; box-shadow: none; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="header">
                        <div class="store-name">${data.store_name}</div>
                        <div>${data.store_address}</div>
                        <div>${data.store_phone}</div>
                    </div>
                    
                    <div class="meta">
                        <div>${new Date().toLocaleString()}</div>
                        <div>Invoice: ${data.invoice_number}</div>
                        <div>Cashier: ${data.cashier_id}</div>
                    </div>

                    <div class="items">
                        ${itemsHtml}
                    </div>

                    <div class="totals">
                        ${!data.is_senior ? '' : discountHtml}

                        <div class="row total-row">
                            <span>TOTAL</span>
                            <span>${currency(data.total)}</span>
                        </div>

                        ${data.payment_method === 'cash' ? `
                            <div class="payment-info dashed-top">
                                <div class="row">
                                    <span>Cash Given:</span>
                                    <span>${currency(data.cash_given)}</span>
                                </div>
                                <div class="row">
                                    <span>Change:</span>
                                    <span>${currency(data.change)}</span>
                                </div>
                            </div>
                        ` : `
                            <div class="payment-info dashed-top">
                                <div class="row">
                                    <span>Payment:</span>
                                    <span style="text-transform:uppercase">${data.payment_method}</span>
                                </div>
                            </div>
                        `}
                    </div>

                    <div class="footer">
                        Thank you for your purchase!<br>
                        Please come again.
                    </div>
                </div>

                <script>
                    window.print();
                    // Close window after print dialog is closed (works in Chrome)
                    window.onafterprint = function(){
                        window.close();
                    }
                </script>
            </body>
        </html>
    `;

    // --- CALCULATE CENTER POSITION ---
    const width = 400;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);

    const popup = window.open('', '_blank', `width=${width},height=${height},top=${top},left=${left}`);
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
};