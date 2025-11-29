/**
 * Comprehensive Error Message Management System
 * Provides consistent, user-friendly error messages across the application
 */

// Error codes and their user-friendly messages
export const ErrorMessages = {
  // Authentication Errors
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
    EMAIL_REQUIRED: 'Email is required.',
    PASSWORD_REQUIRED: 'Password is required.',
    LOGIN_FAILED: 'Login failed. Please check your credentials and try again.',
    LOGOUT_FAILED: 'Logout failed. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied. You do not have permission.',
    TOO_MANY_ATTEMPTS: 'Too many login attempts. Please try again later.',
    EMAIL_NOT_FOUND: 'Email not found in the system.',
  },

  // Validation Errors
  VALIDATION: {
    EMAIL_INVALID: 'Please enter a valid email address.',
    EMAIL_REQUIRED: 'Email is required.',
    PHONE_INVALID: 'Phone number must be at least 10 digits.',
    PHONE_REQUIRED: 'Phone number is required.',
    ADDRESS_TOO_SHORT: 'Address must be at least 5 characters long.',
    ADDRESS_TOO_LONG: 'Address cannot exceed 200 characters.',
    ADDRESS_REQUIRED: 'Address is required.',
    NAME_REQUIRED: 'Name is required.',
    NAME_TOO_LONG: 'Name cannot exceed 100 characters.',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long.',
    PASSWORD_REQUIRED: 'Password is required.',
    FIELD_REQUIRED: (field: string) => `${field} is required.`,
    INVALID_FORMAT: (field: string) => `Invalid ${field} format.`,
    MUST_SELECT: (item: string) => `Please select a ${item}.`,
  },

  // Shipment Errors
  SHIPMENT: {
    CREATE_FAILED: 'Failed to create shipment. Please try again.',
    UPDATE_FAILED: 'Failed to update shipment. Please try again.',
    DELETE_FAILED: 'Failed to delete shipment. Please try again.',
    FETCH_FAILED: 'Failed to fetch shipments. Please refresh the page.',
    NOT_FOUND: 'Shipment not found.',
    INVALID_STATUS: 'Invalid shipment status.',
    ORIGIN_REQUIRED: 'Origin branch is required.',
    DESTINATION_REQUIRED: 'Destination branch is required.',
    SENDER_DETAILS_REQUIRED: 'Please fill in all sender details.',
    RECIPIENT_DETAILS_REQUIRED: 'Please fill in all recipient details.',
    ALREADY_ASSIGNED: 'This shipment is already assigned to a driver.',
    CANNOT_DELETE: 'Cannot delete shipment in current status.',
  },

  // User/Staff Errors
  USER: {
    CREATE_FAILED: 'Failed to create user. Please try again.',
    UPDATE_FAILED: 'Failed to update user. Please try again.',
    DELETE_FAILED: 'Failed to delete user. Please try again.',
    FETCH_FAILED: 'Failed to fetch users. Please refresh the page.',
    NOT_FOUND: 'User not found.',
    EMAIL_ALREADY_EXISTS: 'This email is already registered.',
    DUPLICATE_EMAIL: 'A user with this email already exists.',
    INVALID_ROLE: 'Invalid user role.',
    CANNOT_DELETE_SELF: 'You cannot delete your own account.',
  },

  // Tenant/Branch Errors
  TENANT: {
    CREATE_FAILED: 'Failed to create branch. Please try again.',
    UPDATE_FAILED: 'Failed to update branch. Please try again.',
    DELETE_FAILED: 'Failed to delete branch. Please try again.',
    FETCH_FAILED: 'Failed to fetch branches. Please refresh the page.',
    NOT_FOUND: 'Branch not found.',
    NAME_REQUIRED: 'Branch name is required.',
    ADMIN_NAME_REQUIRED: 'Admin name is required.',
    ADMIN_EMAIL_REQUIRED: 'Admin email is required.',
    ADMIN_PASSWORD_REQUIRED: 'Admin password is required.',
  },

  // Manifest/Dispatch Errors
  MANIFEST: {
    CREATE_FAILED: 'Failed to create manifest. Please try again.',
    RECEIVE_FAILED: 'Failed to receive manifest. Please try again.',
    FETCH_FAILED: 'Failed to fetch manifests. Please refresh the page.',
    NOT_FOUND: 'Manifest not found.',
    SHIPMENT_REQUIRED: 'Please select at least one shipment.',
    DESTINATION_REQUIRED: 'Please select a destination branch.',
    INVALID_STATUS: 'Cannot perform this action in the current status.',
    ALREADY_RECEIVED: 'This manifest has already been received.',
  },

  // File Upload Errors
  FILE: {
    UPLOAD_FAILED: 'Failed to upload file. Please try again.',
    INVALID_FILE: 'Invalid file format. Please select a valid file.',
    FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
    FILE_REQUIRED: 'Please select a file to upload.',
    UNSUPPORTED_FORMAT: (format: string) => `${format} format is not supported.`,
  },

  // Network Errors
  NETWORK: {
    NO_CONNECTION: 'No internet connection. Please check your connection and try again.',
    REQUEST_TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
    BAD_REQUEST: 'Invalid request. Please check your input and try again.',
    NOT_FOUND_RESOURCE: 'The requested resource was not found.',
    CONFLICT: 'A conflict occurred. The resource may have been modified.',
    RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  },

  // Notification/Permission Errors
  NOTIFICATION: {
    PERMISSION_DENIED: 'Notification permission denied.',
    NOT_SUPPORTED: 'Notifications are not supported on this device.',
    SUBSCRIPTION_FAILED: 'Failed to subscribe to notifications.',
    UNSUBSCRIBE_FAILED: 'Failed to unsubscribe from notifications.',
  },

  // Search/Filter Errors
  SEARCH: {
    NO_RESULTS: 'No results found matching your search.',
    INVALID_QUERY: 'Invalid search query.',
    SEARCH_FAILED: 'Search failed. Please try again.',
  },

  // Generic Errors
  GENERIC: {
    UNEXPECTED: 'An unexpected error occurred. Please try again.',
    TRY_AGAIN: 'Something went wrong. Please try again.',
    PLEASE_REFRESH: 'Please refresh the page and try again.',
    CONTACT_SUPPORT: 'If the problem persists, please contact support.',
    OPERATION_FAILED: 'Operation failed. Please try again.',
    UNKNOWN_ERROR: 'An unknown error occurred.',
  },
};

