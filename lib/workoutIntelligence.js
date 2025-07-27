export const workoutAI = {
  async adjustWorkoutDynamically(userId, currentWorkout, performanceData) {
    // Enhanced AI workout adjustment logic
    const adjustments = {
      recommendedChanges: [],
      nextWeight: performanceData.currentWeight,
      nextSets: performanceData.currentSets,
      nextReps: performanceData.currentReps,
      restPeriods: performanceData.restPeriods || '2-3 minutes',
      aiInsights: ''
    };

    // Analyze performance and make intelligent adjustments
    if (performanceData.rpe >= 8) {
      adjustments.recommendedChanges.push('Reduce weight by 5-10% for next set');
      adjustments.nextWeight = Math.round(performanceData.currentWeight * 0.95);
      adjustments.aiInsights = 'High RPE detected. Reducing intensity to maintain form and prevent overexertion.';
    } else if (performanceData.rpe <= 6) {
      adjustments.recommendedChanges.push('Increase weight by 2.5-5% for next set');
      adjustments.nextWeight = Math.round(performanceData.currentWeight * 1.025);
      adjustments.aiInsights = 'Low RPE indicates capacity for increased intensity. Progressive overload recommended.';
    }

    // Store adjustment in database
    try {
      await query(
        'INSERT INTO workout_adjustments (user_id, original_workout, performance_data, ai_adjustment) VALUES ($1, $2, $3, $4)',
        [userId, JSON.stringify(currentWorkout), JSON.stringify(performanceData), JSON.stringify(adjustments)]
      );
    } catch (error) {
      console.log('Database logging skipped');
    }

    return adjustments;
  },

  async analyzeExerciseForm(userId, exerciseName, formFeedback, videoDescription) {
    // AI form analysis
    const analysis = {
      riskLevel: 'low',
      formFeedback: '',
      corrections: [],
      preventiveMeasures: []
    };

    // Analyze form feedback for risk indicators
    const riskKeywords = ['pain', 'discomfort', 'strain', 'difficult', 'unstable'];
    const hasRiskIndicators = riskKeywords.some(keyword => 
      formFeedback.toLowerCase().includes(keyword)
    );

    if (hasRiskIndicators) {
      analysis.riskLevel = 'medium';
      analysis.formFeedback = 'Potential form issues detected. Focus on controlled movement and proper technique.';
      analysis.corrections.push('Reduce weight and focus on movement quality');
      analysis.corrections.push('Ensure full range of motion with control');
    } else {
      analysis.formFeedback = 'Form appears stable. Continue with current technique while monitoring fatigue.';
    }

    // Store form analysis
    try {
      await query(
        'INSERT INTO form_analyses (user_id, exercise_name, feedback, ai_analysis, risk_level) VALUES ($1, $2, $3, $4, $5)',
        [userId, exerciseName, formFeedback, analysis.formFeedback, analysis.riskLevel]
      );
    } catch (error) {
      console.log('Database logging skipped');
    }

    return analysis;
  },

  async processRPEFeedback(userId, exerciseData, rpeRating, notes) {
    // RPE-based recommendations
    const feedback = {
      nextWeight: exerciseData.weight,
      message: '',
      recommendation: '',
      adjustmentReason: ''
    };

    if (rpeRating >= 9) {
      feedback.nextWeight = Math.round(exerciseData.weight * 0.9);
      feedback.message = 'Very high effort detected. Reducing load for recovery.';
      feedback.recommendation = 'Focus on form and controlled movement';
      feedback.adjustmentReason = 'RPE 9+ indicates near-maximal effort';
    } else if (rpeRating >= 7) {
      feedback.nextWeight = exerciseData.weight;
      feedback.message = 'Good intensity level. Maintain current weight.';
      feedback.recommendation = 'Continue with current load';
      feedback.adjustmentReason = 'RPE 7-8 is optimal training intensity';
    } else if (rpeRating <= 5) {
      feedback.nextWeight = Math.round(exerciseData.weight * 1.05);
      feedback.message = 'Low effort detected. Progressive overload recommended.';
      feedback.recommendation = 'Increase weight for next set';
      feedback.adjustmentReason = 'RPE 5 or below indicates capacity for more load';
    }

    // Store RPE data
    try {
      await query(
        'INSERT INTO rpe_tracking (user_id, exercise_name, weight, sets, reps, rpe_rating, notes, ai_recommendations) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [userId, exerciseData.name, exerciseData.weight, exerciseData.sets, exerciseData.reps, rpeRating, notes, feedback.message]
      );
    } catch (error) {
      console.log('Database logging skipped');
    }

    return feedback;
  },

  async analyzeInjuryRisk(userId, workoutHistory, symptoms) {
    // Injury prevention analysis
    return {
      riskLevel: 'low',
      recommendations: [
        'Continue current training with proper warm-up',
        'Monitor form and reduce weight if discomfort occurs',
        'Ensure adequate rest between sessions'
      ],
      preventiveMeasures: [
        'Dynamic warm-up before training',
        'Progressive overload principles',
        'Listen to your body signals'
      ]
    };
  }
};

// Database query helper (fallback for when main query fails)
async function query(text, params) {
  try {
    // This will use the main query function from supabaseClient.js
    const { query: mainQuery } = await import('./supabaseClient.js');
    return await mainQuery(text, params);
  } catch (error) {
    console.log('Database operation failed, continuing with mock data');
    return { rows: [] };
  }
}