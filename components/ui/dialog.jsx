import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const DialogContext = React.createContext({})

const Dialog = ({ children, open, onOpenChange }) => {
    return (
        <DialogContext.Provider value={{ open, onOpenChange }}>
            {children}
        </DialogContext.Provider>
    )
}

const DialogTrigger = ({ className, children, asChild, ...props }) => {
    const { onOpenChange } = React.useContext(DialogContext)

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            onClick: (e) => {
                children.props.onClick?.(e)
                onOpenChange(true)
            },
            ...props
        })
    }
    return (
        <button className={className} onClick={() => onOpenChange(true)} {...props}>
            {children}
        </button>
    )
}

const DialogContent = ({ className, children, ...props }) => {
    const { open, onOpenChange } = React.useContext(DialogContext)
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            {/* Content */}
            <div className={cn("relative z-50 grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg", className)} {...props}>
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    )
}

const DialogHeader = ({ className, ...props }) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

const DialogFooter = ({ className, ...props }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
DialogDescription.displayName = "DialogDescription"

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
