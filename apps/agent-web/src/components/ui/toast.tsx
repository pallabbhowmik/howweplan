'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X,
  Loader2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissable?: boolean;
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, update: Partial<Omit<Toast, 'id'>>) => void;
  clearAll: () => void;
  // Convenience methods
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => Promise<T>;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

interface ToastProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export function ToastProvider({ 
  children, 
  position = 'bottom-right',
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${++toastIdRef.current}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? (toast.variant === 'loading' ? Infinity : 5000),
      dismissable: toast.dismissable ?? true,
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Limit number of toasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, update: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...update } : t))
    );
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'success' });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'error', duration: 8000 });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'warning' });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'info' });
  }, [addToast]);

  const loading = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'loading', dismissable: false });
  }, [addToast]);

  const promiseToast = useCallback(async <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ): Promise<T> => {
    const id = addToast({ title: options.loading, variant: 'loading', dismissable: false });

    try {
      const result = await promise;
      const successMessage = typeof options.success === 'function' 
        ? options.success(result) 
        : options.success;
      updateToast(id, { title: successMessage, variant: 'success', dismissable: true, duration: 5000 });
      return result;
    } catch (err) {
      const errorMessage = typeof options.error === 'function'
        ? options.error(err instanceof Error ? err : new Error(String(err)))
        : options.error;
      updateToast(id, { title: errorMessage, variant: 'error', dismissable: true, duration: 8000 });
      throw err;
    }
  }, [addToast, updateToast]);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAll,
    success,
    error,
    warning,
    info,
    loading,
    promise: promiseToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} position={position} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  position: string;
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, position, onRemove }: ToastContainerProps) {
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positionClasses[position]
      )}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ============================================================================
// Toast Item
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss
    if (toast.duration && toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 200);
  };

  const variantConfig: Record<ToastVariant, { icon: ReactNode; className: string }> = {
    success: {
      icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
      className: 'border-emerald-200 bg-emerald-50',
    },
    error: {
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      className: 'border-red-200 bg-red-50',
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      className: 'border-amber-200 bg-amber-50',
    },
    info: {
      icon: <Info className="h-5 w-5 text-blue-500" />,
      className: 'border-blue-200 bg-blue-50',
    },
    loading: {
      icon: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
      className: 'border-blue-200 bg-blue-50',
    },
  };

  const config = variantConfig[toast.variant];

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 w-80 p-4 rounded-lg border shadow-lg transition-all duration-200',
        config.className,
        isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{config.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-gray-600">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              handleDismiss();
            }}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {toast.dismissable && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Export standalone toast functions (requires provider to be mounted)
// ============================================================================

let toastFunctions: ToastContextType | null = null;

export function setToastFunctions(functions: ToastContextType) {
  toastFunctions = functions;
}

export const toast = {
  success: (title: string, description?: string) => toastFunctions?.success(title, description),
  error: (title: string, description?: string) => toastFunctions?.error(title, description),
  warning: (title: string, description?: string) => toastFunctions?.warning(title, description),
  info: (title: string, description?: string) => toastFunctions?.info(title, description),
  loading: (title: string, description?: string) => toastFunctions?.loading(title, description),
  dismiss: (id: string) => toastFunctions?.removeToast(id),
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => toastFunctions?.promise(promise, options),
};
