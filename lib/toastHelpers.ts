/**
 * Toast Notification Helper Functions
 * Provides convenient methods for showing toast notifications with error messages
 */

import toast from 'react-hot-toast';
import { 
  ErrorMessages, 
  SuccessMessages, 
  LoadingMessages, 
  parseError,
  getErrorMessageByStatus,
  getValidationMessage 
} from './errorMessages';

// Toast notification options
const toastOptions = {
  duration: 3500,
  position: 'top-right' as const,
};

/**
 * Show error toast with optional custom message
 */
export const showErrorToast = (error: any, customMessage?: string): string => {
  let message = customMessage || parseError(error);
  toast.error(message, toastOptions);
  return message;
};

/**
 * Show success toast with optional custom message
 */
export const showSuccessToast = (message: string, id?: string): void => {
  toast.success(message, { ...toastOptions, id });
};

/**
 * Show loading toast
 */
export const showLoadingToast = (message: string): string => {
  return toast.loading(message, toastOptions);
};

/**
 * Show info toast
 */
export const showInfoToast = (message: string): string => {
  return toast(message, {
    ...toastOptions,
    icon: 'ℹ️',
  });
};

/**
 * Update existing toast
 */
export const updateToast = (toastId: string, message: string, type: 'success' | 'error' | 'loading' = 'success'): void => {
  if (type === 'success') {
    toast.success(message, { ...toastOptions, id: toastId });
  } else if (type === 'error') {
    toast.error(message, { ...toastOptions, id: toastId });
  } else {
    toast.loading(message, { ...toastOptions, id: toastId });
  }
};

/**
 * Show validation error toast
 */
export const showValidationError = (field: string, error: string): void => {
  const message = getValidationMessage(field, error);
  toast.error(message, toastOptions);
};

/**
 * Show HTTP status error toast
 */
export const showStatusError = (status: number): void => {
  const message = getErrorMessageByStatus(status);
  toast.error(message, toastOptions);
};

/**
 * Shipment operation toasts
 */
export const shipmentToasts = {
  creating: () => showLoadingToast(LoadingMessages.CREATING('shipment')),
  created: () => showSuccessToast(SuccessMessages.SHIPMENT.CREATED),
  updating: () => showLoadingToast(LoadingMessages.UPDATING('shipment')),
  updated: (id?: string) => showSuccessToast(SuccessMessages.SHIPMENT.UPDATED, id),
  deleting: () => showLoadingToast(LoadingMessages.DELETING('shipment')),
  deleted: (id?: string) => showSuccessToast(SuccessMessages.SHIPMENT.DELETED, id),
  assigned: (id?: string) => showSuccessToast(SuccessMessages.SHIPMENT.ASSIGNED, id),
  statusUpdated: (status: string, id?: string) => 
    showSuccessToast(SuccessMessages.SHIPMENT.STATUS_UPDATED(status), id),
  originRequired: () => toast.error(ErrorMessages.SHIPMENT.ORIGIN_REQUIRED, toastOptions),
  destinationRequired: () => toast.error(ErrorMessages.SHIPMENT.DESTINATION_REQUIRED, toastOptions),
  senderDetailsRequired: () => toast.error(ErrorMessages.SHIPMENT.SENDER_DETAILS_REQUIRED, toastOptions),
  recipientDetailsRequired: () => toast.error(ErrorMessages.SHIPMENT.RECIPIENT_DETAILS_REQUIRED, toastOptions),
  fetchFailed: () => toast.error(ErrorMessages.SHIPMENT.FETCH_FAILED, toastOptions),
  createFailed: (id?: string) => toast.error(ErrorMessages.SHIPMENT.CREATE_FAILED, { ...toastOptions, id }),
  updateFailed: (id?: string) => toast.error(ErrorMessages.SHIPMENT.UPDATE_FAILED, { ...toastOptions, id }),
  deleteFailed: (id?: string) => toast.error(ErrorMessages.SHIPMENT.DELETE_FAILED, { ...toastOptions, id }),
};

/**
 * User operation toasts
 */
