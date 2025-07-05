import React, { useState, useEffect, useRef } from 'react';
import { Clock, Shield, BookOpen, Target, Volume2, VolumeX } from 'lucide-react';

const QUOTES = [
  "The pain of discipline weighs ounces. The pain of regret weighs tons.",
  "Discipline is choosing between what you want now and what you want most.",
  "Freedom is not worth having if it does not include the freedom to make mistakes.",
  "The successful warrior is the average man with laser-like focus.",
  "Discipline is the bridge between goals and accomplishment.",
  "You have power over your mind - not outside events. Realize this, and you will find strength.",
  "The mind is everything. What you think you become.",
  "Comfort is the enemy of achievement.",
  "Every moment of resistance to temptation is a victory.",
  "The cave you fear to enter holds the treasure you seek."
];

const REASONS = [
  'Bored',
  'Need to Message',
  'Checking DMs', 
  'FOMO',
  'Other'
];

// Service Worker registration
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered');
      return registration;
    } catch (error) {
      console.log('SW registration failed');
    }
  }
};

// Request notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

const DisciplineApp = () => {
  const [currentView, setCurrentView] = useState('journal');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [lastDistraction, setLastDistraction] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const notificationRef = useRef(null);

  // Load data from memory on mount
  useEffect(() => {
    const savedEntries = JSON.parse(localStorage.getItem('disciplineEntries') || '[]');
    const savedLastDistraction = localStorage.getItem('lastDistraction');
    
    setJournalEntries(savedEntries);
    if (savedLastDistraction) {
      setLastDistraction(new Date(savedLastDistraction));
    }

    // Request notification permission
    requestNotificationPermission().then(granted => {
      setNotificationsEnabled(granted);
    });

    // Register service worker
    registerServiceWorker();
  }, []);

  // Timer logic
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerActive(false);
            setCurrentView('completion');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Send notifications during timer
      if (notificationsEnabled) {
        const intervals = [600, 300, 60]; // 10 min, 5 min, 1 min
        intervals.forEach(seconds => {
          if (timeLeft === seconds) {
            const minLeft = Math.floor(seconds / 60);
            new Notification('Discipline', {
              body: `Focus. ${minLeft} min left.`,
              icon: '/icon-192x192.png'
            });
          }
        });
      }
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTimerActive, timeLeft, notificationsEnabled]);

  // Audio loop logic
  useEffect(() => {
    if (audioEnabled && isTimerActive) {
      // Create audio context for lofi sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start();
      audioRef.current = { oscillator, audioContext };
      
      return () => {
        oscillator.stop();
        audioContext.close();
      };
    }
  }, [audioEnabled, isTimerActive]);

  const getTodaysQuote = () => {
    const today = new Date().toDateString();
    const hash = today.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return QUOTES[Math.abs(hash) % QUOTES.length];
  };

  const getTimerDuration = () => {
    const today = new Date().toDateString();
    const todaysEntries = journalEntries.filter(entry => 
      new Date(entry.timestamp).toDateString() === today
    );
    return todaysEntries.length === 0 ? 15 * 60 : 30 * 60; // 15 or 30 minutes
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeSince = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Less than an hour ago';
  };

  const handleSubmitJournal = () => {
    const reason = selectedReason === 'Other' ? customReason : selectedReason;
    if (!reason) return;

    const entry = {
      timestamp: new Date().toISOString(),
      reason: reason
    };

    const updatedEntries = [entry, ...journalEntries];
    setJournalEntries(updatedEntries);
    localStorage.setItem('disciplineEntries', JSON.stringify(updatedEntries));

    const duration = getTimerDuration();
    setTimeLeft(duration);
    setIsTimerActive(true);
    setCurrentView('timer');
  };

  const handleTimerComplete = (choice) => {
    if (choice === 'no') {
      setLastDistraction(new Date());
      localStorage.setItem('lastDistraction', new Date().toISOString());
      setCurrentView('dashboard');
    } else {
      setCurrentView('instruction');
    }
  };

  const goToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedReason('');
    setCustomReason('');
  };

  // Journal View
  if (currentView === 'journal') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h1 className="text-3xl font-bold mb-2">Discipline</h1>
            <p className="text-gray-300 text-lg">Why are you here?</p>
          </div>

          <div className="space-y-4">
            {REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedReason === reason
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Specify your reason..."
              className="w-full p-4 rounded-lg bg-gray-800 border-2 border-gray-600 focus:border-blue-500 outline-none"
            />
          )}

          <button
            onClick={handleSubmitJournal}
            disabled={!selectedReason || (selectedReason === 'Other' && !customReason)}
            className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  // Timer View
  if (currentView === 'timer') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-6">
        <div className="text-center space-y-8">
          <Clock className="w-24 h-24 mx-auto text-red-400" />
          <h1 className="text-6xl font-mono font-bold">{formatTime(timeLeft)}</h1>
          <p className="text-xl text-gray-300">Lock-in period active</p>
          
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>
            <span className="text-sm text-gray-400">
              {audioEnabled ? 'Audio On' : 'Audio Off'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Completion View
  if (currentView === 'completion') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <Target className="w-16 h-16 mx-auto text-green-400" />
          <h1 className="text-2xl font-bold">Time's up.</h1>
          <p className="text-lg text-gray-300">Still want to open the distraction?</p>
          
          <div className="space-y-4">
            <button
              onClick={() => handleTimerComplete('yes')}
              className="w-full p-4 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => handleTimerComplete('no')}
              className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Instruction View
  if (currentView === 'instruction') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="text-6xl">📱</div>
          <h1 className="text-2xl font-bold">Now open Instagram manually</h1>
          <p className="text-gray-300">You've made your choice. Act on it yourself.</p>
          
          <button
            onClick={goToDashboard}
            className="w-full p-4 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen min-w-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 mx-auto mb-4 text-blue-400" />
          <h1 className="text-3xl font-bold mb-2">Discipline</h1>
          <button
            onClick={() => setCurrentView('journal')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            New Session
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Last Distraction
            </h2>
            <p className="text-2xl text-green-400 font-bold">
              {getTimeSince(lastDistraction)}
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Quote of the Day
            </h2>
            <p className="text-gray-300 italic">"{getTodaysQuote()}"</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Journal Log</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {journalEntries.length === 0 ? (
              <p className="text-gray-400">No entries yet</p>
            ) : (
              journalEntries.map((entry, index) => (
                <div key={index} className="border-l-2 border-blue-500 pl-4">
                  <p className="font-medium">{entry.reason}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisciplineApp;