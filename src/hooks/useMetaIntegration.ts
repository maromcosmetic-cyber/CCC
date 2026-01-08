import { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';

export function useMetaIntegration() {
    const { currentProject } = useProject();
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        async function checkIntegration() {
            if (!currentProject) return;

            try {
                const res = await fetch(`/api/projects/${currentProject.id}/integrations`);
                if (!res.ok) throw new Error('Failed to fetch integrations');

                const data = await res.json();
                // Check for active Meta Ads integration
                // The backend returns an array of integrations. 
                // We look for provider_type === 'meta_ads' (or 'facebook_ads' depending on DB seed, but user code used 'meta_ads')
                const hasMeta = data.integrations.some((i: any) =>
                    (i.provider_type === 'meta' || i.provider_type === 'meta_ads') &&
                    (i.status === 'active' || i.status === 'connected')
                );

                setIsConnected(hasMeta);
            } catch (error) {
                console.error('Meta integration check failed:', error);
                setIsConnected(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkIntegration();
    }, [currentProject]);

    return { isConnected, isLoading };
}
