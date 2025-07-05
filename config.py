
import os
import logging
from datetime import datetime

class Config:
    # API Keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    STRIPE_SECRET_KEY = os.getenv("Stripe_payment_key")
    PRINTFUL_API_KEY = os.getenv("PRINTFUL_API_KEY")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jxylbuwtjvsdavetryjx.supabase.co")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    # App Configuration
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    PORT = int(os.getenv("PORT", 5000))
    HOST = "0.0.0.0"
    
    # Business Configuration
    MEMBERSHIP_PRICE = 225
    STRIPE_PAYMENT_LINK = "https://buy.stripe.com/4gw8wVcGh0qkc4o7ss"
    
    # File paths
    DATABASE_PATH = "willpower_fitness.db"
    UPLOAD_FOLDER = "attached_assets/uploads"
    
    @classmethod
    def validate_required_keys(cls):
        """Validate that required environment variables are set"""
        required = ['GROQ_API_KEY']
        missing = [key for key in required if not getattr(cls, key)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {missing}")
        
        return True

def setup_logging():
    """Configure application logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('willpower_fitness.log')
        ]
    )
    
    # Reduce noise from external libraries
    logging.getLogger('requests').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
