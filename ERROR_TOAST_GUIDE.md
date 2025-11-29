# Error Toast Messages System

## Overview
Comprehensive error and success toast notification system for user-friendly error handling and feedback throughout the application.

---

## Files Created

### 1. `lib/errorMessages.ts` (302 lines)
Central repository for all error, success, and loading messages organized by category.

### 2. `lib/toastHelpers.ts` (243 lines)
Helper functions and utilities for displaying toast notifications with consistent styling.

---

## Message Categories

### Error Messages (`ErrorMessages`)

**Authentication (`AUTH`)**
- `INVALID_CREDENTIALS` - "Invalid email or password. Please try again."
- `EMAIL_REQUIRED` - "Email is required."
- `PASSWORD_REQUIRED` - "Password is required."
- `LOGIN_FAILED` - "Login failed. Please check your credentials and try again."
- `LOGOUT_FAILED` - "Logout failed. Please try again."
- `SESSION_EXPIRED` - "Your session has expired. Please log in again."
- `UNAUTHORIZED` - "You are not authorized to perform this action."
- `FORBIDDEN` - "Access denied. You do not have permission."
- `TOO_MANY_ATTEMPTS` - "Too many login attempts. Please try again later."

**Validation (`VALIDATION`)**
- `EMAIL_INVALID` - "Please enter a valid email address."
- `PHONE_INVALID` - "Phone number must be at least 10 digits."
- `ADDRESS_TOO_SHORT` - "Address must be at least 5 characters long."
- `ADDRESS_TOO_LONG` - "Address cannot exceed 200 characters."
- `NAME_REQUIRED` - "Name is required."
- `PASSWORD_TOO_SHORT` - "Password must be at least 6 characters long."
- `FIELD_REQUIRED(field)` - Generates: "{field} is required."
- `INVALID_FORMAT(field)` - Generates: "Invalid {field} format."

**Shipment (`SHIPMENT`)**
- `CREATE_FAILED` - "Failed to create shipment. Please try again."
- `UPDATE_FAILED` - "Failed to update shipment. Please try again."
- `DELETE_FAILED` - "Failed to delete shipment. Please try again."
- `FETCH_FAILED` - "Failed to fetch shipments. Please refresh the page."
- `ORIGIN_REQUIRED` - "Origin branch is required."
- `DESTINATION_REQUIRED` - "Destination branch is required."
- `SENDER_DETAILS_REQUIRED` - "Please fill in all sender details."
- `RECIPIENT_DETAILS_REQUIRED` - "Please fill in all recipient details."

**User (`USER`)**
- `CREATE_FAILED` - "Failed to create user. Please try again."
- `UPDATE_FAILED` - "Failed to update user. Please try again."
- `DELETE_FAILED` - "Failed to delete user. Please try again."
- `FETCH_FAILED` - "Failed to fetch users. Please refresh the page."
- `EMAIL_ALREADY_EXISTS` - "This email is already registered."
- `DUPLICATE_EMAIL` - "A user with this email already exists."

**Tenant/Branch (`TENANT`)**
- `CREATE_FAILED` - "Failed to create branch. Please try again."
- `UPDATE_FAILED` - "Failed to update branch. Please try again."
- `DELETE_FAILED` - "Failed to delete branch. Please try again."
- `FETCH_FAILED` - "Failed to fetch branches. Please refresh the page."
- `NAME_REQUIRED` - "Branch name is required."

**Manifest (`MANIFEST`)**
- `CREATE_FAILED` - "Failed to create manifest. Please try again."
- `RECEIVE_FAILED` - "Failed to receive manifest. Please try again."
- `FETCH_FAILED` - "Failed to fetch manifests. Please refresh the page."
- `SHIPMENT_REQUIRED` - "Please select at least one shipment."
- `DESTINATION_REQUIRED` - "Please select a destination branch."

**Network (`NETWORK`)**
- `NO_CONNECTION` - "No internet connection. Please check your connection and try again."
- `REQUEST_TIMEOUT` - "Request timed out. Please try again."
- `SERVER_ERROR` - "Server error. Please try again later."
- `RATE_LIMITED` - "Too many requests. Please wait a moment and try again."
- `BAD_REQUEST` - "Invalid request. Please check your input and try again."

**File (`FILE`)**
- `UPLOAD_FAILED` - "Failed to upload file. Please try again."
- `INVALID_FILE` - "Invalid file format. Please select a valid file."
- `FILE_TOO_LARGE` - "File size exceeds the maximum limit."

### Success Messages (`SuccessMessages`)

