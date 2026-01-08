import { getIntegrationCredentials } from './manager';

const WORDPRESS_API_BASE = '/wp-json/wp/v2';

export interface WordPressCredentials {
    site_url: string;
    username: string;
    application_password: string;
}

export interface WordPressPage {
    id: number;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    slug: string;
    status: string;
    modified: string;
    link: string;
}

/**
 * Fetch all WordPress pages
 */
export async function fetchAllWordPressPages(
    projectId: string
): Promise<WordPressPage[] | null> {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'wordpress');

        if (!credentials || !credentials.site_url || !credentials.username || !credentials.application_password) {
            console.warn('WordPress credentials missing');
            return null;
        }

        const { site_url, username, application_password } = credentials as unknown as WordPressCredentials;

        const auth = Buffer.from(`${username}:${application_password}`).toString('base64');

        const response = await fetch(
            `${site_url}${WORDPRESS_API_BASE}/pages?per_page=100&status=publish`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`WordPress API Error (${response.status}):`, errorText);
            return null;
        }

        const pages = await response.json();
        return pages;
    } catch (error) {
        console.error('Error fetching WordPress pages:', error);
        return null;
    }
}

/**
 * Fetch a WordPress page by slug
 */
export async function fetchWordPressPage(
    projectId: string,
    slug: string
): Promise<WordPressPage | null> {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'wordpress');

        if (!credentials || !credentials.site_url || !credentials.username || !credentials.application_password) {
            console.warn('WordPress credentials missing');
            return null;
        }

        const { site_url, username, application_password } = credentials as unknown as WordPressCredentials;

        const auth = Buffer.from(`${username}:${application_password}`).toString('base64');

        const response = await fetch(
            `${site_url}${WORDPRESS_API_BASE}/pages?slug=${slug}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`WordPress API Error (${response.status}):`, errorText);
            return null;
        }

        const pages = await response.json();
        return pages.length > 0 ? pages[0] : null;
    } catch (error) {
        console.error('Error fetching WordPress page:', error);
        return null;
    }
}

/**
 * Update a WordPress page
 */
export async function updateWordPressPage(
    projectId: string,
    pageId: number,
    title: string,
    content: string
): Promise<boolean> {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'wordpress');

        if (!credentials || !credentials.site_url || !credentials.username || !credentials.application_password) {
            console.warn('WordPress credentials missing');
            return false;
        }

        const { site_url, username, application_password } = credentials as unknown as WordPressCredentials;

        const auth = Buffer.from(`${username}:${application_password}`).toString('base64');

        const response = await fetch(
            `${site_url}${WORDPRESS_API_BASE}/pages/${pageId}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    content,
                    status: 'publish',
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to update WordPress page (${response.status}):`, errorText);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating WordPress page:', error);
        return false;
    }
}

/**
 * Create a new WordPress page
 */
export async function createWordPressPage(
    projectId: string,
    title: string,
    content: string,
    slug: string
): Promise<number | null> {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'wordpress');

        if (!credentials || !credentials.site_url || !credentials.username || !credentials.application_password) {
            console.warn('WordPress credentials missing');
            return null;
        }

        const { site_url, username, application_password } = credentials as unknown as WordPressCredentials;

        const auth = Buffer.from(`${username}:${application_password}`).toString('base64');

        const response = await fetch(
            `${site_url}${WORDPRESS_API_BASE}/pages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    content,
                    slug,
                    status: 'publish',
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to create WordPress page (${response.status}):`, errorText);
            return null;
        }

        const page = await response.json();
        return page.id;
    } catch (error) {
        console.error('Error creating WordPress page:', error);
        return null;
    }
}
