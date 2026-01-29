
import axios from 'axios';

async function testBackendUpdate() {
    const productId = 'fb79cf25-b514-4c30-8798-6917aa9603e3'; // Conditioner UUID
    const url = `http://localhost:10000/wp-json/wc/v3/products/${productId}`;
    const auth = Buffer.from('ck_test_12345:cs_test_67890').toString('base64');

    console.log(`Testing update for conditioner ${productId}...`);

    try {
        const response = await axios.put(url, {
            name: "Moringa & Keratin Conditioner",
            description: "Restore vitality and softness with our holistic conditioning formula. This conditioner deeply hydrates, strengthens, and smooths hair structure without the use of harmful chemicals. Enriched with Hydrolyzed Keratin and nutrient-rich oils, it penetrates the hair shaft to prevent breakage and control excess oil, leaving your hair feeling soft, smooth, and naturally balanced.",
            regular_price: "385",
            meta_data: [
                { key: 'price_ils', value: '42' },
                { key: 'name_he', value: 'קונדישינר מורינגה וקראטין' },
                { key: 'description_he', value: 'נוסחה הוליסטית להזנה ושיקום השיער. מועשר בקראטין ושמנים מזינים.' }
            ]
        }, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Backend response status:', response.status);
        console.log('Updated Description in Response:', response.data.description);
    } catch (error: any) {
        console.error('Error updating backend:', error.response?.data || error.message);
    }
}

testBackendUpdate();
