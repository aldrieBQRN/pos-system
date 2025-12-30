import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function MobileScanner({ onScan, onClose }) {
    // 1. Logic State (Does not trigger re-render)
    const lastScanTime = useRef(0);
    
    // 2. Visual State (Triggers re-render for UI feedback)
    const [scanMessage, setScanMessage] = useState(''); 
    const [isCooldown, setIsCooldown] = useState(false);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader", 
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            false
        );

        const onScanSuccess = (decodedText, decodedResult) => {
            const currentTime = Date.now();

            // 3. CHECK: Has it been 3 seconds (3000ms) since last scan?
            if (currentTime - lastScanTime.current < 3000) {
                return; // STOP HERE. Do not process.
            }

            // 4. Update the last scan time
            lastScanTime.current = currentTime;

            // 5. Visual Feedback (Show "Added!" and turn green)
            setScanMessage(`Scanned: ${decodedText}`);
            setIsCooldown(true);

            // Play Sound
            const audio = new Audio('/beep.mp3'); 
            audio.play().catch(e => {});

            // Send Data
            onScan(decodedText);

            // 6. Reset Visuals after 3 seconds
            setTimeout(() => {
                setScanMessage('');
                setIsCooldown(false);
            }, 3000);
        };

        const onScanFailure = (error) => {
            // Ignore frame errors
        };

        scanner.render(onScanSuccess, onScanFailure);

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

                {/* Camera Viewport */}
                <div className="relative">
                    <div id="reader" className="w-full h-auto min-h-[300px] bg-gray-100"></div>

                    {/* OVERLAY: Shows when Cooldown is Active */}
                    {isCooldown && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-sm border-4 border-green-500 z-10">
                            <div className="bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg animate-bounce">
                                ✅ Added! Wait 3s...
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className={`p-4 text-center text-sm font-medium transition-colors duration-300
                    ${isCooldown ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500'}`}>
                    {scanMessage || "Point camera at a barcode to add to cart."}
                </div>
            </div>
        </div>
    );
}