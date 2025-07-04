
import { useState } from 'react';
import Login from './components/lib/Login';
import ChatBox from './components/lib/ChatBox';
import ContactForm from './components/pages/ContactForm';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'contact', 'chat', 'videos', 'files'

  return (
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
              padding: '0.5rem 1rem',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            💳 Buy Membership - $225/month
          </button>
          <button
            onClick={() => setCurrentView('upload')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'upload' ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📤 Upload Files
          </button>
          <button
            onClick={() => setCurrentView('download')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'download' ? '#fd7e14' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📥 Download Files
          </button>
          <button
            onClick={() => setCurrentView('videos')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'videos' ? '#17a2b8' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            🎬 Video Library
          </button>
          <button
            onClick={() => setCurrentView('files')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'files' ? '#6f42c1' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📁 File Manager
          </button>
        </div>
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
  );
}

export default App;
