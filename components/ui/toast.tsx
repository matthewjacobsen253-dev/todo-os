"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined,
);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback(
    (message: string, type: ToastType = "info", duration = 5000) => {
      const id = Date.now().toString();
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, duration);
      }
    },
    [],
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const typeConfig = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-800 dark:text-green-200",
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-800 dark:text-red-200",
      icon: <XCircle className="h-5 w-5 text-red-600" />,
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-800 dark:text-yellow-200",
      icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-800 dark:text-blue-200",
      icon: <Info className="h-5 w-5 text-blue-600" />,
    },
  };

  const config = typeConfig[toast.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-current/20 p-4 shadow-lg animate-in slide-in-from-right-full duration-300",
        config.bg,
        config.text,
      )}
      role="alert"
    >
      {config.icon}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="ml-2 shrink-0 text-current/70 hover:text-current focus:outline-none"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
};
