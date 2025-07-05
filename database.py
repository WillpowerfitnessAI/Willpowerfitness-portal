
import sqlite3
import json
from datetime import datetime
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path="willpower_fitness.db"):
        self.db_path = db_path
        self.init_database()
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        try:
            yield conn
        finally:
            conn.close()
    
    def init_database(self):
        """Initialize database with proper schema"""
        with self.get_connection() as conn:
            # Users table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT,
                    goal TEXT,
                    source TEXT DEFAULT 'website',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Messages table for conversation history
            conn.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            # Customers table for paying members
            conn.execute('''
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    subscription_id TEXT,
                    status TEXT DEFAULT 'active',
                    monthly_amount DECIMAL DEFAULT 225.00,
                    fitness_goals TEXT,
                    experience_level TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Orders table for t-shirt fulfillment
            conn.execute('''
                CREATE TABLE IF NOT EXISTS tshirt_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_email TEXT NOT NULL,
                    size TEXT NOT NULL,
                    shipping_address TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    printful_order_id TEXT,
                    tracking_number TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    shipped_at TIMESTAMP,
                    FOREIGN KEY (customer_email) REFERENCES customers (email)
                )
            ''')
            
            # Knowledge base table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    source TEXT DEFAULT 'manual',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Leads table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS leads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT,
                    phone TEXT,
                    goals TEXT,
                    experience TEXT,
                    message TEXT,
                    source TEXT,
                    status TEXT DEFAULT 'new',
                    ai_response TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            logger.info("Database initialized successfully")
    
    def get_user(self, user_id):
        """Get user by user_id"""
        with self.get_connection() as conn:
            result = conn.execute(
                'SELECT * FROM users WHERE user_id = ?', (user_id,)
            ).fetchone()
            return dict(result) if result else None
    
    def create_user(self, user_id, name, goal, email=None, source='website'):
        """Create new user"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO users (user_id, name, email, goal, source, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (user_id, name, email, goal, source))
            conn.commit()
            logger.info(f"User created: {user_id} - {name}")
    
    def get_user_messages(self, user_id, limit=50):
        """Get conversation history for user"""
        with self.get_connection() as conn:
            results = conn.execute('''
                SELECT role, content, timestamp FROM messages 
                WHERE user_id = ? 
                ORDER BY timestamp DESC LIMIT ?
            ''', (user_id, limit)).fetchall()
            return [dict(row) for row in reversed(results)]
    
    def add_message(self, user_id, role, content):
        """Add message to conversation history"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO messages (user_id, role, content)
                VALUES (?, ?, ?)
            ''', (user_id, role, content))
            conn.commit()
    
    def create_customer(self, email, name, subscription_id=None, **kwargs):
        """Create paying customer"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO customers 
                (email, name, subscription_id, fitness_goals, experience_level)
                VALUES (?, ?, ?, ?, ?)
            ''', (email, name, subscription_id, 
                  kwargs.get('fitness_goals'), kwargs.get('experience_level')))
            conn.commit()
            logger.info(f"Customer created: {email}")
    
    def create_tshirt_order(self, customer_email, size, shipping_address):
        """Create t-shirt order"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO tshirt_orders (customer_email, size, shipping_address)
                VALUES (?, ?, ?)
            ''', (customer_email, size, shipping_address))
            conn.commit()
            logger.info(f"T-shirt order created for {customer_email}")
    
    def add_knowledge(self, topic, question, answer, category='general', source='manual'):
        """Add to knowledge base"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO knowledge_base (topic, question, answer, category, source)
                VALUES (?, ?, ?, ?, ?)
            ''', (topic, question, answer, category, source))
            conn.commit()
    
    def search_knowledge(self, query, limit=5):
        """Search knowledge base"""
        with self.get_connection() as conn:
            # Simple text search - can be enhanced with FTS
            results = conn.execute('''
                SELECT topic, question, answer, category, source FROM knowledge_base 
                WHERE question LIKE ? OR answer LIKE ? OR topic LIKE ?
                ORDER BY created_at DESC LIMIT ?
            ''', (f'%{query}%', f'%{query}%', f'%{query}%', limit)).fetchall()
            return [dict(row) for row in results]
    
    def create_lead(self, email, **kwargs):
        """Create lead from form submission"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO leads 
                (email, name, phone, goals, experience, message, source, ai_response)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (email, kwargs.get('name'), kwargs.get('phone'), 
                  kwargs.get('goals'), kwargs.get('experience'), 
                  kwargs.get('message'), kwargs.get('source'), 
                  kwargs.get('ai_response')))
            conn.commit()
