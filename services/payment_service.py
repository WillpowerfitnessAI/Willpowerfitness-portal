
import os
import requests
import stripe
import logging
from datetime import datetime
from database import Database

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self, db: Database):
        self.db = db
        self.stripe_secret_key = os.getenv("Stripe_payment_key")
        self.printful_api_key = os.getenv("PRINTFUL_API_KEY")
        
        if self.stripe_secret_key:
            stripe.api_key = self.stripe_secret_key
    
    def create_payment_link(self, customer_email, customer_name="Customer"):
        """Create Stripe payment link"""
        return "https://buy.stripe.com/4gw8wVcGh0qkc4o7ss"
    
    def process_stripe_webhook(self, event_data):
        """Process Stripe webhook events"""
        try:
            if event_data['type'] == 'checkout.session.completed':
                session = event_data['data']['object']
                customer_email = session.get('customer_details', {}).get('email')
                customer_name = session.get('customer_details', {}).get('name', 'New Member')
                
                # Extract custom fields
                custom_fields = session.get('custom_fields', [])
                tshirt_size = None
                shipping_address = None
                fitness_goals = None
                experience_level = None
                
                for field in custom_fields:
                    if field.get('key') == 'tshirt_size':
                        tshirt_size = field.get('dropdown', {}).get('value')
                    elif field.get('key') == 'shipping_address':
                        shipping_address = field.get('text', {}).get('value')
                    elif field.get('key') == 'fitness_goals':
                        fitness_goals = field.get('text', {}).get('value')
                    elif field.get('key') == 'experience_level':
                        experience_level = field.get('dropdown', {}).get('value')
                
                if customer_email:
                    # Create customer record
                    self.db.create_customer(
                        email=customer_email,
                        name=customer_name,
                        subscription_id=session.get('subscription'),
                        fitness_goals=fitness_goals,
                        experience_level=experience_level
                    )
                    
                    # Create t-shirt order if info provided
                    if tshirt_size and shipping_address:
                        self.db.create_tshirt_order(
                            customer_email, tshirt_size, shipping_address
                        )
                        
                        # Send to Printful
                        self.create_printful_order(
                            customer_email, tshirt_size, shipping_address, customer_name
                        )
                    
                    logger.info(f"New customer processed: {customer_email}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            return False
    
    def create_printful_order(self, customer_email, size, shipping_address, customer_name):
        """Create Printful order for t-shirt"""
        if not self.printful_api_key:
            logger.warning("PRINTFUL_API_KEY not set")
            return None
        
        try:
            # Parse address
            address_lines = [line.strip() for line in shipping_address.split('\n') if line.strip()]
            address1 = address_lines[0] if address_lines else shipping_address
            
            # Extract city, state, zip (simplified)
            if len(address_lines) >= 2:
                last_line = address_lines[-1]
                import re
                match = re.match(r'(.+?),?\s+([A-Z]{2})\s+(\d{5})', last_line)
                if match:
                    city, state_code, zip_code = match.groups()
                else:
                    city, state_code, zip_code = "Los Angeles", "CA", "90210"
            else:
                city, state_code, zip_code = "Los Angeles", "CA", "90210"
            
            # Size mapping
            size_variants = {
                "S": 4011, "M": 4012, "L": 4013, "XL": 4014, "XXL": 4015
            }
            variant_id = size_variants.get(size, 4012)
            
            # Order payload
            order_data = {
                "recipient": {
                    "name": customer_name,
                    "address1": address1,
                    "city": city,
                    "state_code": state_code,
                    "country_code": "US",
                    "zip": zip_code
                },
                "items": [{
                    "variant_id": variant_id,
                    "quantity": 1,
                    "files": [{
                        "type": "front",
                        "url": "https://trainerai-groqapp-willpowerfitness.replit.app/attached_assets/WillPowerFitness%20Profile%20Image_1751491136331.png"
                    }]
                }],
                "external_id": f"willpower_{customer_email}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                "shipping": "STANDARD"
            }
            
            response = requests.post(
                "https://api.printful.com/orders",
                headers={
                    "Authorization": f"Bearer {self.printful_api_key}",
                    "Content-Type": "application/json"
                },
                json=order_data
            )
            
            if response.status_code in [200, 201]:
                order_result = response.json()
                printful_order_id = order_result.get("result", {}).get("id")
                logger.info(f"Printful order created: {printful_order_id}")
                return printful_order_id
            else:
                logger.error(f"Printful order failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Printful order error: {e}")
            return None
