import { useState } from 'react';
import Login from './components/lib/Login';
import ChatBox from './components/lib/ChatBox';
import ContactForm from './components/pages/ContactForm';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'contact', 'chat', 'videos', 'files'
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://js.stripe.com/v3/buy-button.js";
  script.async = true;
  document.body.appendChild(script);
}, []);

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
            50% { box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4); }
            100% { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
          }
        `}
      </style>
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#000000',
        padding: '2rem', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#c0c0c0'
      }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          margin: '0 0 0.5rem 0',
          background: 'linear-gradient(45deg, #c0c0c0, #e6e6e6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Willpowerfitness AI Coach
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#a0a0a0', margin: 0 }}>
          Your Personal AI Fitness Coach
        </p>
      </div>

      {/* Navigation - Always visible */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setCurrentView('home')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'home' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            🤖 AI Chat
          </button>
          <button
            onClick={() => setCurrentView('contact')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'contact' ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📋 Get Personal Plan
          </button>
          <button
            onClick={() => window.open('https://buy.stripe.com/4gw8wVcGh0qkc4o7ss', '_blank')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: '3px solid #ffffff',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              animation: 'pulse 2s infinite',
              textTransform: 'uppercase'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#218838';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#28a745';
              e.target.style.transform = 'scale(1)';
            }}
          >
            🚀 BUY NOW - $225/MONTH
          </button>
        </div>
      </div>
<div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
  <stripe-buy-button
    buy-button-id="buy_btn_1Rk2WBIw2TDvX8i08lvj2TXd"
    publishable-key="pk_live_51RWp4dIw2TDvX8i0Jcm21OH32WTmtKkOvoD2mKiHfkIZDK7AdiLCWQSDxLoVOBJzR1MLP0O0kIIw1PTF9MGGEAZS00ylxj6tAS"
  >
  </stripe-buy-button>
</div>

      {currentView === 'contact' ? (
        <ContactForm />
      ) : currentView === 'videos' ? (
        <div style={{
          maxWidth: '800px',
          margin: '2rem auto',
          padding: '3rem 2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎬</div>
          <h2 style={{ 
            color: '#333', 
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            Video Library Coming Soon!
          </h2>
          <p style={{ 
            color: '#666', 
            fontSize: '1.2rem',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Will Power is creating amazing workout videos just for you. <br/>
            Check back soon for exclusive training content!
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#007bff',
              fontWeight: 'bold'
            }}>
              🚀 In the meantime, chat with Will Power AI for personalized workouts!
            </p>
          </div>
        </div>
      ) : currentView === 'upload' ? (
        <div style={{
          maxWidth: '800px',
          margin: '2rem auto',
          padding: '3rem 2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📤</div>
          <h2 style={{ 
            color: '#333', 
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            Upload Your Files
          </h2>
          <p style={{ 
            color: '#666', 
            fontSize: '1.2rem',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Upload progress photos, workout videos, or documents. <br/>
            Will Power AI will analyze and provide personalized feedback!
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#007bff',
              fontWeight: 'bold'
            }}>
              🚀 Coming Soon - Upload progress photos and get AI analysis!
            </p>
          </div>
        </div>
      ) : currentView === 'download' ? (
        <div style={{
          maxWidth: '800px',
          margin: '2rem auto',
          padding: '3rem 2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📥</div>
          <h2 style={{ 
            color: '#333', 
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            Download Your Plans
          </h2>
          <p style={{ 
            color: '#666', 
            fontSize: '1.2rem',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Download your personalized workout plans, nutrition guides, <br/>
            and progress tracking sheets!
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#007bff',
              fontWeight: 'bold'
            }}>
              🎯 Join WillpowerFitness to access downloadable workout plans!
            </p>
          </div>
        </div>
      ) : currentView === 'files' ? (
        <div style={{
          maxWidth: '800px',
          margin: '2rem auto',
          padding: '3rem 2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
          <h2 style={{ 
            color: '#333', 
            marginBottom: '1rem',
            fontSize: '2rem'
          }}>
            File Manager
          </h2>
          <p style={{ 
            color: '#666', 
            fontSize: '1.2rem',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Manage your workout plans, progress photos, and documents. <br/>
            Upload, organize, and access all your fitness files in one place!
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#007bff',
              fontWeight: 'bold'
            }}>
              🚀 Coming Soon - Full file management system!
            </p>
          </div>
        </div>
      ) : currentView === 'home' && !user ? (
        <Login onLogin={setUser} />
      ) : currentView === 'home' && user ? (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button
              onClick={() => setUser(null)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ← Start Over
            </button>
          </div>
          <ChatBox user={user} />
        </div>
      ) : null}
    </div>
    </>
  );
}

export default App;