**Shipment**
- `CREATED` - "Shipment created successfully."
- `UPDATED` - "Shipment updated successfully."
- `DELETED` - "Shipment deleted successfully."
- `ASSIGNED` - "Shipment assigned successfully."
- `STATUS_UPDATED(status)` - Generates: "Status updated to {status}."

**User**
- `CREATED` - "User created successfully."
- `UPDATED` - "User updated successfully."
- `DELETED` - "User deleted successfully."

**Tenant**
- `CREATED(name)` - Generates: 'Branch "{name}" was created successfully.'
- `UPDATED(name)` - Generates: 'Branch "{name}" was updated successfully.'
- `DELETED` - "Branch deleted successfully."

**Manifest**
- `CREATED` - "Manifest created successfully."
- `RECEIVED` - "Manifest received successfully!"
- `DELETED` - "Manifest deleted successfully."

**Auth**
- `LOGIN` - "Login successful."
- `LOGOUT` - "Logged out successfully!"
- `PASSWORD_RESET` - "Password reset successful."

### Loading Messages (`LoadingMessages`)

- `CREATING(item)` - Generates: "Creating {item}..."
- `UPDATING(item)` - Generates: "Updating {item}..."
- `DELETING(item)` - Generates: "Deleting {item}..."
- `LOADING(item)` - Generates: "Loading {item}..."
- `UPLOADING` - "Uploading file..."
- `SAVING` - "Saving changes..."
- `SENDING` - "Sending request..."
- `PROCESSING` - "Processing..."

---

## Helper Functions

### Core Functions

**`showErrorToast(error, customMessage?)`**
Show error toast notification.
```typescript
showErrorToast(error); // Uses parsed error message
showErrorToast(error, 'Custom error message');
```

**`showSuccessToast(message, id?)`**
Show success toast notification.
```typescript
showSuccessToast('Changes saved successfully');
```

**`showLoadingToast(message)`**
Show loading toast (can be updated later).
```typescript
const toastId = showLoadingToast('Saving...');
// Later: updateToast(toastId, 'Saved!', 'success');
```

**`showInfoToast(message)`**
Show info toast with ℹ️ icon.
```typescript
showInfoToast('Please note this information');
```

**`updateToast(toastId, message, type)`**
Update existing toast message.
```typescript
const toastId = showLoadingToast('Processing...');
updateToast(toastId, 'Done!', 'success');
```

**`showValidationError(field, error)`**
Show validation error with field context.
```typescript
showValidationError('email', 'invalid');
// Shows: "Please enter a valid email."
```

**`showStatusError(status)`**
Show HTTP status code error.
```typescript
showStatusError(429); // "Too many requests. Please wait..."
showStatusError(500); // "Server error. Please try again later."
```

### Category-Specific Helpers

#### Shipment Toasts (`shipmentToasts`)
```typescript
import { Toasts } from '@/lib/toastHelpers';

Toasts.shipment.creating();           // Shows: "Creating shipment..."
Toasts.shipment.created();             // Shows: "Shipment created successfully."
Toasts.shipment.originRequired();       // Shows: "Origin branch is required."
Toasts.shipment.senderDetailsRequired(); // Shows: "Please fill in all sender details."
Toasts.shipment.createFailed(toastId);  // Shows: "Failed to create shipment..."
```

#### User Toasts (`userToasts`)
```typescript
Toasts.user.creating();          // Shows: "Creating user..."
Toasts.user.created();           // Shows: "User created successfully."
Toasts.user.emailExists();       // Shows: "This email is already in use."
Toasts.user.createFailed(id);    // Shows: "Failed to create user..."
```

#### Tenant Toasts (`tenantToasts`)
```typescript
Toasts.tenant.creating();           // Shows: "Creating branch..."
Toasts.tenant.created('Main Office'); // Shows: 'Branch "Main Office" was created successfully.'
Toasts.tenant.updating();           // Shows: "Updating branch..."
Toasts.tenant.updated('Main Office', id); // Shows: 'Branch "Main Office" was updated successfully.'
```

#### Manifest Toasts (`manifestToasts`)
```typescript
Toasts.manifest.creating();       // Shows: "Creating manifest..."
Toasts.manifest.created();         // Shows: "Manifest created successfully."
Toasts.manifest.receiving();       // Shows: "Receiving manifest..."
Toasts.manifest.received(id);      // Shows: "Manifest received successfully!"
Toasts.manifest.shipmentRequired(); // Shows: "Please select at least one shipment."
```

#### Auth Toasts (`authToasts`)
```typescript
Toasts.auth.logging();            // Shows: "Sending request..."
Toasts.auth.loginSuccess();        // Shows: "Login successful."
Toasts.auth.logoutSuccess();       // Shows: "Logged out successfully!"
Toasts.auth.invalidCredentials();  // Shows: "Invalid email or password..."
Toasts.auth.tooManyAttempts();     // Shows: "Too many login attempts..."
Toasts.auth.sessionExpired();      // Shows: "Your session has expired..."
```

