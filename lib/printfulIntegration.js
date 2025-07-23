
import axios from 'axios';

const printfulAPI = axios.create({
  baseURL: 'https://api.printful.com',
  headers: {
    'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Create order for new subscriber t-shirt
export async function createWelcomeShirtOrder(customerInfo, size = 'M', design = 'willpower-fitness') {
  try {
    // Parse variant IDs from environment variable
    // Format: {"S": "123", "M": "124", "L": "125", "XL": "126", "XXL": "127"}
    const variantIds = JSON.parse(process.env.PRINTFUL_TSHIRT_VARIANTS || '{}');
    const selectedVariantId = variantIds[size] || variantIds['M']; // Default to Medium
    
    if (!selectedVariantId) {
      throw new Error(`No variant ID found for size ${size}`);
    }

    const orderData = {
      recipient: {
        name: customerInfo.name,
        address1: customerInfo.address.line1,
        city: customerInfo.address.city,
        state_code: customerInfo.address.state,
        country_code: customerInfo.address.country,
        zip: customerInfo.address.postal_code,
      },
      items: [
        {
          sync_variant_id: selectedVariantId,
          quantity: 1,
          retail_price: "0.00", // Free welcome shirt
        }
      ],
      packing_slip: {
        message: `Welcome to WillPower Fitness! This complimentary t-shirt is our way of saying thank you for joining our fitness community. Wear it with pride as you crush your goals! 💪`,
      },
    };

    const response = await printfulAPI.post('/orders', orderData);
    return response.data.result;
  } catch (error) {
    console.error('Printful order creation error:', error);
    throw error;
  }
}

// Get available products
export async function getProducts() {
  try {
    const response = await printfulAPI.get('/sync/products');
    return response.data.result;
  } catch (error) {
    console.error('Printful products error:', error);
    throw error;
  }
}

// Confirm and submit order
export async function confirmOrder(orderId) {
  try {
    const response = await printfulAPI.post(`/orders/${orderId}/confirm`);
    return response.data.result;
  } catch (error) {
    console.error('Printful order confirmation error:', error);
    throw error;
  }
}