// HTTP Status Code to Error Message Mapping
export const getErrorMessageByStatus = (status: number): string => {
  switch (status) {
    case 400:
      return ErrorMessages.NETWORK.BAD_REQUEST;
    case 401:
      return ErrorMessages.AUTH.UNAUTHORIZED;
    case 403:
      return ErrorMessages.AUTH.FORBIDDEN;
    case 404:
      return ErrorMessages.NETWORK.NOT_FOUND_RESOURCE;
    case 409:
      return ErrorMessages.NETWORK.CONFLICT;
    case 429:
      return ErrorMessages.NETWORK.RATE_LIMITED;
    case 500:
      return ErrorMessages.NETWORK.SERVER_ERROR;
    case 503:
      return ErrorMessages.NETWORK.SERVICE_UNAVAILABLE;
    default:
      return ErrorMessages.GENERIC.TRY_AGAIN;
  }
};

// Parse error response and return user-friendly message
export const parseError = (error: any): string => {
  // If it's a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it has a message property, use it
  if (error?.message) {
    return error.message;
  }

  // If it's an Error object
  if (error instanceof Error) {
    return error.message;
  }

  // If it has status code, use that
  if (error?.status) {
    return getErrorMessageByStatus(error.status);
  }

  // Default fallback
  return ErrorMessages.GENERIC.UNEXPECTED;
};

