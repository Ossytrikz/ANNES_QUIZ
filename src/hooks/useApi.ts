import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

const DEFAULT_RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

interface QueryOptions<T> extends Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'> {
  retry?: boolean | number;
  retryDelay?: number;
  successMessage?: string;
  errorMessage?: string;
}

interface MutationOptions<T, V> extends Omit<UseMutationOptions<T, ApiError, V>, 'mutationFn'> {
  successMessage?: string;
  errorMessage?: string;
  invalidateQueries?: string[] | ((data: T, variables: V) => string[]);
}

// Helper function to handle Supabase errors
const handleSupabaseError = (error: any): ApiError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }
  
  return {
    message: error?.message || 'An unknown error occurred',
    status: error?.status,
    code: error?.code,
  };
};

export const useApi = () => {
  const queryClient = useQueryClient();

  const query = <T>(
    key: string | any[], 
    queryFn: () => Promise<T>,
    options: QueryOptions<T> = {}
  ) => {
    const {
      retry = true,
      retryDelay = DEFAULT_RETRY_DELAY,
      successMessage,
      errorMessage,
      ...queryOptions
    } = options;

    return useQuery<T, ApiError>({
      queryKey: Array.isArray(key) ? key : [key],
      queryFn: async () => {
        try {
          const data = await queryFn();
          if (successMessage) {
            toast.success(successMessage);
          }
          return data;
        } catch (error) {
          const apiError = handleSupabaseError(error);
          if (errorMessage || apiError.message) {
            toast.error(errorMessage || apiError.message);
          }
          throw apiError;
        }
      },
      retry: (failureCount, error) => {
        if (retry === false) return false;
        const maxRetries = typeof retry === 'number' ? retry : MAX_RETRIES;
        const shouldRetry = failureCount < maxRetries && error.status !== 401;
        
        if (!shouldRetry) return false;
        
        // For simplicity, we'll use the default delay when retrying
        // The actual delay will be handled by React Query's built-in retryDelay
        return true;
      },
      ...queryOptions,
    });
  };

  const mutation = <T, V = void>(
    mutationFn: (variables: V) => Promise<T>,
    options: MutationOptions<T, V> = {}
  ) => {
    const {
      onSuccess,
      onError,
      onSettled,
      successMessage,
      errorMessage,
      invalidateQueries,
      ...mutationOptions
    } = options;

    return useMutation<T, ApiError, V>({
      mutationFn: async (variables) => {
        try {
          const data = await mutationFn(variables);
          if (successMessage) {
            toast.success(successMessage);
          }
          return data;
        } catch (error) {
          const apiError = handleSupabaseError(error);
          if (errorMessage || apiError.message) {
            toast.error(errorMessage || apiError.message);
          }
          throw apiError;
        }
      },
      onSuccess: (data, variables, context) => {
        // Invalidate related queries if needed
        if (invalidateQueries) {
          const queries = typeof invalidateQueries === 'function'
            ? invalidateQueries(data, variables)
            : invalidateQueries;
          
          queries.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
          });
        }
        
        onSuccess?.(data, variables, context);
      },
      onError: (error, variables, context) => {
        onError?.(error, variables, context);
      },
      onSettled: (data, error, variables, context) => {
        onSettled?.(data, error, variables, context);
      },
      retry: (failureCount, error) => {
        if (error.status === 401) return false;
        return failureCount < MAX_RETRIES;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...mutationOptions,
    });
  };

  return {
    query,
    mutation,
    queryClient,
  };
};

export default useApi;