#### File Toasts (`fileToasts`)
```typescript
Toasts.file.uploading();           // Shows: "Uploading file..."
Toasts.file.uploaded(id);          // Shows: "File uploaded successfully."
Toasts.file.uploadFailed(id);      // Shows: "Failed to upload file..."
Toasts.file.invalidFile();         // Shows: "Invalid file format..."
Toasts.file.fileTooLarge();        // Shows: "File size exceeds the maximum limit."
```

#### Network Toasts (`networkToasts`)
```typescript
Toasts.network.offline();          // Shows: "No internet connection..."
Toasts.network.serverError(id);    // Shows: "Server error. Please try again later."
Toasts.network.timeout(id);        // Shows: "Request timed out. Please try again."
Toasts.network.rateLimited(id);    // Shows: "Too many requests. Please wait..."
```

#### Generic Toasts (`genericToasts`)
```typescript
Toasts.generic.saving();           // Shows: "Saving changes..."
Toasts.generic.saved(id);          // Shows: "Changes saved successfully."
Toasts.generic.error(id);          // Shows: "An unexpected error occurred..."
Toasts.generic.tryAgain();         // Shows: "Something went wrong. Please try again."
```

---

## Usage Examples

### Example 1: Form Submission with Error Handling

**Before:**
```typescript
const handleSubmit = async (event: FormEvent) => {
  event.preventDefault();
  const toastId = toast.loading('Creating shipment...');
  try {
    const response = await fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipmentData)
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to create shipment');
    }
    toast.success('Shipment created successfully!', { id: toastId });
  } catch (error: any) {
    toast.error(error.message || 'Failed to create shipment', { id: toastId });
  }
};
```

**After:**
```typescript
import { Toasts } from '@/lib/toastHelpers';

const handleSubmit = async (event: FormEvent) => {
  event.preventDefault();
  const toastId = Toasts.shipment.creating();
  try {
    const response = await fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipmentData)
    });
    if (!response.ok) throw new Error(await response.json());
    Toasts.update(toastId, SuccessMessages.SHIPMENT.CREATED, 'success');
    // Refresh data...
  } catch (error: any) {
    Toasts.shipment.createFailed(toastId);
  }
};
```

### Example 2: Validation on Input

**Before:**
```typescript
if (!originBranchId) {
  toast.error('Origin branch is required');
  return;
}
if (!senderAddress) {
  toast.error('Sender address is required');
  return;
}
if (!isValidAddress(senderAddress)) {
  toast.error('Sender address must be between 5-200 characters');
  return;
}
```

**After:**
```typescript
import { Toasts } from '@/lib/toastHelpers';

if (!originBranchId) {
  Toasts.shipment.originRequired();
  return;
}
if (!senderAddress) {
  Toasts.validation('Sender address', 'required');
  return;
}
if (!isValidAddress(senderAddress)) {
  Toasts.validation('Sender address', 'short');
  return;
}
```

### Example 3: Async Data Fetching

**Before:**
```typescript
const fetchShipments = async () => {
  try {
    const response = await fetch('/api/shipments');
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setShipments(data);
  } catch (error) {
    toast.error('Failed to fetch shipments. Please refresh the page.');
  }
};
```

**After:**
```typescript
import { Toasts } from '@/lib/toastHelpers';

const fetchShipments = async () => {
  try {
    const response = await fetch('/api/shipments');
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setShipments(data);
  } catch (error) {
    Toasts.shipment.fetchFailed();
  }
};
```

### Example 4: User Management

**Before:**
```typescript
const handleCreateUser = async () => {
  const toastId = toast.loading('Creating user...');
  try {
    const response = await fetch('/api/users', { ... });
    if (!response.ok) {
      if (response.status === 409) {
        toast.error('Email already exists', { id: toastId });
      } else {
        toast.error('Failed to create user', { id: toastId });
      }
      return;
    }
    toast.success('User created successfully', { id: toastId });
  } catch (error) {
    toast.error(error.message, { id: toastId });
  }
};
```

**After:**
```typescript
import { Toasts } from '@/lib/toastHelpers';

const handleCreateUser = async () => {
  const toastId = Toasts.user.creating();
  try {
    const response = await fetch('/api/users', { ... });
    if (!response.ok) {
      if (response.status === 409) {
        Toasts.user.emailExists();
      } else {
        Toasts.user.createFailed(toastId);
      }
      return;
    }
    Toasts.update(toastId, SuccessMessages.USER.CREATED, 'success');
  } catch (error) {
    Toasts.error(error, toastId);
  }
};
```

