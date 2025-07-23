
import { supabase } from './supabaseClient.js';

// Store conversation in user's memory
export async function storeConversation(userId, message, response, context = {}) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        user_message: message,
        ai_response: response,
        context: context,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing conversation:', error);
    throw error;
  }
}

// Retrieve user's conversation history
export async function getConversationHistory(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.reverse() || []; // Return in chronological order
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

// Store user preferences and profile data
export async function updateUserProfile(userId, profileData) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Get user profile and preferences
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Store workout logs
export async function logWorkout(userId, workoutData) {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        ...workoutData,
        logged_at: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging workout:', error);
    throw error;
  }
}

// Get workout history
export async function getWorkoutHistory(userId, limit = 30) {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching workout history:', error);
    return [];
  }
}

// Export user data (for GDPR compliance)
export async function exportUserData(userId) {
  try {
    const [profile, conversations, workouts] = await Promise.all([
      getUserProfile(userId),
      getConversationHistory(userId, 1000), // Export all conversations
      getWorkoutHistory(userId, 1000) // Export all workouts
    ]);

    return {
      profile,
      conversations,
      workouts,
      exportedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}
