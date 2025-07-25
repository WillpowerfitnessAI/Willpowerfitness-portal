
import { getChatResponse } from './aiProviders.js';
import { query } from './supabaseClient.js';

export class NutritionIntelligence {
  constructor() {
    this.macroTargets = {
      weight_loss: { protein: 0.35, fat: 0.25, carbs: 0.40 },
      muscle_gain: { protein: 0.30, fat: 0.25, carbs: 0.45 },
      maintenance: { protein: 0.25, fat: 0.30, carbs: 0.45 },
      athletic_performance: { protein: 0.25, fat: 0.20, carbs: 0.55 }
    };
  }

  // AI-powered meal planning
  async generateMealPlan(userId, preferences = {}) {
    try {
      const userProfile = await this.getUserNutritionProfile(userId);
      const recentLogs = await this.getRecentNutritionLogs(userId, 7);

      const mealPlanPrompt = {
        role: "system",
        content: `You are ${userProfile.name}'s dedicated AI nutrition coach who knows them personally and cares about their success. You understand their lifestyle, preferences, and goals intimately.

        YOUR CLIENT: ${userProfile.name}
        GOAL: ${userProfile.goal}
        DIETARY PREFERENCES: ${JSON.stringify(preferences)}
        RECENT EATING PATTERNS: ${JSON.stringify(recentLogs)}
        LIFESTYLE: ${userProfile.memory?.lifestyle || 'busy professional'}

        CREATE A PERSONALIZED MEAL PLAN like their nutrition best friend:
        🍎 PERSONAL TOUCH: Reference their preferences, schedule, cooking skills
        🎯 GOAL-FOCUSED: Align every meal with their fitness objectives
        🤝 SUPPORTIVE: Make it feel achievable, not overwhelming
        💪 MOTIVATIONAL: Connect food choices to their progress

        Include:
        - 7-day meal plan with specific portions
        - Grocery shopping list organized by store sections
        - Meal prep tips for their schedule
        - Substitution options for variety
        - Progress tracking suggestions
        - Encouragement and motivation

        Make this feel like their personal nutritionist created it just for them.`
      };

      const mealPlan = await getChatResponse([mealPlanPrompt], userProfile);

      // Store meal plan
      await query(
        `INSERT INTO nutrition_plans (user_id, meal_plan, preferences, generated_at) 
         VALUES ($1, $2, $3, NOW())`,
        [userId, mealPlan, JSON.stringify(preferences)]
      );

      return {
        success: true,
        mealPlan,
        estimatedCalories: this.calculatePlanCalories(mealPlan),
        macroBreakdown: this.calculateMacroBreakdown(userProfile.goal)
      };
    } catch (error) {
      console.error('Meal plan generation error:', error);
      throw error;
    }
  }

  // Smart food logging with AI analysis
  async analyzeFoodLog(userId, foodItems, photoDescription = null) {
    try {
      const userProfile = await this.getUserNutritionProfile(userId);
      
      const nutritionAnalysisPrompt = {
        role: "system",
        content: `You are ${userProfile.name}'s personal AI nutrition analyst - their supportive guide who helps them understand their eating patterns and make better choices.

        YOUR CLIENT: ${userProfile.name}
        THEIR GOAL: ${userProfile.goal}
        TODAY'S FOOD LOG: ${JSON.stringify(foodItems)}
        ${photoDescription ? `FOOD PHOTO ANALYSIS: ${photoDescription}` : ''}

        PROVIDE NUTRITION COACHING like their dedicated nutritionist:
        🎯 Start with acknowledgment of their effort to track
        📊 Break down calories, macros, and micronutrients
        💪 Connect food choices to their fitness goals
        🌟 Highlight what they did well nutritionally
        🎨 Suggest improvements in a supportive way
        🤝 Make recommendations feel achievable

        Include:
        - Calorie and macro analysis
        - Micronutrient assessment
        - Hydration evaluation
        - Meal timing feedback
        - Specific improvement suggestions
        - Encouragement for their tracking effort

        Remember: You're not just analyzing food - you're helping them build a better relationship with nutrition.`
      };

      const analysis = await getChatResponse([nutritionAnalysisPrompt], userProfile);

      // Store nutrition log
      await query(
        `INSERT INTO nutrition_logs (user_id, food_items, ai_analysis, logged_at) 
         VALUES ($1, $2, $3, NOW())`,
        [userId, JSON.stringify(foodItems), analysis]
      );

      return {
        success: true,
        analysis,
        nutritionScore: this.calculateNutritionScore(foodItems),
        recommendations: this.extractRecommendations(analysis)
      };
    } catch (error) {
      console.error('Food log analysis error:', error);
      throw error;
    }
  }

