
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

// Get user profile
export async function getUserProfile(userId) {
  try {
    // First try to find by email or id, then create if not exists
    let { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`id.eq.${userId},email.eq.${userId}`)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create a new one
      const { data: newData, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          email: userId.includes('@') ? userId : null,
          name: 'New User',
          goal: 'general_fitness'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      return newData;
    }

    if (error) throw error;
    return data || { id: userId, name: 'New User', goal: 'general_fitness' };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { id: userId, name: 'New User', goal: 'general_fitness' };
  }
}

// Store user preferences and profile data
export async function updateUserProfile(userId, profileData) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Log workout session
export async function logWorkout(userId, workoutData) {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        workout_data: workoutData,
        completed_at: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging workout:', error);
    throw error;
  }
}

// Get workout history
export async function getWorkoutHistory(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
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
