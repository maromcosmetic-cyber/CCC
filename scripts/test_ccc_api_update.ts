
import axios from 'axios';

async function testCccUpdate() {
    const projectId = 'b913e42d-2ef2-4658-a613-b7d7bbe3b401';
    const cccProductId = '5d9c538b-2946-4f81-8321-2968d5d7749f'; // Moringa & Keratin Conditioner in CCC
    const url = `http://localhost:3000/api/projects/${projectId}/commerce/products/${cccProductId}`;

    // We need auth? Yes, but usually local dev doesn't check JWT if we are lucky, 
    // or we can use the service role key if the middleware allows it.
    // Actually requireAuth middleware usually checks session.
    // For testing, I'll try to find a way to bypass or use a real session token.

    try {
        console.log('Updating product via CCC API...');
        const response = await axios.put(url, {
            description: `TEST UPDATE FROM CCC API AT ${new Date().toISOString()}`,
            name_he: 'קונדישינר מורינגה וקראטין (SYNC OK)'
        }, {
            headers: {
                'Content-Type': 'application/json',
                // We'll see if it fails with 401
            }
        });

        console.log('CCC API Response:', response.status);
    } catch (error: any) {
        console.error('CCC API Error:', error.response?.status, error.response?.data || error.message);
    }
}

testCccUpdate();
