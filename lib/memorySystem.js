import { supabase } from './supabaseClient.js';

// Get user profile - handle both email and proper UUID
export async function getUserProfile(userId) {
  try {
    let { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`id.eq.${userId},email.eq.${userId}`)
      .maybeSingle();

    if (!data && !error) {
      // Create new profile if doesn't exist
      const { data: newData, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          email: userId.includes('@') ? userId : `${userId}@demo.com`,
          name: 'New User',
          goal: 'general_fitness'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return { id: userId, name: 'New User', goal: 'general_fitness' };
      }
      return newData;
    }

    if (error) {
      console.error('Error fetching profile:', error);
      return { id: userId, name: 'New User', goal: 'general_fitness' };
    }

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
        ...profileData
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Get conversation history
export async function getConversationHistory(userId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

// Store conversation
export async function storeConversation(userId, userMessage, aiResponse, context = {}) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        user_message: userMessage,
        ai_response: aiResponse,
        context: context
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error storing conversation:', error);
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
        workout_data: workoutData
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error logging workout:', error);
    throw error;
  }
}

// Get workout history
export async function getWorkoutHistory(userId, limit = 10) {
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