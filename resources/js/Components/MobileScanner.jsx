import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function MobileScanner({ onScan, onClose }) {
    const lastScanTime = useRef(0);
    const html5QrCodeRef = useRef(null);

    // Data State
    const [cameras, setCameras] = useState([]);
    const [activeCameraId, setActiveCameraId] = useState(null);

    // UI State
    const [scanMessage, setScanMessage] = useState('');
    const [isCooldown, setIsCooldown] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isMirrored, setIsMirrored] = useState(false);

    useEffect(() => {
        // 1. Initialize Scanner
        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        // 2. Fetch Cameras & Auto-Select
        const initCamera = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();

                if (devices && devices.length > 0) {
                    setCameras(devices);

                    // Default Logic: Try to pick the last camera (usually "Back" on phones)
                    const backCamera = devices[devices.length - 1];
                    setActiveCameraId(backCamera.id);

                    // Mirror if it looks like a front camera (or only 1 cam exists)
                    setIsMirrored(devices.length === 1);
                } else {
                    setErrorMessage("No cameras found.");
                }
            } catch (err) {
                console.error("Camera Init Error:", err);
                setErrorMessage("Camera permission blocked.");
            }
        };

        initCamera();

        // Cleanup on unmount
        return () => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().then(() => html5QrCodeRef.current.clear());
            }
        };
    }, []);

    // 3. Start/Restart Camera when activeCameraId changes
    useEffect(() => {
        if (!activeCameraId || !html5QrCodeRef.current) return;

        const startScanning = async () => {
            try {
                // Stop previous stream if it's running
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }

                const config = {
                    fps: 15,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.0,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.QR_CODE
                    ]
                };

                await html5QrCodeRef.current.start(
                    activeCameraId,
                    config,
                    (decodedText) => {
                        const currentTime = Date.now();
                        // 1.5s Cooldown to prevent double-scanning
                        if (currentTime - lastScanTime.current < 1500) return;

                        lastScanTime.current = currentTime;
                        setScanMessage(`Scanned: ${decodedText}`);
                        setIsCooldown(true);
                        new Audio('/beep.mp3').play().catch(()=>{});

                        onScan(decodedText);

                        setTimeout(() => {
                            setScanMessage('');
                            setIsCooldown(false);
                        }, 1500);
                    },
                    (err) => {} // Ignore frame read errors
                );
            } catch (err) {
                console.error("Start Error:", err);
                setErrorMessage("Failed to start camera stream.");
            }
        };

        startScanning();

    }, [activeCameraId]);

    // 4. Switch Camera Function
    const handleSwitchCamera = () => {
        if (cameras.length < 2) return;

        // Find current camera index and switch to the next one
        const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextCam = cameras[nextIndex];

        setActiveCameraId(nextCam.id);

        // Smart Mirroring: If it's the last camera in the list, assume it's "Back" (No Mirror)
        // Otherwise, assume it's "Front" (Mirror)
        const isBackCamera = nextIndex === cameras.length - 1;
        setIsMirrored(!isBackCamera);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">

                {/* Header */}
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-gray-800">Scan Product</h3>

                    <div className="flex gap-2">
                        {/* --- SWITCH CAMERA BUTTON --- */}
                        {/* Only visible if there is more than 1 camera */}
                        {cameras.length > 1 && (
                            <button
                                onClick={handleSwitchCamera}
                                className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full text-blue-600 hover:bg-blue-200 transition-colors"
                                title="Switch Camera"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                            </button>
                        )}

                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-500 font-bold transition-colors">
                            &times;
                        </button>
                    </div>
                </div>

                {/* Camera Viewport */}
                <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden">

                    {/* The Scanner Div (Mirrored if Front Cam) */}
                    <div
                        id="reader"
                        className="w-full h-full"
                        style={{
                            transform: isMirrored ? 'scaleX(-1)' : 'none'
                        }}
                    ></div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-900 text-white text-center z-20">
                            <div>
                                <p className="font-bold mb-1">Camera Error</p>
                                <p className="text-sm text-gray-300">{errorMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* Success Overlay (Not Mirrored) */}
                    {isCooldown && (
                        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center backdrop-blur-sm z-10 border-4 border-green-500 animate-pulse">
                            <div className="bg-white text-green-700 px-6 py-3 rounded-full font-extrabold shadow-2xl flex items-center gap-2 transform scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                ADDED!
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Footer */}
                <div className={`p-4 text-center text-sm font-medium transition-colors duration-300 shrink-0
                    ${isCooldown ? 'bg-green-100 text-green-800' : 'bg-white text-gray-500'}`}>
                    {scanMessage || (isMirrored ? "Front Camera (Mirrored)" : "Back Camera")}
                </div>
            </div>
        </div>
    );
}