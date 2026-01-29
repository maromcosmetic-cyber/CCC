// Project Context for managing current project state

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Project {
    id: string;
    name: string;
    website_url: string;
    monthly_budget_amount?: number;
    monthly_budget_currency?: string;
    created_at: string;
    brandIdentity?: any; // To store the comprehensive 14-section data
}

interface ProjectContextType {
    currentProject: Project | null;
    projects: Project[];
    setCurrentProject: (project: Project) => void;
    refreshProjects: () => Promise<void>;
    updateBrandIdentity: (data: any) => void;
    loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const updateBrandIdentity = async (data: any) => {
        if (!currentProject) return;
        const updated = { ...currentProject, brandIdentity: data };
        setCurrentProjectState(updated);
        // Optimistically update projects list too
        setProjects(prev => prev.map(p => p.id === currentProject.id ? updated : p));

        try {
            // Persist to DB
            await fetch(`/api/projects/${currentProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand_identity: data }),
            });

            // Clear local storage if it exists (cleanup)
            localStorage.removeItem(`brandContent_${currentProject.id}`);
        } catch (error) {
            console.error('Failed to save brand identity to DB:', error);
            // Fallback to local storage
            localStorage.setItem(`brandContent_${currentProject.id}`, JSON.stringify(data));
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');

            if (response.ok) {
                const data = await response.json();
                // Map brand_identity (DB) to brandIdentity (State)
                const mappedProjects = (data.projects || []).map((p: any) => ({
                    ...p,
                    brandIdentity: p.brand_identity || p.brandIdentity
                }));
                setProjects(mappedProjects);

                // Set first project as current if none selected
                if (!currentProject && mappedProjects.length > 0) {
                    const first = mappedProjects[0];
                    // Legacy: Check local storage if not in DB
                    if (!first.brandIdentity) {
                        const savedBrand = localStorage.getItem(`brandContent_${first.id}`);
                        if (savedBrand) first.brandIdentity = JSON.parse(savedBrand);
                    }

                    setCurrentProjectState(first);
                    localStorage.setItem('currentProjectId', first.id);
                }
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();

        // Try to restore last selected project
        const savedProjectId = localStorage.getItem('currentProjectId');
        if (savedProjectId) {
            // Will be set when projects are loaded
        }
    }, []);

    const setCurrentProject = (project: Project) => {
        setCurrentProjectState(project);
        localStorage.setItem('currentProjectId', project.id);
    };

    const refreshProjects = async () => {
        setLoading(true);
        await fetchProjects();
    };

    return (
        <ProjectContext.Provider
            value={{
                currentProject,
                projects,
                setCurrentProject,
                refreshProjects,
                updateBrandIdentity, // Added
                loading,
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
