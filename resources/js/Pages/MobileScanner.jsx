import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function MobileScanner({ onScan, onClose }) {
    const scannerRef = useRef(null);

    useEffect(() => {
        // 1. Initialize the Scanner
        const scanner = new Html5QrcodeScanner(
            "reader", 
            { 
                fps: 10, // Frames per second
                qrbox: { width: 250, height: 250 }, // Scanning zone size
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        // 2. Define what happens on success
        const onScanSuccess = (decodedText, decodedResult) => {
            // Play a beep sound
            const audio = new Audio('/beep.mp3'); 
            audio.play().catch(e => {});

            // Send the code back to the parent component
            onScan(decodedText);
            
            // Optional: Close scanner immediately after one scan?
            // scanner.clear(); 
            // onClose();
        };

        const onScanFailure = (error) => {
            // handle scan failure, usually better to ignore and keep scanning.
            // console.warn(`Code scan error = ${error}`);
        };

        // 3. Render the scanner
        scanner.render(onScanSuccess, onScanFailure);

        // Cleanup when component closes
        return () => {
            scanner.clear().catch(error => console.error("Failed to clear html5-qrcode", error));
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl relative">
                
                {/* Header */}
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Scan Barcode</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl font-bold">&times;</button>
                </div>

                {/* Camera Viewport (Library renders here) */}
                <div id="reader" className="w-full h-auto min-h-[300px] bg-gray-100"></div>

                {/* Instructions */}
                <div className="p-4 text-center text-sm text-gray-500">
                    Point camera at a barcode to add to cart.
                </div>
            </div>
        </div>
    );
}