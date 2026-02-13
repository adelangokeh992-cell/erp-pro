import React, { createContext, useContext, useState, useEffect } from 'react';

const ONBOARDING_KEY = 'erp_onboarding_completed';

const OnboardingContext = createContext(null);

export const OnboardingProvider = ({ children }) => {
  const [completed, setCompleted] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const markCompleted = () => {
    setCompleted(true);
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {}
  };

  const resetOnboarding = () => {
    setCompleted(false);
    try {
      localStorage.removeItem(ONBOARDING_KEY);
    } catch {}
  };

  return (
    <OnboardingContext.Provider value={{ completed, markCompleted, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    return { completed: true, markCompleted: () => {}, resetOnboarding: () => {} };
  }
  return ctx;
};
