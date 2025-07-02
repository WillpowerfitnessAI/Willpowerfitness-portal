
import { useState } from 'react';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    goals: '',
    experience: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
      } else {
        alert('Error submitting form. Please try again.');
      }
    } catch (error) {
      alert('Error submitting form. Please try again.');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: '#28a745', marginBottom: '1rem' }}>Thank You!</h2>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1.5rem' }}>
          Your fitness consultation request has been submitted. Our AI coach will analyze your goals and send you a personalized response within minutes!
        </p>
        <p style={{ fontSize: '1rem', color: '#007bff' }}>
          Check your email for next steps and payment link.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '2rem auto',
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h2 style={{
          margin: '0',
          color: '#333',
          fontSize: '1.8rem'
        }}>
          Get Your Personal Fitness Plan 💪
        </h2>
      </div>
      <p style={{
        textAlign: 'center',
        color: '#666',
        marginBottom: '2rem',
        fontSize: '1.1rem'
      }}>
        Start your transformation with AI-powered fitness coaching
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '1rem',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
            Fitness Goals *
          </label>
          <select
            name="goals"
            value={formData.goals}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          >
            <option value="">Select your primary goal</option>
            <option value="weight_loss">Weight Loss</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="general_fitness">General Fitness</option>
            <option value="strength_training">Strength Training</option>
            <option value="endurance">Endurance/Cardio</option>
            <option value="athletic_performance">Athletic Performance</option>
            <option value="rehabilitation">Injury Recovery/Rehabilitation</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
            Experience Level *
          </label>
          <select
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          >
            <option value="">Select your experience</option>
            <option value="beginner">Beginner (0-6 months)</option>
            <option value="intermediate">Intermediate (6 months - 2 years)</option>
            <option value="advanced">Advanced (2+ years)</option>
            <option value="expert">Expert/Competitive Athlete</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
            Tell us more about your fitness journey *
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            placeholder="What challenges are you facing? What have you tried before? What's your ideal outcome?"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '1rem',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            if (!loading) e.target.style.backgroundColor = '#218838';
          }}
          onMouseOut={(e) => {
            if (!loading) e.target.style.backgroundColor = '#28a745';
          }}
        >
          {loading ? 'Submitting...' : 'Get My Personalized Plan 🚀'}
        </button>
      </form>

      <div style={{
        marginTop: '1.5rem',
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>🚀 Premium Coaching Program - $225/month</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#007bff' }}>🤖 AI Personal Trainer</h5>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#666' }}>
              <li>24/7 coaching & motivation</li>
              <li>Voice-enabled conversations</li>
              <li>Personalized workout plans</li>
              <li>Real-time form corrections</li>
            </ul>
          </div>
          
          <div>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#28a745' }}>🥗 Nutrition Mastery</h5>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#666' }}>
              <li>Custom 7-day meal plans</li>
              <li>Macro tracking & optimization</li>
              <li>Grocery lists & meal prep</li>
              <li>Recipe recommendations</li>
            </ul>
          </div>
          
          <div>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#6f42c1' }}>📈 Progress Tracking</h5>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#666' }}>
              <li>Photo progress comparisons</li>
              <li>Strength & endurance tracking</li>
              <li>Body composition analysis</li>
              <li>Performance metrics</li>
            </ul>
          </div>
          
          <div>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#17a2b8' }}>📚 Exclusive Resources</h5>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#666' }}>
              <li>Exercise video library</li>
              <li>Downloadable programs</li>
              <li>Educational content</li>
              <li>Community access</li>
            </ul>
          </div>
        </div>
        
        <div style={{
          padding: '1rem',
          backgroundColor: '#e8f5e8',
          borderRadius: '5px',
          border: '1px solid #c3e6c3',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#155724', fontWeight: 'bold' }}>
            💰 Compare: Personal trainers charge $100-200/session. Get unlimited AI coaching for just $225/month!
          </p>
        </div>
      </div>
    </div>
  );
}

export default ContactForm;
