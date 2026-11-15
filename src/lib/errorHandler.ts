/**
 * Safe error handler utility for mapping internal errors to user-friendly messages.
 * Prevents leaking sensitive database/system information to users.
 */

export const getSafeErrorMessage = (error: any): string => {
  // Map specific known Supabase/Postgres error codes
  if (error?.code === 'PGRST116') return 'Invalid request. Please check your input.';
  if (error?.code === '23505') return 'This record already exists.';
  if (error?.code === '23503') return 'Referenced record not found.';
  if (error?.code === '23514') return 'Invalid data format. Please check your input.';
  if (error?.code === '42501') return 'Access denied.';
  
  // Map auth-specific errors
  if (error?.message?.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (error?.message?.includes('Email not confirmed')) return 'Please verify your email address.';
  if (error?.message?.includes('Password should be')) return 'Password does not meet requirements.';
  
  // Catch RLS policy violations
  if (error?.message?.includes('RLS') || error?.message?.includes('row-level security')) {
    return 'Access denied.';
  }
  
  // Catch network errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return 'Network error. Please check your connection.';
  }
  
  // Default safe message
  return 'An error occurred. Please try again or contact support.';
};

/**
 * Log errors only in development mode
 */
export const logError = (context: string, error: any): void => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
};
