import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils'; // Assuming this utility exists based on other shadcn-like components

const toastVariants = cva(
    "fixed top-4 right-4 z-50 flex items-center w-full max-w-md p-6 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 transform",
    {
        variants: {
            type: {
                success: "bg-green-50/90 border-green-200 text-green-900",
                error: "bg-red-50/90 border-red-200 text-red-900",
                info: "bg-blue-50/90 border-blue-200 text-blue-900",
                warning: "bg-yellow-50/90 border-yellow-200 text-yellow-900",
            },
            animation: {
                enter: "translate-y-0 opacity-100",
                exit: "-translate-y-4 opacity-0",
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
            <div className="inline-flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full bg-white/20">
                <Icon className="w-6 h-6" />
            </div>
            <div className="ml-4 text-lg font-medium">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-black/5 focus:ring-2 focus:ring-gray-300"
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
