export const printZRead = (shift, settings) => {
    // 1. Extract Settings
    const storeName = settings?.store_name || 'POS System';
    const storeAddress = settings?.store_address || '';
    const storePhone = settings?.store_phone ? `Tel: ${settings.store_phone}` : '';

    // 2. Extract Shift Data
    const cashierName = shift.user?.name || 'Unknown';
    const date = new Date().toLocaleString('en-US');

    // 3. Helper to format currency
    const fmt = (num) => `P${Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

    // 4. Calculate Status
    const diff = Number(shift.difference);
    let diffLabel = 'BALANCED';
    if (diff > 0.01) diffLabel = 'OVERAGE (+)';
    if (diff < -0.01) diffLabel = 'SHORTAGE (-)';

    // 5. Build HTML Content
    const receiptContent = `
        <html>
        <head>
            <title>Z-Read Report</title>
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
                .flex { display: flex; justify-content: space-between; }
                .title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
                .subtitle { font-size: 11px; color: #333; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="title">${storeName}</div>
                <div class="subtitle">${storeAddress}</div>
                <div class="subtitle">${storePhone}</div>
                <div class="line"></div>
                <div class="bold" style="font-size: 14px;">Z-READ REPORT</div>
                <div class="subtitle">Shift ID: #${shift.id}</div>
                <div class="line"></div>
            </div>

            <div class="flex"><span>Cashier:</span> <span class="bold">${cashierName}</span></div>
            <div class="flex"><span>Opened:</span> <span>${new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div class="flex"><span>Closed:</span> <span>${new Date(shift.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div class="flex"><span>Date:</span> <span>${new Date(shift.start_time).toLocaleDateString()}</span></div>

            <div class="line"></div>

            <div class="flex"><span>Starting Cash:</span> <span>${fmt(shift.starting_cash)}</span></div>
            <div class="flex"><span>+ Cash Sales:</span> <span>${fmt(shift.cash_sales)}</span></div>
            <div class="line"></div>

            <div class="flex bold" style="font-size: 13px;"><span>EXPECTED CASH:</span> <span>${fmt(shift.expected_cash)}</span></div>
            <div class="flex bold" style="font-size: 13px;"><span>ACTUAL COUNT:</span> <span>${fmt(shift.actual_cash)}</span></div>

            <div class="line"></div>

            <div class="flex bold" style="font-size: 14px;">
                <span>DIFFERENCE:</span>
                <span>${diff > 0 ? '+' : ''}${fmt(shift.difference)}</span>
            </div>
            <div class="text-center bold" style="margin-top: 5px; font-size: 14px;">[ ${diffLabel} ]</div>

            <div class="line"></div>

            <div class="text-center" style="margin-top: 15px;">
                <small>Printed: ${date}</small><br/><br/>
                <div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>
                <small>Manager Signature</small>
            </div>

            <br/><br/>
        </body>
        </html>
    `;

    // 6. Mobile-Friendly Printing (Using Iframe)
    // This avoids "Popup Blocked" errors and works better on Android/iOS
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
    doc.write(receiptContent);
    doc.close();

    // Trigger Print
    iframe.contentWindow.focus();
    setTimeout(() => {
        iframe.contentWindow.print();

        // Remove iframe after a delay (enough time for mobile print dialog to appear)
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 5000);
    }, 500);
};