// Categorize errors for different operations
export const getErrorMessage = (operation: string, errorCode?: string): string => {
  const code = errorCode?.toUpperCase() || 'FAILED';

  switch (operation.toLowerCase()) {
    case 'shipment':
      return ErrorMessages.SHIPMENT[code as keyof typeof ErrorMessages.SHIPMENT] || 
             ErrorMessages.SHIPMENT.CREATE_FAILED;
    case 'user':
      return ErrorMessages.USER[code as keyof typeof ErrorMessages.USER] || 
             ErrorMessages.USER.CREATE_FAILED;
    case 'tenant':
      return ErrorMessages.TENANT[code as keyof typeof ErrorMessages.TENANT] || 
             ErrorMessages.TENANT.CREATE_FAILED;
    case 'manifest':
      return ErrorMessages.MANIFEST[code as keyof typeof ErrorMessages.MANIFEST] || 
             ErrorMessages.MANIFEST.CREATE_FAILED;
    default:
      return ErrorMessages.GENERIC.OPERATION_FAILED;
  }
};

// Success Messages
export const SuccessMessages = {
  SHIPMENT: {
    CREATED: 'Shipment created successfully.',
    UPDATED: 'Shipment updated successfully.',
    DELETED: 'Shipment deleted successfully.',
    ASSIGNED: 'Shipment assigned successfully.',
    STATUS_UPDATED: (status: string) => `Status updated to ${status}.`,
  },
  USER: {
    CREATED: 'User created successfully.',
    UPDATED: 'User updated successfully.',
    DELETED: 'User deleted successfully.',
  },
  TENANT: {
    CREATED: (name: string) => `Branch "${name}" was created successfully.`,
    UPDATED: (name: string) => `Branch "${name}" was updated successfully.`,
    DELETED: 'Branch deleted successfully.',
  },
  MANIFEST: {
    CREATED: 'Manifest created successfully.',
    RECEIVED: 'Manifest received successfully!',
    DELETED: 'Manifest deleted successfully.',
  },
  FILE: {
    UPLOADED: 'File uploaded successfully.',
    DELETED: 'File deleted successfully.',
  },
  AUTH: {
    LOGIN: 'Login successful.',
    LOGOUT: 'Logged out successfully!',
    PASSWORD_RESET: 'Password reset successful.',
  },
  NOTIFICATION: {
    ENABLED: 'Notifications enabled successfully.',
    DISABLED: 'Notifications disabled.',
    MARKED_READ: 'All notifications marked as read.',
  },
  GENERIC: {
    OPERATION_COMPLETED: 'Operation completed successfully.',
    SAVED: 'Changes saved successfully.',
    DELETED: 'Item deleted successfully.',
  },
};

// Loading Messages
export const LoadingMessages = {
  CREATING: (item: string) => `Creating ${item}...`,
  UPDATING: (item: string) => `Updating ${item}...`,
  DELETING: (item: string) => `Deleting ${item}...`,
  LOADING: (item: string) => `Loading ${item}...`,
  UPLOADING: 'Uploading file...',
  SAVING: 'Saving changes...',
  SENDING: 'Sending request...',
  PROCESSING: 'Processing...',
};

// Validation Message Generators
export const getValidationMessage = (field: string, error: string): string => {
  const messages: Record<string, Record<string, string>> = {
    email: {
      required: `${field} is required.`,
      invalid: `Please enter a valid ${field}.`,
      exists: `This ${field} is already in use.`,
    },
    phone: {
      required: `${field} is required.`,
      invalid: `${field} must be at least 10 digits.`,
      format: `Invalid ${field} format.`,
    },
    address: {
      required: `${field} is required.`,
      short: `${field} must be at least 5 characters.`,
      long: `${field} cannot exceed 200 characters.`,
    },
    name: {
      required: `${field} is required.`,
      long: `${field} cannot exceed 100 characters.`,
    },
    password: {
      required: `${field} is required.`,
      short: `${field} must be at least 6 characters.`,
      weak: `${field} is too weak. Use uppercase, lowercase, numbers, and symbols.`,
    },
  };

  return messages[field.toLowerCase()]?.[error.toLowerCase()] || 
         `${field} is invalid. Please check and try again.`;
};
