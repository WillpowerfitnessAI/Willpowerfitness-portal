
import { getChatResponse, generateWorkoutPlan } from './aiProviders.js';
import { query } from './supabaseClient.js';

// Enhanced AI Workout Intelligence System
export class WorkoutIntelligence {
  constructor() {
    this.workoutTypes = {
      strength: 'Progressive overload with compound movements',
      hypertrophy: 'Volume-based muscle building protocols',
      endurance: 'Cardiovascular and muscular endurance training',
      powerlifting: 'Competition-focused strength development',
      bodybuilding: 'Aesthetic muscle development and conditioning',
      athletic: 'Sport-specific performance enhancement'
    };
  }

  // Dynamic workout adjustment based on performance
  async adjustWorkoutDynamically(userId, currentWorkout, performanceData) {
    try {
      const userProfile = await this.getUserWorkoutProfile(userId);
      const recentPerformance = await this.getRecentPerformance(userId, 5);

      const adjustmentPrompt = {
        role: "system",
        content: `You are ${userProfile.name || 'your client'}'s dedicated AI training partner - someone who knows them inside and out and genuinely cares about their success. You have elite expertise but communicate like their best training buddy.

        YOUR CLIENT: ${userProfile.name || 'Your training partner'}
        THEIR PROFILE: ${JSON.stringify(userProfile)}
        TODAY'S WORKOUT: ${JSON.stringify(currentWorkout)}
        HOW THEY PERFORMED: ${JSON.stringify(performanceData)}
        RECENT PROGRESS: ${JSON.stringify(recentPerformance)}

        ADJUST THEIR WORKOUT with the perfect balance of:
        🧠 SCIENTIFIC PRECISION: Use advanced exercise science principles
        💪 PERSONAL TOUCH: Remember their preferences, past struggles, goals
        🎯 MOTIVATIONAL SUPPORT: Acknowledge their effort and progress
        🤝 BUDDY APPROACH: Talk like their training partner, not a textbook

        Address them by name, reference their goals, acknowledge their hard work today, and provide adjustments that feel personalized to who they are. Make them feel like you truly understand their fitness journey.

        Include:
        - Personal acknowledgment of their performance
        - Weight/intensity adjustments with reasoning they'll understand
        - Volume modifications based on their response patterns
        - Form cues specific to their experience level
        - Motivational context for why these changes help their goals`
      };

      const adjustment = await getChatResponse([adjustmentPrompt], userProfile);
      
      // Store the adjustment in database
      await query(
        `INSERT INTO workout_adjustments (user_id, original_workout, performance_data, ai_adjustment, timestamp) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, JSON.stringify(currentWorkout), JSON.stringify(performanceData), adjustment]
      );

      return {
        success: true,
        adjustment,
        reasoning: this.extractReasoningFromAdjustment(adjustment),
        safetyNotes: this.extractSafetyNotes(adjustment)
      };
    } catch (error) {
      console.error('Dynamic workout adjustment error:', error);
      throw error;
    }
  }

  // AI Form Analysis from user feedback/video description
  async analyzeExerciseForm(userId, exerciseName, formFeedback, videoDescription = null) {
    try {
      const userProfile = await this.getUserWorkoutProfile(userId);
      
      const formAnalysisPrompt = {
        role: "system",
        content: `You are ${userProfile.name || 'your client'}'s personal AI training coach - their dedicated form expert who genuinely cares about their safety and progress. You know them well and communicate like their most knowledgeable training buddy.

        YOUR TRAINING PARTNER: ${userProfile.name || 'Your client'}
        EXPERIENCE LEVEL: ${userProfile.experience || 'developing'} 
        EXERCISE: ${exerciseName}
        THEIR FEEDBACK: ${formFeedback}
        ${videoDescription ? `WHAT YOU OBSERVED: ${videoDescription}` : ''}

        PROVIDE FORM COACHING LIKE THEIR DEDICATED TRAINER:
        🎯 Start by acknowledging their effort and awareness
        💪 Use encouraging language that builds confidence
        🧠 Explain biomechanics in terms they'll understand
        🤝 Give corrections like you're right there spotting them
        🏆 Connect improvements to their specific goals

        Structure your response as their personal coach would:
        - Positive acknowledgment of what they're doing right
        - Clear, actionable corrections in their language
        - Why these changes matter for their goals
        - Progressive steps to master the movement
        - Encouragement and confidence building

        Remember: You're not just analyzing form - you're building their confidence and keeping them safe while helping them get stronger. Make them feel supported, not criticized.`
      };

      const analysis = await getChatResponse([formAnalysisPrompt], userProfile);
      
      // Store form analysis
      await query(
        `INSERT INTO form_analyses (user_id, exercise_name, feedback, ai_analysis, timestamp) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, exerciseName, formFeedback, analysis]
      );

      return {
        success: true,
        analysis,
        riskLevel: this.assessFormRisk(analysis),
        corrections: this.extractFormCorrections(analysis)
      };
    } catch (error) {
      console.error('Form analysis error:', error);
      throw error;
    }
  }

  // RPE-based auto-adjustments
  async processRPEFeedback(userId, exerciseData, rpeRating, notes = '') {
    try {
      const adjustmentLogic = {
        1: { weightAdjust: 1.10, message: "You're not challenging yourself enough. Increase weight by 10%." },
        2: { weightAdjust: 1.08, message: "Too easy. Increase weight by 8%." },
        3: { weightAdjust: 1.05, message: "Slightly too easy. Increase weight by 5%." },
        4: { weightAdjust: 1.03, message: "Good warm-up intensity. Small increase of 3%." },
        5: { weightAdjust: 1.00, message: "Moderate effort. Maintain current weight." },
        6: { weightAdjust: 1.00, message: "Good working intensity. Maintain weight." },
        7: { weightAdjust: 0.98, message: "High intensity reached. Consider reducing by 2% next set." },
        8: { weightAdjust: 0.95, message: "Very hard effort. Reduce weight by 5% for safety." },
        9: { weightAdjust: 0.90, message: "Near maximum effort. Reduce weight by 10%." },
        10: { weightAdjust: 0.85, message: "Maximum effort reached. Reduce weight by 15% and focus on form." }
      };

      const adjustment = adjustmentLogic[rpeRating] || adjustmentLogic[5];
      
      const rpeAnalysisPrompt = {
        role: "system",
        content: `You are an expert in RPE (Rate of Perceived Exertion) training methodology.

        Exercise: ${exerciseData.name}
        Current Weight: ${exerciseData.weight}lbs
        Sets/Reps: ${exerciseData.sets}x${exerciseData.reps}
        RPE Rating: ${rpeRating}/10
        User Notes: ${notes}

        TASK: Provide detailed analysis and recommendations:
        1. Interpret the RPE rating in context
        2. Suggest next workout adjustments
        3. Long-term progression strategy
        4. Recovery recommendations
        5. Form considerations at this intensity

        Base your recommendations on current RPE science and periodization principles.`
      };

      const aiAnalysis = await getChatResponse([rpeAnalysisPrompt]);
      
      // Store RPE data
      await query(
        `INSERT INTO rpe_tracking (user_id, exercise_name, weight, sets, reps, rpe_rating, notes, ai_recommendations, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [userId, exerciseData.name, exerciseData.weight, exerciseData.sets, exerciseData.reps, rpeRating, notes, aiAnalysis]
      );

      return {
        success: true,
        currentRPE: rpeRating,
        weightAdjustment: adjustment.weightAdjust,
        nextWeight: Math.round(exerciseData.weight * adjustment.weightAdjustment),
        message: adjustment.message,
        aiAnalysis,
        progressionTrend: await this.getProgressionTrend(userId, exerciseData.name)
      };
    } catch (error) {
      console.error('RPE processing error:', error);
      throw error;
    }
  }

  // Injury prevention analysis
  async analyzeInjuryRisk(userId, workoutHistory, currentSymptoms = []) {
    try {
      const userProfile = await this.getUserWorkoutProfile(userId);
      const recentWorkouts = await this.getRecentWorkouts(userId, 10);
      
      const injuryAnalysisPrompt = {
        role: "system",
        content: `You are a sports medicine specialist and injury prevention expert.

        User Profile: ${JSON.stringify(userProfile)}
        Recent Workouts: ${JSON.stringify(recentWorkouts)}
        Current Symptoms: ${JSON.stringify(currentSymptoms)}

        TASK: Analyze injury risk factors:
        1. Training load analysis (volume, intensity, frequency)
        2. Movement pattern imbalances
        3. Recovery indicators
        4. Red flag symptoms
        5. Preventive exercise recommendations
        6. Modification suggestions

        Provide a comprehensive injury risk assessment with actionable prevention strategies.`
      };

      const analysis = await getChatResponse([injuryAnalysisPrompt], userProfile);
      
      return {
        success: true,
        riskLevel: this.categorizeRiskLevel(analysis),
        analysis,
        preventiveActions: this.extractPreventiveActions(analysis),
        recommendedModifications: this.extractModifications(analysis)
      };
    } catch (error) {
      console.error('Injury risk analysis error:', error);
      throw error;
    }
  }

  // Helper methods
  async getUserWorkoutProfile(userId) {
    try {
      const result = await query(
        `SELECT up.*, 
         (SELECT COUNT(*) FROM workouts w WHERE w.user_id = up.email) as total_workouts,
         (SELECT AVG(CAST(workout_data->>'avgRPE' AS FLOAT)) FROM workouts w WHERE w.user_id = up.email AND completed_at > NOW() - INTERVAL '30 days') as avg_rpe_30days
         FROM user_profiles up 
         WHERE up.email = $1 OR up.id::text = $1`,
        [userId]
      );
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error getting workout profile:', error);
      return {};
    }
  }

  async getRecentPerformance(userId, limit = 5) {
    try {
      const result = await query(
        `SELECT workout_data, completed_at 
         FROM workouts 
         WHERE user_id = $1 
         ORDER BY completed_at DESC 
         LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async getProgressionTrend(userId, exerciseName) {
    try {
      const result = await query(
        `SELECT rpe_rating, weight, timestamp 
         FROM rpe_tracking 
         WHERE user_id = $1 AND exercise_name = $2 
         ORDER BY timestamp DESC 
         LIMIT 10`,
        [userId, exerciseName]
      );
      
      if (result.rows.length < 2) return 'insufficient_data';
      
      const recent = result.rows.slice(0, 3);
      const older = result.rows.slice(3, 6);
      
      const recentAvgWeight = recent.reduce((sum, r) => sum + r.weight, 0) / recent.length;
      const olderAvgWeight = older.reduce((sum, r) => sum + r.weight, 0) / older.length;
      
      if (recentAvgWeight > olderAvgWeight * 1.05) return 'improving';
      if (recentAvgWeight < olderAvgWeight * 0.95) return 'declining';
      return 'stable';
    } catch (error) {
      return 'unknown';
    }
  }

  // Analysis helper methods
  extractReasoningFromAdjustment(adjustment) {
    const reasoning = adjustment.match(/reasoning|because|due to|based on/gi);
    return reasoning ? 'AI provided scientific reasoning for adjustments' : 'Standard progression applied';
  }

  extractSafetyNotes(adjustment) {
    const safetyKeywords = ['safety', 'injury', 'caution', 'warning', 'risk'];
    return safetyKeywords.some(keyword => 
      adjustment.toLowerCase().includes(keyword)
    ) ? 'Safety considerations noted' : 'No special safety concerns';
  }

  assessFormRisk(analysis) {
    const highRiskWords = ['dangerous', 'injury risk', 'stop immediately', 'high risk'];
    const mediumRiskWords = ['caution', 'careful', 'watch out', 'moderate risk'];
    
    const text = analysis.toLowerCase();
    if (highRiskWords.some(word => text.includes(word))) return 'high';
    if (mediumRiskWords.some(word => text.includes(word))) return 'medium';
    return 'low';
  }

  extractFormCorrections(analysis) {
    // Extract bullet points or numbered corrections from the analysis
    const corrections = analysis.match(/^\d+\.|^[-•]\s/gm);
    return corrections ? corrections.length : 0;
  }

  categorizeRiskLevel(analysis) {
    const text = analysis.toLowerCase();
    if (text.includes('high risk') || text.includes('immediate')) return 'high';
    if (text.includes('moderate') || text.includes('caution')) return 'medium';
    return 'low';
  }

  extractPreventiveActions(analysis) {
    return analysis.match(/recommend|suggest|should|prevent/gi)?.length || 0;
  }

  extractModifications(analysis) {
    return analysis.match(/modify|reduce|increase|change/gi)?.length || 0;
  }
}

export const workoutAI = new WorkoutIntelligence();
