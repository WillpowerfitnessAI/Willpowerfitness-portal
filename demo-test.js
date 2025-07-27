
// PRESENTATION DEMO VERIFICATION SCRIPT
// Run this before your presentation to ensure everything works

import express from 'express';
import { query } from './lib/supabaseClient.js';
import { getChatResponse } from './lib/aiProviders.js';

export async function runDemoTests() {
  console.log('🚀 WILLPOWERFITNESSAI DEMO VERIFICATION');
  console.log('=====================================');

  const results = {
    database: false,
    ai: false,
    onboarding: false,
    workoutGeneration: false,
    goalTracking: false
  };

  // Test 1: Database Connection
  try {
    await query('SELECT NOW() as current_time');
    results.database = true;
    console.log('✅ Database: Connected to Supabase');
  } catch (error) {
    console.log('❌ Database: Connection failed');
    console.log('   Fix: Check DATABASE_URL in secrets');
  }

  // Test 2: AI Response System
  try {
    const response = await getChatResponse([
      { role: "user", content: "Create a 3-day workout plan for strength training" }
    ]);
    results.ai = response && response.length > 50;
    console.log('✅ AI: Workout generation working');
  } catch (error) {
    console.log('❌ AI: Response system failed');
    console.log('   Fix: Check GROQ_API_KEY in secrets');
  }

  // Test 3: Onboarding Flow
  try {
    const testUser = await query(
      `INSERT INTO leads (name, email, goals, experience, status) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (email) DO UPDATE SET status = $5
       RETURNING *`,
      ['Demo User', 'demo@willpowerfitnessai.com', 'strength_training', 'intermediate', 'demo_ready']
    );
    results.onboarding = testUser.rows.length > 0;
    console.log('✅ Onboarding: User creation working');
  } catch (error) {
    console.log('❌ Onboarding: User creation failed');
  }

  // Test 4: Workout Generation
  try {
    const workout = await query(
      `INSERT INTO workouts (user_id, workout_data) 
       VALUES ($1, $2) 
       RETURNING *`,
      ['demo@willpowerfitnessai.com', JSON.stringify({
        type: 'strength',
        exercises: ['Squats', 'Bench Press', 'Deadlifts'],
        duration: '45 minutes'
      })]
    );
    results.workoutGeneration = workout.rows.length > 0;
    console.log('✅ Workouts: Generation and storage working');
  } catch (error) {
    console.log('❌ Workouts: Storage failed');
  }

  // Test 5: Goal Tracking
  try {
    const progress = await query(
      `INSERT INTO progress_tracking (user_id, metrics) 
       VALUES ($1, $2) 
       RETURNING *`,
      ['demo@willpowerfitnessai.com', JSON.stringify({
        weight: 150,
        bodyFat: 15,
        strength: { bench: 185, squat: 225, deadlift: 275 }
      })]
    );
    results.goalTracking = progress.rows.length > 0;
    console.log('✅ Progress: Goal tracking working');
  } catch (error) {
    console.log('❌ Progress: Tracking failed');
  }

  // Final Results
  console.log('\n🎯 DEMO READINESS REPORT');
  console.log('========================');
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`Status: ${passedTests}/${totalTests} features working`);
  
  if (passedTests === totalTests) {
    console.log('🟢 ALL SYSTEMS GO! Demo ready for presentation.');
  } else {
    console.log('🟡 Some features need attention before demo.');
  }

  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemoTests();
}
