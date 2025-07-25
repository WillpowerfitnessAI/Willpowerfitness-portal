
import { query } from './supabaseClient.js';
import { getChatResponse } from './aiProviders.js';

export class ProgressTracker {
  constructor() {
    this.metricTypes = {
      strength: ['max_bench', 'max_squat', 'max_deadlift', 'total_volume'],
      body_composition: ['weight', 'body_fat', 'muscle_mass', 'measurements'],
      performance: ['rpe_trends', 'workout_frequency', 'session_duration'],
      nutrition: ['calorie_intake', 'macro_adherence', 'hydration'],
      recovery: ['sleep_hours', 'stress_level', 'soreness_rating']
    };
  }

  // Track comprehensive progress metrics
  async recordProgressMetrics(userId, metrics) {
    try {
      const progressData = {
        user_id: userId,
        metrics: JSON.stringify(metrics),
        recorded_at: new Date().toISOString(),
        metric_type: this.determineMetricType(metrics)
      };

      await query(
        `INSERT INTO progress_tracking (user_id, metrics, recorded_at, metric_type) 
         VALUES ($1, $2, $3, $4)`,
        [progressData.user_id, progressData.metrics, progressData.recorded_at, progressData.metric_type]
      );

      return {
        success: true,
        message: 'Progress metrics recorded successfully',
        nextMilestone: await this.calculateNextMilestone(userId, metrics)
      };
    } catch (error) {
      console.error('Progress recording error:', error);
      throw error;
    }
  }

  // Generate comprehensive progress report
  async generateProgressReport(userId, timeframe = '30_days') {
    try {
      const timeframeDays = this.getTimeframeDays(timeframe);
      
      // Get all progress data
      const [strengthData, bodyCompData, performanceData, workoutHistory] = await Promise.all([
        this.getStrengthProgress(userId, timeframeDays),
        this.getBodyCompositionProgress(userId, timeframeDays),
        this.getPerformanceMetrics(userId, timeframeDays),
        this.getWorkoutHistory(userId, timeframeDays)
      ]);

      // Generate AI analysis
      const progressAnalysisPrompt = {
        role: "system",
        content: `You are ${userId}'s dedicated AI training partner who has been with them every step of their fitness journey. You remember their struggles, celebrate their victories, and genuinely care about their progress like a best friend would.

        YOUR TRAINING PARTNER'S JOURNEY (${timeframe}):
        💪 STRENGTH PROGRESS: ${JSON.stringify(strengthData)}
        📊 BODY CHANGES: ${JSON.stringify(bodyCompData)}
        🏃 PERFORMANCE EVOLUTION: ${JSON.stringify(performanceData)}
        📈 WORKOUT CONSISTENCY: ${JSON.stringify(workoutHistory)}

        CREATE A PROGRESS REPORT LIKE THEIR BIGGEST SUPPORTER:
        🎉 CELEBRATE WINS: Acknowledge every improvement with genuine excitement
        💪 RECOGNIZE EFFORT: Honor their consistency and dedication
        🎯 PROGRESS CONTEXT: Connect changes to their personal goals
        🤝 ENCOURAGING TRUTH: Address plateaus with supportive honesty
        🚀 MOTIVATIONAL DIRECTION: Paint an exciting picture of what's next

        Write this like you're their training buddy who's been tracking everything and is genuinely excited to share their progress. Use their data to tell the story of their transformation, acknowledge the hard work they've put in, and get them pumped for the next phase.

        Remember: This isn't just data analysis - it's a celebration of their journey and a roadmap for their future success. Make them feel proud of how far they've come and excited about where they're going.`
      };

      const aiAnalysis = await getChatResponse([progressAnalysisPrompt]);

      const report = {
        period: timeframe,
        generatedAt: new Date().toISOString(),
        summary: {
          totalWorkouts: workoutHistory.length,
          strengthGains: this.calculateStrengthGains(strengthData),
          bodyCompositionChanges: this.calculateBodyChanges(bodyCompData),
          performanceImprovements: this.calculatePerformanceGains(performanceData)
        },
        detailed: {
          strength: await this.analyzeStrengthProgress(strengthData),
          bodyComposition: await this.analyzeBodyComposition(bodyCompData),
          performance: await this.analyzePerformance(performanceData),
          consistency: await this.analyzeConsistency(workoutHistory)
        },
        aiInsights: aiAnalysis,
        recommendations: await this.generateRecommendations(userId, {
          strength: strengthData,
          body: bodyCompData,
          performance: performanceData
        }),
        nextMilestones: await this.getUpcomingMilestones(userId)
      };

      // Store the report
      await query(
        `INSERT INTO progress_reports (user_id, report_data, timeframe, created_at) 
         VALUES ($1, $2, $3, NOW())`,
        [userId, JSON.stringify(report), timeframe]
      );

      return report;
    } catch (error) {
      console.error('Progress report generation error:', error);
      throw error;
    }
  }

  // Photo progress analysis
  async analyzeProgressPhotos(userId, photoData) {
    try {
      const recentPhotos = await query(
        `SELECT * FROM progress_photos 
         WHERE user_id = $1 
         ORDER BY taken_at DESC 
         LIMIT 10`,
        [userId]
      );

      // Store new photo data
      await query(
        `INSERT INTO progress_photos (user_id, photo_metadata, analysis_notes, taken_at) 
         VALUES ($1, $2, $3, NOW())`,
        [userId, JSON.stringify(photoData), photoData.userNotes || '']
      );

      const photoAnalysisPrompt = {
        role: "system",
        content: `You are a body composition analysis expert specializing in progress photo evaluation.

        Current Photo Data: ${JSON.stringify(photoData)}
        Recent Photo History: ${JSON.stringify(recentPhotos)}

        TASK: Provide detailed photo progress analysis:
        1. Visible muscle development changes
        2. Body fat percentage estimates
        3. Posture and symmetry observations
        4. Progress trends over time
        5. Areas showing most/least improvement
        6. Recommendations for photo consistency
        7. Motivation and positive reinforcement

        Focus on objective, encouraging feedback that helps track visual progress.`
      };

      const analysis = await getChatResponse([photoAnalysisPrompt]);

      return {
        success: true,
        analysis,
        comparisonData: this.compareRecentPhotos(recentPhotos),
        progressScore: this.calculateVisualProgressScore(photoData, recentPhotos),
        recommendations: this.extractPhotoRecommendations(analysis)
      };
    } catch (error) {
      console.error('Photo analysis error:', error);
      throw error;
    }
  }

  // Goal milestone tracking
  async trackGoalMilestones(userId, currentMetrics) {
    try {
      const userGoals = await this.getUserGoals(userId);
      const milestoneProgress = {};

      for (const goal of userGoals) {
        const progress = this.calculateGoalProgress(goal, currentMetrics);
        milestoneProgress[goal.id] = {
          goal: goal.description,
          target: goal.target_value,
          current: currentMetrics[goal.metric_name] || 0,
          progress_percentage: progress,
          estimated_completion: this.estimateCompletionDate(goal, currentMetrics),
          is_achieved: progress >= 100
        };
      }

      // Generate milestone insights
      const milestonePrompt = {
        role: "system",
        content: `You are a goal achievement specialist and motivation coach.

        User Goals Progress: ${JSON.stringify(milestoneProgress)}

        TASK: Provide milestone analysis:
        1. Celebrate achieved milestones
        2. Encourage progress on ongoing goals
        3. Identify goals that need strategy adjustment
        4. Suggest new challenging but achievable milestones
        5. Provide motivation and perspective on journey
        6. Recommend timeline adjustments if needed

        Be encouraging while maintaining realistic expectations.`
      };

      const insights = await getChatResponse([milestonePrompt]);

      return {
        success: true,
        milestones: milestoneProgress,
        insights,
        achievements: Object.values(milestoneProgress).filter(m => m.is_achieved),
        upcomingMilestones: Object.values(milestoneProgress).filter(m => m.progress_percentage > 80 && !m.is_achieved)
      };
    } catch (error) {
      console.error('Milestone tracking error:', error);
      throw error;
    }
  }

