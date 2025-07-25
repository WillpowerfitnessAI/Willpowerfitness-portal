
import { getChatResponse } from './aiProviders.js';
import { query } from './supabaseClient.js';

export class RecoveryWellness {
  constructor() {
    this.recoveryMetrics = {
      sleep: { optimal: 7.5, minimum: 6, maximum: 9 },
      stress: { low: 3, moderate: 6, high: 8 },
      soreness: { none: 1, mild: 3, moderate: 6, severe: 9 },
      energy: { low: 2, moderate: 5, high: 8, peak: 10 }
    };
  }

  // Daily recovery assessment
  async assessDailyRecovery(userId, recoveryData) {
    try {
      const userProfile = await this.getUserRecoveryProfile(userId);
      const recentRecovery = await this.getRecentRecoveryData(userId, 7);

      const recoveryPrompt = {
        role: "system",
        content: `You are ${userProfile.name}'s dedicated AI recovery coach - someone who genuinely cares about their wellbeing and helps them optimize their training through smart recovery.

        YOUR CLIENT: ${userProfile.name}
        TODAY'S RECOVERY DATA: ${JSON.stringify(recoveryData)}
        RECENT RECOVERY TRENDS: ${JSON.stringify(recentRecovery)}
        TRAINING GOAL: ${userProfile.goal}

        PROVIDE RECOVERY COACHING like their wellness partner:
        😴 SLEEP ANALYSIS: Assess sleep quality and quantity
        💪 SORENESS EVALUATION: Address muscle soreness patterns
        ⚡ ENERGY ASSESSMENT: Understand energy levels
        🧘 STRESS MANAGEMENT: Help them handle life stress
        🎯 TRAINING IMPACT: Connect recovery to workout performance
        🤝 SUPPORTIVE GUIDANCE: Make recommendations feel caring

        Give them:
        - Recovery score out of 100
        - Specific areas of concern
        - Actionable improvement strategies
        - Training modifications if needed
        - Lifestyle recommendations
        - Encouragement and support

        Remember: Good recovery is just as important as good training. Help them understand this balance.`
      };

      const assessment = await getChatResponse([recoveryPrompt], userProfile);

      // Calculate recovery score
      const recoveryScore = this.calculateRecoveryScore(recoveryData);

      // Store recovery data
      await query(
        `INSERT INTO recovery_tracking (user_id, recovery_data, ai_assessment, recovery_score, recorded_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, JSON.stringify(recoveryData), assessment, recoveryScore]
      );

      return {
        success: true,
        assessment,
        recoveryScore,
        recommendations: this.generateRecoveryRecommendations(recoveryData, recoveryScore),
        trainingModifications: this.suggestTrainingModifications(recoveryScore)
      };
    } catch (error) {
      console.error('Recovery assessment error:', error);
      throw error;
    }
  }

  // Sleep optimization coaching
  async analyzeSleepPatterns(userId, sleepData) {
    try {
      const userProfile = await this.getUserRecoveryProfile(userId);
      const sleepHistory = await this.getSleepHistory(userId, 30);

      const sleepPrompt = {
        role: "system",
        content: `You are a sleep optimization specialist helping ${userProfile.name} improve their sleep for better fitness results.

        CLIENT: ${userProfile.name}
        RECENT SLEEP DATA: ${JSON.stringify(sleepData)}
        30-DAY SLEEP HISTORY: ${JSON.stringify(sleepHistory)}
        FITNESS GOALS: ${userProfile.goal}

        ANALYZE SLEEP PATTERNS:
        1. Sleep duration trends
        2. Sleep quality indicators
        3. Bedtime consistency
        4. Recovery impact on training
        5. Environmental factors
        6. Lifestyle influences

        Provide personalized sleep optimization strategies that fit their lifestyle and support their fitness goals.`
      };

      const analysis = await getChatResponse([sleepPrompt], userProfile);

      return {
        success: true,
        analysis,
        sleepScore: this.calculateSleepScore(sleepData),
        trends: this.analyzeSleepTrends(sleepHistory),
        optimizationPlan: this.extractSleepOptimization(analysis)
      };
    } catch (error) {
      console.error('Sleep analysis error:', error);
      throw error;
    }
  }

  // Stress and mental wellness support
  async assessStressWellness(userId, stressData) {
    try {
      const userProfile = await this.getUserRecoveryProfile(userId);

      const stressPrompt = {
        role: "system",
        content: `You are ${userProfile.name}'s mental wellness coach who understands how stress affects their fitness journey.

        CLIENT: ${userProfile.name}
        STRESS INDICATORS: ${JSON.stringify(stressData)}
        FITNESS CONTEXT: Training for ${userProfile.goal}

        PROVIDE STRESS MANAGEMENT SUPPORT:
        🧘 Acknowledge their stress levels with empathy
        💪 Connect stress management to fitness success
        🎯 Offer practical stress reduction techniques
        ⚡ Suggest stress-appropriate workout modifications
        🤝 Provide emotional support and encouragement
        🌟 Help them see stress as manageable

        Focus on practical, fitness-integrated stress management that fits their lifestyle.`
      };

      const assessment = await getChatResponse([stressPrompt], userProfile);

      return {
        success: true,
        assessment,
        stressLevel: this.categorizeStressLevel(stressData),
        copingStrategies: this.extractCopingStrategies(assessment),
        workoutModifications: this.suggestStressBasedModifications(stressData)
      };
    } catch (error) {
      console.error('Stress assessment error:', error);
      throw error;
    }
  }

  // Helper methods
  calculateRecoveryScore(recoveryData) {
    let score = 0;
    let factors = 0;

    if (recoveryData.sleep_hours) {
      const sleepScore = Math.min(100, Math.max(0, 
        (recoveryData.sleep_hours / this.recoveryMetrics.sleep.optimal) * 100));
      score += sleepScore;
      factors++;
    }

    if (recoveryData.stress_level) {
      const stressScore = Math.max(0, 100 - (recoveryData.stress_level * 12));
      score += stressScore;
      factors++;
    }

    if (recoveryData.soreness_level) {
      const sorenessScore = Math.max(0, 100 - (recoveryData.soreness_level * 11));
      score += sorenessScore;
      factors++;
    }

    if (recoveryData.energy_level) {
      const energyScore = (recoveryData.energy_level / 10) * 100;
      score += energyScore;
      factors++;
    }

    return factors > 0 ? Math.round(score / factors) : 50;
  }

  generateRecoveryRecommendations(recoveryData, score) {
    const recommendations = [];

    if (score < 60) {
      recommendations.push('prioritize_rest');
    }
    if (recoveryData.sleep_hours < 7) {
      recommendations.push('improve_sleep');
    }
    if (recoveryData.stress_level > 6) {
      recommendations.push('stress_management');
    }
    if (recoveryData.soreness_level > 6) {
      recommendations.push('active_recovery');
    }

    return recommendations;
  }

  suggestTrainingModifications(recoveryScore) {
    if (recoveryScore < 50) return 'rest_day';
    if (recoveryScore < 70) return 'light_training';
    if (recoveryScore < 85) return 'moderate_training';
    return 'full_intensity';
  }

  async getUserRecoveryProfile(userId) {
    try {
      const result = await query(
        `SELECT up.* FROM user_profiles up 
         WHERE up.email = $1 OR up.id::text = $1`,
        [userId]
      );
      return result.rows[0] || {};
    } catch (error) {
      return {};
    }
  }

  async getRecentRecoveryData(userId, days) {
    try {
      const result = await query(
        `SELECT recovery_data, recovery_score, recorded_at 
         FROM recovery_tracking 
         WHERE user_id = $1 AND recorded_at > NOW() - INTERVAL '${days} days'
         ORDER BY recorded_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }
}

export const recoveryWellness = new RecoveryWellness();
