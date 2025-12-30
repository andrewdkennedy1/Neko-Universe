import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, duration = 2000 }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    return (
        <div
            className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300 ease-out pointer-events-none ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
        >
            <div className="bg-neutral-900/90 backdrop-blur-md border border-purple-500/30 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 min-w-[200px] justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-sm tracking-wide">{message}</span>
            </div>
        </div>
    );
};

export default Toast;