---

## Best Practices

### 1. Use Specific Toasts When Available
```typescript
// ✅ Good - Specific and contextual
Toasts.shipment.originRequired();
Toasts.user.emailExists();
Toasts.manifest.shipmentRequired();

// ❌ Avoid - Generic messages
toast.error('Error occurred');
toast.error('Invalid input');
```

### 2. Update Loading Toasts
```typescript
// ✅ Good - Updates toast to show final status
const toastId = Toasts.shipment.creating();
try {
  // ... operation ...
  Toasts.update(toastId, SuccessMessages.SHIPMENT.CREATED, 'success');
} catch (error) {
  Toasts.shipment.createFailed(toastId);
}

// ❌ Avoid - Multiple toasts
const toastId = toast.loading('Creating...');
// ... later ...
toast.success('Created!');  // Shows new toast instead of updating
```

### 3. Pass Toast IDs for Proper Updates
```typescript
// ✅ Good - Same toast gets updated
const toastId = Toasts.generic.saving();
updateToast(toastId, 'Saved!', 'success');

// ❌ Avoid - Creates new toast
const toastId = Toasts.generic.saving();
toast.success('Saved!'); // New toast instead of update
```

### 4. Handle HTTP Status Codes
```typescript
// ✅ Good - Maps status codes to user-friendly messages
if (!response.ok) {
  Toasts.status(response.status); // Automatically shows appropriate message
  return;
}

// ❌ Avoid - Generic errors for status codes
if (!response.ok) {
  toast.error('Request failed');
  return;
}
```

### 5. Validate Early, Show Feedback Immediately
```typescript
// ✅ Good - Validate before submitting
if (!email) {
  Toasts.validation('Email', 'required');
  return;
}
const toastId = Toasts.shipment.creating();
// ... submit ...

// ❌ Avoid - Generic validation
if (!email) {
  toast.error('Invalid input');
}
```

---

## Integration Checklist

- [ ] Import `Toasts` in component: `import { Toasts } from '@/lib/toastHelpers'`
- [ ] Replace generic `toast.error()` calls with specific `Toasts.*` methods
- [ ] Use toast IDs to update loading toasts when operations complete
- [ ] Use validation errors for field-specific feedback
- [ ] Use status errors for HTTP responses
- [ ] Test error messages in different scenarios
- [ ] Verify toast positioning and visibility on mobile
- [ ] Check toast duration (3.5 seconds default)

---

## Customization

To customize toast behavior:

1. **Change duration**: Edit `toastOptions.duration` in `toastHelpers.ts`
2. **Change position**: Edit `toastOptions.position` in `toastHelpers.ts`
3. **Add new messages**: Add to `ErrorMessages`, `SuccessMessages`, or `LoadingMessages` in `errorMessages.ts`
4. **Create custom toasts**: Extend `Toasts` object with new category-specific helpers

---

## Performance Notes

- Toast messages are pre-defined (no runtime string generation unless using dynamic functions like `STATUS_UPDATED()`)
- Helper functions are lightweight and optimized
- Toast durations are configurable per toast type
- No additional network requests or delays

---

## Accessibility

Toast notifications:
- ✅ Use semantic HTML with `role="status"` and `role="alert"`
- ✅ Announce to screen readers automatically (via react-hot-toast)
- ✅ Clear, simple language without technical jargon
- ✅ Color alone is not the only indicator (includes text)
- ✅ Appropriate contrast ratios
- ✅ Keyboard accessible (dismissible)

---

## Migration Guide

To migrate existing code to use the new system:

1. **Search for `toast.error(` and replace with `Toasts.error(` or category-specific helpers**
2. **Search for `toast.success(` and replace with appropriate `Toasts.*.created()` or `Toasts.success()`**
3. **Search for `toast.loading(` and replace with `Toasts.*.creating()` or similar**
4. **Test each page/component thoroughly**
5. **Verify toast messages match user feedback**

---

## Support & Troubleshooting

**Toast not showing?**
- Check that `<Toaster />` is rendered in `app/layout.tsx`
- Verify `toastOptions` configuration
- Check browser console for errors

**Wrong message appearing?**
- Verify correct category helper is being used
- Check that message key exists in `ErrorMessages`/`SuccessMessages`
- Test in browser to confirm mapping

**Need new message type?**
- Add to `ErrorMessages`, `SuccessMessages`, or `LoadingMessages` in `errorMessages.ts`
- Create helper function in relevant toast category in `toastHelpers.ts`
- Update documentation with new message

---

End of Error Toast Messages System documentation.
