
import axios from 'axios';

async function testUpdateConditioner() {
    const productId = 'fb79cf25-b514-4c30-8798-6917aa9603e3'; // Conditioner UUID
    const url = `http://localhost:3000/api/projects/f8a483e6-e9c5-43be-a760-b9df72f7d566/commerce/products/${productId}`;

    console.log(`Testing update for conditioner ${productId}...`);

    try {
        const response = await axios.put(url, {
            name: "Moringa & Keratin Conditioner",
            description: "Deeply hydrates, strengthens, and smooths hair structure. (UPDATED VIA CCC API TEST)",
            regular_price: "385",
            meta_data: [
                { key: 'price_ils', value: '42' },
                { key: 'name_he', value: 'קונדישינר מורינגה וקראטין (מעודכן)' },
                { key: 'description_he', value: 'נוסחה הוליסטית להזנה ושיקום השיער.' }
            ]
        }, {
            headers: {
                'Cookie': 'sb-psswhtcpjenmbztlbilo-auth-token=...;' // This might fail without a real session
            }
        });

        console.log('Update Success:', response.data.description);
    } catch (error: any) {
        console.error('Update Failed:', error.response?.data || error.message);
    }
}

testUpdateConditioner();
