import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import OnboardingForm from './components/OnboardingForm';
import Dashboard from './components/Dashboard';
import { AppView, UserProfile } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.Landing);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleStart = () => {
    setCurrentView(AppView.Onboarding);
  };

  const handleFormSubmit = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentView(AppView.Dashboard);
  };

  const handleBackToLanding = () => {
    setCurrentView(AppView.Landing);
  };

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen">
      {currentView === AppView.Landing && (
        <LandingPage onStart={handleStart} />
      )}

      {currentView === AppView.Onboarding && (
        <OnboardingForm 
          onSubmit={handleFormSubmit} 
          onBack={handleBackToLanding}
        />
      )}

      {currentView === AppView.Dashboard && userProfile && (
        <Dashboard profile={userProfile} />
      )}
    </div>
  );
};

export default App;
