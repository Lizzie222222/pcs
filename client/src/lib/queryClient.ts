import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check if data is FormData (for file uploads)
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle queryKey with params object
    let url: string;
    if (queryKey.length === 1) {
      // Simple case: just the URL
      url = queryKey[0] as string;
    } else if (queryKey.length === 2 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      // Case with params object
      const baseUrl = queryKey[0] as string;
      const params = queryKey[1] as Record<string, any>;
      
      // Filter out undefined/null values and build query string
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      const queryString = queryParams.toString();
      url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } else {
      // Fallback to join for other cases
      url = queryKey.join("/") as string;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // Most queries should throw on 401
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity, // Default to Infinity for most data
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      retry: (failureCount, error) => {
        // Don't retry on 401, 403, or 404 errors
        if (error?.message?.includes('401:') || 
            error?.message?.includes('403:') || 
            error?.message?.includes('404:')) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