  // Helper methods for data analysis
  async getStrengthProgress(userId, days) {
    try {
      const result = await query(
        `SELECT exercise_name, weight, reps, timestamp 
         FROM rpe_tracking 
         WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${days} days'
         ORDER BY exercise_name, timestamp`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async getBodyCompositionProgress(userId, days) {
    try {
      const result = await query(
        `SELECT metrics, recorded_at 
         FROM progress_tracking 
         WHERE user_id = $1 AND metric_type = 'body_composition' 
         AND recorded_at > NOW() - INTERVAL '${days} days'
         ORDER BY recorded_at`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async getPerformanceMetrics(userId, days) {
    try {
      const result = await query(
        `SELECT workout_data, completed_at 
         FROM workouts 
         WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '${days} days'
         ORDER BY completed_at`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async getWorkoutHistory(userId, days) {
    try {
      const result = await query(
        `SELECT workout_data, completed_at 
         FROM workouts 
         WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '${days} days'
         ORDER BY completed_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  // Analysis calculation methods
  calculateStrengthGains(strengthData) {
    if (strengthData.length < 2) return 'Insufficient data';
    
    const exercises = [...new Set(strengthData.map(d => d.exercise_name))];
    const gains = {};
    
    exercises.forEach(exercise => {
      const exerciseData = strengthData.filter(d => d.exercise_name === exercise);
      if (exerciseData.length >= 2) {
        const latest = exerciseData[exerciseData.length - 1];
        const earliest = exerciseData[0];
        gains[exercise] = {
          weightGain: latest.weight - earliest.weight,
          percentageGain: ((latest.weight - earliest.weight) / earliest.weight * 100).toFixed(1)
        };
      }
    });
    
    return gains;
  }

  calculateBodyChanges(bodyData) {
    if (bodyData.length < 2) return 'Insufficient data';
    
    const latest = JSON.parse(bodyData[bodyData.length - 1].metrics);
    const earliest = JSON.parse(bodyData[0].metrics);
    
    return {
      weightChange: latest.weight ? (latest.weight - earliest.weight) : null,
      bodyFatChange: latest.body_fat ? (latest.body_fat - earliest.body_fat) : null,
      muscleMassChange: latest.muscle_mass ? (latest.muscle_mass - earliest.muscle_mass) : null
    };
  }

  calculatePerformanceGains(performanceData) {
    if (performanceData.length < 2) return 'Insufficient data';
    
    const avgDuration = performanceData.reduce((sum, w) => {
      const data = JSON.parse(w.workout_data);
      return sum + (data.duration || 60);
    }, 0) / performanceData.length;
    
    const avgRPE = performanceData.reduce((sum, w) => {
      const data = JSON.parse(w.workout_data);
      return sum + (data.avgRPE || 6);
    }, 0) / performanceData.length;
    
    return {
      avgWorkoutDuration: Math.round(avgDuration),
      avgRPE: avgRPE.toFixed(1),
      workoutFrequency: performanceData.length
    };
  }

  getTimeframeDays(timeframe) {
    const timeframes = {
      '7_days': 7,
      '30_days': 30,
      '90_days': 90,
      '6_months': 180,
      '1_year': 365
    };
    return timeframes[timeframe] || 30;
  }

  determineMetricType(metrics) {
    if (metrics.weight || metrics.body_fat) return 'body_composition';
    if (metrics.max_bench || metrics.max_squat) return 'strength';
    if (metrics.rpe || metrics.duration) return 'performance';
    return 'general';
  }
}

export const progressTracker = new ProgressTracker();