  // Supplement recommendations
  async generateSupplementAdvice(userId, currentSupplements = []) {
    try {
      const userProfile = await this.getUserNutritionProfile(userId);
      const recentLogs = await this.getRecentNutritionLogs(userId, 14);

      const supplementPrompt = {
        role: "system",
        content: `You are a certified sports nutritionist providing evidence-based supplement recommendations.

        Client Profile: ${JSON.stringify(userProfile)}
        Current Supplements: ${JSON.stringify(currentSupplements)}
        Recent Nutrition: ${JSON.stringify(recentLogs)}

        TASK: Provide supplement recommendations:
        1. Analyze nutritional gaps from food logs
        2. Consider training goals and intensity
        3. Recommend evidence-based supplements
        4. Prioritize by importance and impact
        5. Include timing and dosage guidance
        6. Address potential interactions
        7. Suggest budget-friendly alternatives

        Focus on supplements that genuinely fill gaps, not unnecessary additions.`
      };

      const advice = await getChatResponse([supplementPrompt], userProfile);

      return {
        success: true,
        advice,
        prioritySupplements: this.extractPrioritySupplements(advice),
        estimatedCost: this.estimateSupplementCost(advice)
      };
    } catch (error) {
      console.error('Supplement advice error:', error);
      throw error;
    }
  }

  // Helper methods
  async getUserNutritionProfile(userId) {
    try {
      const result = await query(
        `SELECT up.*, 
         (SELECT COUNT(*) FROM nutrition_logs nl WHERE nl.user_id = up.email) as total_logs
         FROM user_profiles up 
         WHERE up.email = $1 OR up.id::text = $1`,
        [userId]
      );
      return result.rows[0] || {};
    } catch (error) {
      return {};
    }
  }

  async getRecentNutritionLogs(userId, days) {
    try {
      const result = await query(
        `SELECT food_items, logged_at 
         FROM nutrition_logs 
         WHERE user_id = $1 AND logged_at > NOW() - INTERVAL '${days} days'
         ORDER BY logged_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  calculatePlanCalories(mealPlan) {
    // Simple estimation based on meal plan content
    const mealCount = (mealPlan.match(/meal|breakfast|lunch|dinner|snack/gi) || []).length;
    return Math.round(mealCount * 400); // Rough estimation
  }

  calculateMacroBreakdown(goal) {
    return this.macroTargets[goal] || this.macroTargets.maintenance;
  }

  calculateNutritionScore(foodItems) {
    // Simple scoring based on variety and quality
    const variety = new Set(foodItems.map(item => item.category)).size;
    const processedFoodPenalty = foodItems.filter(item => 
      item.name?.toLowerCase().includes('processed')).length * 5;
    
    return Math.max(0, Math.min(100, (variety * 15) - processedFoodPenalty + 40));
  }

  extractRecommendations(analysis) {
    const recommendations = analysis.match(/recommend|suggest|try|consider/gi);
    return recommendations ? recommendations.length : 0;
  }

  extractPrioritySupplements(advice) {
    const priorities = advice.match(/priority|essential|important|critical/gi);
    return priorities ? priorities.length : 0;
  }

  estimateSupplementCost(advice) {
    // Simple cost estimation
    const supplementCount = (advice.match(/\$\d+|\d+ dollars/gi) || []).length;
    return supplementCount > 0 ? supplementCount * 25 : 50; // Rough estimate
  }
}

export const nutritionAI = new NutritionIntelligence();
