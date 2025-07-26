import { query } from './supabaseClient.js';

// Get user profile - handle both email and proper UUID
export async function getUserProfile(userId) {
  try {
    // First check if user exists
    const result = await query(
      'SELECT * FROM user_profiles WHERE email = $1 OR id::text = $1 LIMIT 1',
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new profile if doesn't exist
    const insertResult = await query(
      `INSERT INTO user_profiles (email, name, goal, memory) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        userId.includes('@') ? userId : `${userId}@demo.com`,
        'New User',
        'general_fitness',
        '{}'
      ]
    );

    return insertResult.rows[0];
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Return default profile if database error
    return { 
      id: userId, 
      email: userId.includes('@') ? userId : `${userId}@demo.com`,
      name: 'New User', 
      goal: 'general_fitness', 
      memory: {} 
    };
  }
}

// Store user preferences and profile data
export async function updateUserProfile(userId, profileData) {
  try {
    const setClause = Object.keys(profileData)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [userId, ...Object.values(profileData)];

    const result = await query(
      `UPDATE user_profiles 
       SET ${setClause}
       WHERE email = $1 OR id::text = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      // Insert if update didn't affect any rows
      const insertResult = await query(
        `INSERT INTO user_profiles (email, ${Object.keys(profileData).join(', ')}) 
         VALUES ($1, ${Object.keys(profileData).map((_, i) => `$${i + 2}`).join(', ')})
         RETURNING *`,
        [userId.includes('@') ? userId : `${userId}@demo.com`, ...Object.values(profileData)]
      );
      return insertResult.rows[0];
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Get conversation history
export async function getConversationHistory(userId, limit = 20) {
  try {
    const result = await query(
      `SELECT * FROM conversations 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows || [];
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

// Enhanced memory system for WillpowerFitness AI
export async function storeConversation(userId, userMessage, aiResponse, context = {}) {
  try {
    await query(
      'INSERT INTO conversations (user_id, user_message, ai_response, context, timestamp) VALUES ($1, $2, $3, $4, NOW())',
      [userId, userMessage, aiResponse, JSON.stringify(context)]
    );
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
}

export async function getConversationContext(userId, limit = 10) {
  try {
    const result = await query(
      `SELECT user_message, ai_response, context, timestamp 
       FROM conversations 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return [];
  }
}

// Log workout session
export async function logWorkout(userId, workoutData) {
  try {
    const result = await query(
      `INSERT INTO workouts (user_id, workout_data) 
       VALUES ($1, $2) 
       RETURNING *`,
      [userId, JSON.stringify(workoutData)]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error logging workout:', error);
    throw error;
  }
}

// Get workout history
export async function getWorkoutHistory(userId, limit = 10) {
  try {
    const result = await query(
      `SELECT * FROM workouts 
       WHERE user_id = $1 
       ORDER BY completed_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows || [];
  } catch (error) {
    console.error('Error fetching workout history:', error);
    return [];
  }
}

// Export all user data
export async function exportUserData(userId) {
  try {
    const profile = await getUserProfile(userId);
    const conversations = await getConversationHistory(userId, 100);
    const workouts = await getWorkoutHistory(userId, 50);

    return {
      profile,
      conversations,
      workouts,
      exportDate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}