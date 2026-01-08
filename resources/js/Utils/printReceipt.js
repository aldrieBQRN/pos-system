export const printReceipt = (data) => {
    // 1. Helper to format currency (PHP)
    const fmt = (num) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(num / 100);
    };

    // 2. Build Items HTML
    const itemsHtml = data.items.map(item => `
        <div class="flex">
            <span>${item.quantity} x ${item.name}</span>
            <span class="bold">${fmt(item.price * item.quantity)}</span>
        </div>
    `).join('');

    // 3. Build Discount HTML (if applicable)
    let discountHtml = '';
    if (data.is_senior) {
        discountHtml = `
            <div class="line"></div>
            <div class="flex">
                <span>Subtotal (VAT Inc):</span>
                <span>${fmt(data.subtotal)}</span>
            </div>
            <div class="flex">
                <span>VAT Exempt Sales:</span>
                <span>${fmt(data.subtotal / 1.12)}</span>
            </div>
            <div class="flex">
                <span>Less: 20% Senior/PWD:</span>
                <span>-${fmt(data.discount)}</span>
            </div>
        `;
    }

    // 4. Construct Full HTML
    const html = `
        <html>
        <head>
            <title>Receipt ${data.invoice_number}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                /* Normalize for Thermal Printers */
                @media print {
                    @page { margin: 0; size: auto; } /* Remove headers/footers */
                    body { margin: 0; padding: 0; }
                }

                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    width: 300px; /* Target 58mm paper width */
                    margin: 0 auto;
                    padding: 5px;
                    color: #000;
                    background: #fff;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .line { border-top: 1px dashed #000; margin: 8px 0; }
                .flex { display: flex; justify-content: space-between; margin-bottom: 4px; }

                .title { font-size: 16px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
                .subtitle { font-size: 11px; color: #333; }

                .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="title">${data.store_name || 'POS System'}</div>
                <div class="subtitle">${data.store_address || ''}</div>
                ${data.store_phone ? `<div class="subtitle">Tel: ${data.store_phone}</div>` : ''}
                <div class="line"></div>
            </div>

            <div class="flex"><span>Invoice:</span> <span class="bold">${data.invoice_number}</span></div>
            <div class="flex"><span>Date:</span> <span>${new Date().toLocaleString()}</span></div>
            <div class="flex"><span>Cashier:</span> <span>${data.cashier_id}</span></div>
            <div class="line"></div>

            <div class="items">
                ${itemsHtml}
            </div>

            ${discountHtml}

            <div class="line"></div>

            <div class="flex bold" style="font-size: 14px;">
                <span>TOTAL</span>
                <span>${fmt(data.total)}</span>
            </div>

            ${data.payment_method === 'cash' ? `
                <div class="flex" style="margin-top: 5px;">
                    <span>Cash Given:</span>
                    <span>${fmt(data.cash_given)}</span>
                </div>
                <div class="flex">
                    <span>Change:</span>
                    <span>${fmt(data.change)}</span>
                </div>
            ` : `
                <div class="flex" style="margin-top: 5px;">
                    <span>Payment:</span>
                    <span style="text-transform:uppercase">${data.payment_method}</span>
                </div>
                ${data.reference ? `<div class="flex"><span>Ref:</span><span>${data.reference}</span></div>` : ''}
            `}

            <div class="line"></div>

            <div class="footer">
                Thank you for your purchase!<br>
                Please come again.
            </div>

            <br/><br/>
        </body>
        </html>
    `;

    // 5. Mobile-Friendly Printing (Using Iframe)
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

        // Remove iframe after printing is initiated
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 5000);
    }, 500);
};