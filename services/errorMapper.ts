
/**
 * Maps technical error codes/messages to human-friendly strings.
 * This fulfills the "Human Translation Layer" requirement of Architecture v2.6.
 */
export const mapErrorToUserMessage = (error: any): string => {
  if (!error) return 'Unknown error occurred.';

  let message = '';
  const code = error?.code || '';

  // 1. Handle Strings
  if (typeof error === 'string') {
    message = error;
  }
  // 2. Extract Message from Object
  else if (typeof error === 'object') {
    if (typeof error.message === 'string') {
      message = error.message;
    } else if (typeof error.error_description === 'string') {
      message = error.error_description;
    } else if (typeof error.details === 'string') {
      message = error.details;
    } else if (typeof error.hint === 'string') {
      message = error.hint; // Sometimes hints are useful context
    }
  }

  // 3. Check for known Postgres/Supabase codes
  if (code === '23505') return 'This item already exists.'; // Unique violation
  if (code === '23503') return 'This item refers to missing data.'; // FK violation
  if (code === '42P01') return 'System error: Missing table configuration.';
  if (code === '42703') return 'Database schema mismatch. Please run the migration script.'; // Undefined column (e.g. short_code)
  if (code === '42501') return 'Access restricted or dependency missing. Retrying...';
  if (code === 'PGRST116') return 'Data sync error: Format mismatch.';
  if (code === '22001') return 'Input text is too long.'; // String data right truncation

  // 4. Handle specific message patterns (Case Insensitive)
  if (message) {
    const lowerMsg = message.toLowerCase();

    if (
      lowerMsg.includes('failed to fetch') ||
      lowerMsg.includes('network request failed') ||
      lowerMsg.includes('networkerror') ||
      lowerMsg.includes('connection refused') ||
      lowerMsg.includes('typeerror: failed to fetch')
    ) {
      return 'Network connection lost. Changes are saved offline.';
    }
    if (lowerMsg.includes('quota exceeded')) return 'You have reached the storage limit.';
    if (lowerMsg.includes('permission denied')) return "You don't have permission to perform this action.";
    if (lowerMsg.includes('row violates row-level security')) return 'You do not have permission to modify this item.';
    if (lowerMsg.includes('value too long')) return 'Input text is too long. Please shorten it.';
    if (lowerMsg.includes('payload too large')) return 'Data is too large to sync.';

    // If we have a readable message, use it
    return message;
  }

  // 5. Fallback: Try to stringify if we have no message but it is an object
  if (typeof error === 'object') {
    try {
      const json = JSON.stringify(error);
      if (json !== '{}') {
        console.warn('Unmapped error object:', json);
        return 'An unexpected error occurred. (Technical details in console)';
      }
    } catch {
      // Ignore circular ref errors etc
    }
  }

  return 'An unexpected error occurred.';
};
