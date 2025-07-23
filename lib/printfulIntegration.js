
import axios from 'axios';

const printfulAPI = axios.create({
  baseURL: 'https://api.printful.com',
  headers: {
    'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Create order for new subscriber t-shirt
export async function createWelcomeShirtOrder(customerInfo, design = 'willpower-fitness') {
  try {
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
          sync_variant_id: process.env.PRINTFUL_TSHIRT_VARIANT_ID, // Set this in secrets
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
