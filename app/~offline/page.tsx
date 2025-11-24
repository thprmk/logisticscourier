"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflinePage() {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = () => {
        setIsRetrying(true);
        window.location.reload();
    };

    useEffect(() => {
        const handleOnline = () => {
            window.location.reload();
        };

        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <WifiOff className="h-10 w-10 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">You are offline</h1>
                <p className="text-gray-500 mb-8">
                    It seems you've lost your internet connection. Please check your network and try again.
                </p>

                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`h-5 w-5 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Retrying..." : "Try Again"}
                </button>
            </div>
        </div>
    );
}
