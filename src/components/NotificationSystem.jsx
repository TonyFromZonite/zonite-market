import { Toaster, toast } from 'sonner';

// Composant à mettre dans le Layout
export function NotificationToaster() {
  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      duration={4000}
      style={{
        fontSize: '14px',
      }}
    />
  );
}

// Fonctions utilitaires d'utilisation simple
export const showSuccess = (message, description) => {
  toast.success(message, {
    description: description,
    duration: 3000,
  });
};

export const showError = (message, description) => {
  toast.error(message, {
    description: description,
    duration: 5000,
  });
};

export const showInfo = (message, description) => {
  toast.info(message, {
    description: description,
    duration: 3000,
  });
};

export const showWarning = (message, description) => {
  toast.warning(message, {
    description: description,
    duration: 4000,
  });
};

export const showLoading = (message) => {
  return toast.loading(message);
};

export const updateToast = (toastId, message, type = 'success', description) => {
  toast[type](message, {
    id: toastId,
    description: description,
    duration: 3000,
  });
};