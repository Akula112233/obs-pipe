import { useState, useEffect } from 'react';

export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuthStatus() {
      try {
        // Use the new auth status endpoint that doesn't throw errors
        const response = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.isAuthenticated);
          if (data.orgId) {
            setOrgId(data.orgId);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Only log to console if it's not an authentication error
        console.debug('Failed to check authentication status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuthStatus();
  }, []);

  return { isAuthenticated, orgId, isLoading };
} 