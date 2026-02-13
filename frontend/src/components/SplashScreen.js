import React from 'react';

const SplashScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 dark:from-gray-900 dark:to-gray-950">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          ERP Pro
        </h1>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-blue-400/50 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
