import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// Added defaults for width, height, and fontSize
export default function Barcode({ value, width = 1.5, height = 40, fontSize = 14 }) {
    const barcodeRef = useRef(null);

    useEffect(() => {
        if (barcodeRef.current && value) {
            try {
                JsBarcode(barcodeRef.current, value, {
                    format: "CODE128",
                    width: width,         // Dynamic Width
                    height: height,       // Dynamic Height
                    displayValue: true,
                    fontSize: fontSize,   // Dynamic Font
                    margin: 0,
                    background: "transparent"
                });
            } catch (error) {
                console.error("Invalid barcode value:", value);
            }
        }
    }, [value, width, height, fontSize]);

    return <svg ref={barcodeRef}></svg>;
}