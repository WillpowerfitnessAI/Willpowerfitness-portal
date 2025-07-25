
-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create leads table  
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    goals TEXT,
    experience TEXT,
    message TEXT,
    source TEXT,
    status TEXT,
    ai_response TEXT,
    payment_link TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  goal TEXT,
  memory JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Create workout history table
CREATE TABLE workouts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  workout_data JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced AI Workout Intelligence tables
CREATE TABLE IF NOT EXISTS workout_adjustments (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_workout JSONB NOT NULL,
    performance_data JSONB NOT NULL,
    ai_adjustment TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_analyses (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    feedback TEXT NOT NULL,
    ai_analysis TEXT NOT NULL,
    risk_level TEXT DEFAULT 'low',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rpe_tracking (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    weight DECIMAL(6,2),
    sets INTEGER,
    reps INTEGER,
    rpe_rating INTEGER CHECK (rpe_rating >= 1 AND rpe_rating <= 10),
    notes TEXT,
    ai_recommendations TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Tracking Dashboard tables
CREATE TABLE IF NOT EXISTS progress_tracking (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    metrics JSONB NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    metric_type TEXT DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS progress_reports (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    report_data JSONB NOT NULL,
    timeframe TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress_photos (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    photo_metadata JSONB NOT NULL,
    analysis_notes TEXT,
    taken_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_goals (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    achieved_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS milestone_achievements (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    goal_id INTEGER REFERENCES user_goals(id),
    achievement_type TEXT NOT NULL,
    description TEXT NOT NULL,
    value_achieved DECIMAL(10,2),
    achieved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- New indexes for enhanced features
CREATE INDEX IF NOT EXISTS idx_workout_adjustments_user_id ON workout_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_adjustments_timestamp ON workout_adjustments(timestamp);
CREATE INDEX IF NOT EXISTS idx_form_analyses_user_id ON form_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_form_analyses_exercise ON form_analyses(exercise_name);
CREATE INDEX IF NOT EXISTS idx_rpe_tracking_user_id ON rpe_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rpe_tracking_exercise ON rpe_tracking(exercise_name);
CREATE INDEX IF NOT EXISTS idx_rpe_tracking_timestamp ON rpe_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id ON progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_type ON progress_tracking(metric_type);
CREATE INDEX IF NOT EXISTS idx_progress_reports_user_id ON progress_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_achievements_user_id ON milestone_achievements(user_id);
