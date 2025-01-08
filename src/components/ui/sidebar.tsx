import React, { useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react"; // Using lucide-react as an icon set compatible with shadcn
import { cn } from "@/lib/utils"; // Optional: Replace with your own `classNames` utility

interface Links {
    label: string;
    href: string;
    icon: React.ReactNode;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
    undefined
);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(false);

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
        {children}
    </SidebarProvider>
);

export const SidebarBody = (props: React.HTMLAttributes<HTMLDivElement>) => (
    <>
        <DesktopSidebar {...props} />
        <MobileSidebar {...props} />
    </>
);

export const DesktopSidebar = ({
    className,
    children,
}: React.HTMLAttributes<HTMLDivElement>) => {
    const { open, setOpen, animate } = useSidebar();

    return (
        <motion.div
            className={cn(
                "hidden md:flex flex-col h-full bg-neutral-100 dark:bg-neutral-800 px-4 py-4 transition-all",
                className
            )}
            animate={{
                width: animate ? (open ? "300px" : "60px") : "300px",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            // {...props}
        >
            {children}
        </motion.div>
    );
};

export const MobileSidebar = ({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
    const { open, setOpen } = useSidebar();

    return (
        <div
            className={cn(
                "flex md:hidden items-center justify-between px-4 py-4 bg-neutral-100 dark:bg-neutral-800 w-full",
                className
            )}
            {...props}
        >
            <button onClick={() => setOpen(!open)}>
                <Menu className="text-neutral-800 dark:text-neutral-200" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "-100%", opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="fixed inset-0 z-50 bg-white dark:bg-neutral-900 p-10 flex flex-col"
                    >
                        <button
                            className="absolute top-4 right-4 text-neutral-800 dark:text-neutral-200"
                            onClick={() => setOpen(false)}
                        >
                            <X />
                        </button>
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const SidebarLink = ({
    link,
    className,
    ...props
}: {
    link: Links;
    className?: string;
    props?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
}) => {
    const { open, animate } = useSidebar();

    return (
        <div
           
            className={cn(
                "flex items-center gap-2 py-2 transition-all",
                className
            )}
            {...props}
        >
            {link.icon}
            <motion.span
                animate={{
                    opacity: animate ? (open ? 1 : 0) : 1,
                    width: open ? "auto" : "0",
                }}
                className="text-neutral-700 dark:text-neutral-200 text-sm whitespace-nowrap"
            >
                {link.label}
            </motion.span>
        </div>
    );
};
