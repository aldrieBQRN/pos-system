export const printReceipt = (saleData) => {
    const printWindow = window.open('', 'PRINT', 'height=600,width=400');

    if (!printWindow) {
        alert("Please allow popups to print receipts.");
        return;
    }

    const formatMoney = (amount) => `$${(amount / 100).toFixed(2)}`;

    // Payment Info Section
    let paymentDetailsHtml = '';
    if (saleData.payment_method === 'cash') {
        paymentDetailsHtml = `
            <div class="totals-row">
                <span>Cash Given:</span>
                <span>${formatMoney(saleData.cash_given || 0)}</span>
            </div>
            <div class="totals-row">
                <span>Change:</span>
                <span>${formatMoney(saleData.change || 0)}</span>
            </div>
        `;
    } else if (saleData.payment_method === 'gcash') {
        paymentDetailsHtml = `
            <div class="totals-row">
                <span>Payment:</span>
                <span>GCash</span>
            </div>
            <div class="totals-row">
                <span>Ref #:</span>
                <span>${saleData.reference || 'N/A'}</span>
            </div>
        `;
    }

    const html = `
        <html>
        <head>
            <title>Receipt #${saleData.invoice_number}</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; text-align: center; color: #000; }
                .header { margin-bottom: 15px; }
                .store-name { font-size: 20px; font-weight: bold; text-transform: uppercase; }
                .meta { font-size: 12px; margin-bottom: 2px; }
                
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                
                .item { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
                
                .totals-section { margin-top: 15px; }
                .totals-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
                .grand-total { font-weight: bold; font-size: 18px; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
                
                .footer { margin-top: 30px; font-size: 12px; }
                
                @media print {
                    @page { margin: 0; }
                    body { margin: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="store-name">${saleData.store_name}</div>
                <div class="meta">${saleData.store_address}</div>
                <div class="meta">Tel: ${saleData.store_phone}</div>
            </div>

            <div class="meta">
                Date: ${new Date().toLocaleString('en-US')}<br>
                Invoice: ${saleData.invoice_number}<br>
                Cashier: ${saleData.cashier_id}
            </div>

            <div class="divider"></div>

            <div class="items">
                ${saleData.items.map(item => `
                    <div class="item">
                        <span>${item.quantity} x ${item.name}</span>
                        <span>${formatMoney(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            </div>

            <div class="divider"></div>

            <div class="totals-section">
                <div class="totals-row grand-total">
                    <span>TOTAL</span>
                    <span>${formatMoney(saleData.total)}</span>
                </div>
                
                <div style="margin-top: 10px; font-style: italic;">
                    ${paymentDetailsHtml}
                </div>
            </div>

            <div class="footer">
                Thank you for your purchase!<br>
                Please come again.
            </div>

            <script>
                window.onload = function() { 
                    window.print(); 
                    window.onafterprint = function() { window.close(); }
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};