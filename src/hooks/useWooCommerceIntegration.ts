import { useProject } from '@/contexts/ProjectContext';
import { useState, useEffect } from 'react';

export function useWooCommerceIntegration() {
    const { currentProject } = useProject();
    const [isConnected, setIsConnected] = useState<boolean | null>(null); // null = loading
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentProject) return;

        let mounted = true;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/projects/${currentProject.id}/integrations`);
                if (res.ok) {
                    const data = await res.json();
                    const woo = data.integrations?.find((i: any) => i.provider_type === 'woocommerce');
                    if (mounted) {
                        // Check if it exists and status is active/connected
                        // Based on my previous code, 'active' is the status for user-managed integrations
                        setIsConnected(!!woo && (woo.status === 'active' || woo.status === 'connected'));
                    }
                } else {
                    if (mounted) setIsConnected(false);
                }
            } catch (e) {
                console.error("Failed to check woo status", e);
                if (mounted) setIsConnected(false);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        checkStatus();

        return () => { mounted = false; };
    }, [currentProject]);

    return { isConnected, isLoading };
}
