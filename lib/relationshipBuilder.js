
// AI Relationship Building System
// Helps the AI coach build genuine connections with clients

import { query } from './supabaseClient.js';

export class RelationshipBuilder {
  constructor() {
    this.personalityTraits = {
      motivational_style: ['encouraging', 'tough_love', 'analytical', 'playful'],
      communication_preference: ['detailed', 'concise', 'visual', 'conversational'],
      celebration_style: ['enthusiastic', 'achievement_focused', 'progress_oriented', 'milestone_based']
    };
  }

  // Track personal details about the client
  async updateClientPersonality(userId, interactionData) {
    try {
      const insights = await this.analyzeInteraction(interactionData);
      
      await query(
        `UPDATE user_profiles 
         SET memory = memory || $2::jsonb
         WHERE (email = $1 OR id::text = $1)`,
        [userId, JSON.stringify({
          last_interaction: new Date().toISOString(),
          personality_insights: insights,
          interaction_count: (await this.getInteractionCount(userId)) + 1
        })]
      );

      return insights;
    } catch (error) {
      console.error('Error updating client personality:', error);
      return null;
    }
  }

  // Analyze how client likes to be motivated
  analyzeInteraction(interactionData) {
    const { message, response, sentiment, topics } = interactionData;
    
    const insights = {
      preferred_topics: topics || [],
      response_style: this.detectResponseStyle(message),
      motivation_triggers: this.detectMotivationTriggers(message),
      engagement_level: this.assessEngagement(message, response)
    };

    return insights;
  }

  detectResponseStyle(message) {
    if (message.length > 100) return 'detailed_communicator';
    if (message.includes('?')) return 'question_oriented';
    if (message.toLowerCase().includes('thanks') || message.toLowerCase().includes('appreciate')) return 'appreciative';
    return 'direct_communicator';
  }

  detectMotivationTriggers(message) {
    const triggers = [];
    if (message.toLowerCase().includes('goal') || message.toLowerCase().includes('target')) triggers.push('goal_oriented');
    if (message.toLowerCase().includes('progress') || message.toLowerCase().includes('improvement')) triggers.push('progress_focused');
    if (message.toLowerCase().includes('challenge') || message.toLowerCase().includes('push')) triggers.push('challenge_seeker');
    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('support')) triggers.push('support_seeker');
    return triggers;
  }

  assessEngagement(message, response) {
    const messageLength = message.length;
    const hasQuestions = message.includes('?');
    const hasEmotions = /[!😊💪🎯🏋️]/.test(message);
    
    if (messageLength > 50 && (hasQuestions || hasEmotions)) return 'highly_engaged';
    if (messageLength > 20) return 'moderately_engaged';
    return 'low_engagement';
  }

  async getInteractionCount(userId) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM conversations WHERE user_id = $1`,
        [userId]
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      return 0;
    }
  }

  // Generate personalized coaching context
  async getPersonalizedContext(userId) {
    try {
      const profile = await query(
        `SELECT name, goal, memory, subscription_start FROM user_profiles 
         WHERE (email = $1 OR id::text = $1)`,
        [userId]
      );

      if (profile.rows.length === 0) return {};

      const user = profile.rows[0];
      const memory = user.memory || {};
      
      // Calculate relationship length
      const subscriptionStart = new Date(user.subscription_start || Date.now());
      const daysTogether = Math.floor((Date.now() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24));

      // Get recent progress
      const recentWorkouts = await query(
        `SELECT COUNT(*) as count FROM workouts 
         WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '7 days'`,
        [userId]
      );

      return {
        name: user.name,
        goal: user.goal,
        daysTogether,
        recentWorkouts: parseInt(recentWorkouts.rows[0].count) || 0,
        personalityInsights: memory.personality_insights || {},
        interactionCount: memory.interaction_count || 0,
        lastInteraction: memory.last_interaction,
        motivationStyle: this.getPreferredMotivationStyle(memory),
        relationshipStage: this.determineRelationshipStage(daysTogether, memory.interaction_count || 0)
      };
    } catch (error) {
      console.error('Error getting personalized context:', error);
      return {};
    }
  }

  getPreferredMotivationStyle(memory) {
    const triggers = memory.personality_insights?.motivation_triggers || [];
    if (triggers.includes('challenge_seeker')) return 'challenging';
    if (triggers.includes('support_seeker')) return 'supportive';
    if (triggers.includes('goal_oriented')) return 'goal_focused';
    return 'encouraging';
  }

  determineRelationshipStage(daysTogether, interactionCount) {
    if (daysTogether < 7 || interactionCount < 5) return 'getting_to_know';
    if (daysTogether < 30 || interactionCount < 20) return 'building_trust';
    if (daysTogether < 90 || interactionCount < 50) return 'established_partnership';
    return 'long_term_companion';
  }

  // Generate relationship-aware response context
  generateResponseContext(personalizedContext) {
    const { name, daysTogether, relationshipStage, motivationStyle, recentWorkouts } = personalizedContext;
    
    let relationshipContext = `You've been training with ${name} for ${daysTogether} days. `;
    
    switch (relationshipStage) {
      case 'getting_to_know':
        relationshipContext += "You're still getting to know each other, so be warm but professional. Ask questions to learn about their preferences.";
        break;
      case 'building_trust':
        relationshipContext += "You're building a strong foundation. Reference past conversations and show you remember their goals and challenges.";
        break;
      case 'established_partnership':
        relationshipContext += "You have a solid training relationship. You can be more casual, use inside jokes, and reference their progress journey.";
        break;
      case 'long_term_companion':
        relationshipContext += "You're their trusted long-term training partner. You know them well, can predict their needs, and should feel like their fitness best friend.";
        break;
    }

    relationshipContext += ` They prefer ${motivationStyle} motivation. They've worked out ${recentWorkouts} times this week.`;
    
    return relationshipContext;
  }
}

export const relationshipBuilder = new RelationshipBuilder();