export const userToasts = {
  creating: () => showLoadingToast(LoadingMessages.CREATING('user')),
  created: () => showSuccessToast(SuccessMessages.USER.CREATED),
  updating: () => showLoadingToast(LoadingMessages.UPDATING('user')),
  updated: (id?: string) => showSuccessToast(SuccessMessages.USER.UPDATED, id),
  deleting: () => showLoadingToast(LoadingMessages.DELETING('user')),
  deleted: (id?: string) => showSuccessToast(SuccessMessages.USER.DELETED, id),
  emailExists: () => toast.error(ErrorMessages.USER.EMAIL_ALREADY_EXISTS, toastOptions),
  fetchFailed: () => toast.error(ErrorMessages.USER.FETCH_FAILED, toastOptions),
  createFailed: (id?: string) => toast.error(ErrorMessages.USER.CREATE_FAILED, { ...toastOptions, id }),
  updateFailed: (id?: string) => toast.error(ErrorMessages.USER.UPDATE_FAILED, { ...toastOptions, id }),
  deleteFailed: (id?: string) => toast.error(ErrorMessages.USER.DELETE_FAILED, { ...toastOptions, id }),
};

/**
 * Tenant operation toasts
 */
export const tenantToasts = {
  creating: () => showLoadingToast(LoadingMessages.CREATING('branch')),
  created: (name: string) => showSuccessToast(SuccessMessages.TENANT.CREATED(name)),
  updating: () => showLoadingToast(LoadingMessages.UPDATING('branch')),
  updated: (name: string, id?: string) => showSuccessToast(SuccessMessages.TENANT.UPDATED(name), id),
  deleting: () => showLoadingToast(LoadingMessages.DELETING('branch')),
  deleted: (id?: string) => showSuccessToast(SuccessMessages.TENANT.DELETED, id),
  fetchFailed: () => toast.error(ErrorMessages.TENANT.FETCH_FAILED, toastOptions),
  createFailed: (id?: string) => toast.error(ErrorMessages.TENANT.CREATE_FAILED, { ...toastOptions, id }),
  updateFailed: (id?: string) => toast.error(ErrorMessages.TENANT.UPDATE_FAILED, { ...toastOptions, id }),
  deleteFailed: (id?: string) => toast.error(ErrorMessages.TENANT.DELETE_FAILED, { ...toastOptions, id }),
};

/**
 * Manifest operation toasts
 */
export const manifestToasts = {
  creating: () => showLoadingToast(LoadingMessages.CREATING('manifest')),
  created: () => showSuccessToast(SuccessMessages.MANIFEST.CREATED),
  receiving: () => showLoadingToast('Receiving manifest...'),
  received: (id?: string) => showSuccessToast(SuccessMessages.MANIFEST.RECEIVED, id),
  deleting: () => showLoadingToast(LoadingMessages.DELETING('manifest')),
  deleted: (id?: string) => showSuccessToast(SuccessMessages.MANIFEST.DELETED, id),
  fetchFailed: () => toast.error(ErrorMessages.MANIFEST.FETCH_FAILED, toastOptions),
  createFailed: (id?: string) => toast.error(ErrorMessages.MANIFEST.CREATE_FAILED, { ...toastOptions, id }),
  receiveFailed: (id?: string) => toast.error(ErrorMessages.MANIFEST.RECEIVE_FAILED, { ...toastOptions, id }),
  shipmentRequired: () => toast.error(ErrorMessages.MANIFEST.SHIPMENT_REQUIRED, toastOptions),
  destinationRequired: () => toast.error(ErrorMessages.MANIFEST.DESTINATION_REQUIRED, toastOptions),
};

/**
 * Authentication toasts
 */
