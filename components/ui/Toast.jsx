import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils'; // Assuming this utility exists based on other shadcn-like components

const toastVariants = cva(
    "fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center w-auto max-w-md p-5 rounded-full shadow-2xl border backdrop-blur-md transition-all duration-300 transform",
    {
        variants: {
            type: {
                success: "bg-green-50/95 border-green-200 text-green-800",
                error: "bg-red-50/95 border-red-200 text-red-800",
                info: "bg-blue-50/95 border-blue-200 text-blue-800",
                warning: "bg-yellow-50/95 border-yellow-200 text-yellow-800",
            },
            animation: {
                enter: "translate-y-0 opacity-100",
                exit: "-translate-y-8 opacity-0",
            }
        },
        defaultVariants: {
            type: "info",
            animation: "enter",
        },
    }
);

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
};

export function Toast({ message, type = 'info', onClose, duration = 3000 }) {
    const [isVisible, setIsVisible] = useState(true);
    const Icon = icons[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={cn(toastVariants({ type, animation: isVisible ? 'enter' : 'exit' }))}>
            <div className={`inline-flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-full ${type === 'error' ? 'bg-red-100' : 'bg-white/50'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="ml-3 mr-4 text-base font-medium whitespace-nowrap">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-full p-1 inline-flex items-center justify-center h-8 w-8 hover:bg-black/5 transition-colors"
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
            >
                <span className="sr-only">Close</span>
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