export const authToasts = {
  logging: () => showLoadingToast(LoadingMessages.SENDING),
  loginSuccess: () => showSuccessToast(SuccessMessages.AUTH.LOGIN),
  logoutSuccess: () => showSuccessToast(SuccessMessages.AUTH.LOGOUT),
  invalidCredentials: () => toast.error(ErrorMessages.AUTH.INVALID_CREDENTIALS, toastOptions),
  tooManyAttempts: () => toast.error(ErrorMessages.AUTH.TOO_MANY_ATTEMPTS, toastOptions),
  loginFailed: (id?: string) => toast.error(ErrorMessages.AUTH.LOGIN_FAILED, { ...toastOptions, id }),
  logoutFailed: (id?: string) => toast.error(ErrorMessages.AUTH.LOGOUT_FAILED, { ...toastOptions, id }),
  sessionExpired: () => toast.error(ErrorMessages.AUTH.SESSION_EXPIRED, toastOptions),
  unauthorized: () => toast.error(ErrorMessages.AUTH.UNAUTHORIZED, toastOptions),
};

/**
 * File operation toasts
 */
export const fileToasts = {
  uploading: () => showLoadingToast(LoadingMessages.UPLOADING),
  uploaded: (id?: string) => showSuccessToast(SuccessMessages.FILE.UPLOADED, id),
  uploadFailed: (id?: string) => toast.error(ErrorMessages.FILE.UPLOAD_FAILED, { ...toastOptions, id }),
  invalidFile: () => toast.error(ErrorMessages.FILE.INVALID_FILE, toastOptions),
  fileTooLarge: () => toast.error(ErrorMessages.FILE.FILE_TOO_LARGE, toastOptions),
};

/**
 * Notification toasts
 */
export const notificationToasts = {
  enabled: () => showSuccessToast(SuccessMessages.NOTIFICATION.ENABLED),
  permissionDenied: () => toast.error(ErrorMessages.NOTIFICATION.PERMISSION_DENIED, toastOptions),
  notSupported: () => toast.error(ErrorMessages.NOTIFICATION.NOT_SUPPORTED, toastOptions),
  subscriptionFailed: () => toast.error(ErrorMessages.NOTIFICATION.SUBSCRIPTION_FAILED, toastOptions),
};

/**
 * Search toasts
 */
export const searchToasts = {
  noResults: () => showInfoToast(ErrorMessages.SEARCH.NO_RESULTS),
  searchFailed: () => toast.error(ErrorMessages.SEARCH.SEARCH_FAILED, toastOptions),
};

/**
 * Network/Connection toasts
 */
export const networkToasts = {
  offline: () => toast.error(ErrorMessages.NETWORK.NO_CONNECTION, { ...toastOptions, duration: 5000 }),
  serverError: (id?: string) => toast.error(ErrorMessages.NETWORK.SERVER_ERROR, { ...toastOptions, id }),
  timeout: (id?: string) => toast.error(ErrorMessages.NETWORK.REQUEST_TIMEOUT, { ...toastOptions, id }),
  rateLimited: (id?: string) => toast.error(ErrorMessages.NETWORK.RATE_LIMITED, { ...toastOptions, id }),
};

/**
 * Generic utility toasts
 */
export const genericToasts = {
  saving: () => showLoadingToast(LoadingMessages.SAVING),
  saved: (id?: string) => showSuccessToast(SuccessMessages.GENERIC.SAVED, id),
  processing: () => showLoadingToast(LoadingMessages.PROCESSING),
  completed: (id?: string) => showSuccessToast(SuccessMessages.GENERIC.OPERATION_COMPLETED, id),
  error: (id?: string) => toast.error(ErrorMessages.GENERIC.UNEXPECTED, { ...toastOptions, id }),
  tryAgain: () => toast.error(ErrorMessages.GENERIC.TRY_AGAIN, toastOptions),
};

// Export everything as a grouped object for convenience
export const Toasts = {
  error: showErrorToast,
  success: showSuccessToast,
  loading: showLoadingToast,
  info: showInfoToast,
  update: updateToast,
  validation: showValidationError,
  status: showStatusError,
  shipment: shipmentToasts,
  user: userToasts,
  tenant: tenantToasts,
  manifest: manifestToasts,
  auth: authToasts,
  file: fileToasts,
  notification: notificationToasts,
  search: searchToasts,
  network: networkToasts,
  generic: genericToasts,
};
