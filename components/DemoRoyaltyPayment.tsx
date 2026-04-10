'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface Split {
  address: string;
  percentage: number;
  name: string;
  role: string;
}

interface Track {
  isrc: string;
  title: string;
  artist: string;
  totalEarned: number;
  splits: Split[];
}

interface DemoRoyaltyPaymentProps {
  track?: Track;
  onComplete: () => void;
}

// Default track in case none is provided
const defaultTrack: Track = {
  isrc: 'US-TDE-24-00123',
  title: 'MIDNIGHT DRIVE',
  artist: 'Jay Rock',
  totalEarned: 12450.00,
  splits: [
    { 
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 
      percentage: 50, 
      name: 'Jay Rock', 
      role: 'artist' 
    },
    { 
      address: '0x1234567890123456789012345678901234567890', 
      percentage: 25, 
      name: 'Dave Free', 
      role: 'producer' 
    },
    { 
      address: '0x8765432109876543210987654321098765432109', 
      percentage: 25, 
      name: 'Top Dawg Ent', 
      role: 'label' 
    }
  ]
};

export default function DemoRoyaltyPayment({ track, onComplete }: DemoRoyaltyPaymentProps) {
  const [step, setStep] = useState<'review' | 'processing' | 'complete'>('review');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Safe check for track
  useEffect(() => {
    // Log for debugging
    console.log('DemoRoyaltyPayment received track:', track);
    
    if (!track) {
      console.log('No track provided, using default');
    }
  }, [track]);

  // Use the provided track or fall back to default
  const activeTrack = track && track.isrc ? track : defaultTrack;

  const handleProcess = () => {
    setStep('processing');
    setError(null);
    
    // Simulate blockchain transaction
    setTimeout(() => {
      try {
        const hash = '0x' + Array.from({ length: 64 }, () => 
          Math.floor(Math.random() * 16).toString(16)).join('');
        setTxHash(hash);
        setStep('complete');
        
        // Call onComplete after showing success for 3 seconds
        setTimeout(() => {
          onComplete();
        }, 3000);
      } catch (err) {
        setError('Transaction failed');
        setStep('review');
      }
    }, 2000);
  };

  const handleClose = () => {
    onComplete();
  };

  // If there's an error
  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-auto">
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Safety check - if no activeTrack, show loading
  if (!activeTrack) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-auto">
        <div className="text-center py-8">
          <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Demo Royalty Payment</h2>
      
      {step === 'review' && (
        <>
          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-purple-600 font-medium">{activeTrack.isrc}</p>
            <h3 className="text-xl font-bold mt-1">{activeTrack.title}</h3>
            <p className="text-gray-600">{activeTrack.artist}</p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-purple-600">
                ${activeTrack.totalEarned.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <h4 className="font-medium">Split Breakdown</h4>
            {activeTrack.splits && activeTrack.splits.length > 0 ? (
              activeTrack.splits.map((split, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{split.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{split.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{split.percentage}%</p>
                    <p className="text-sm text-gray-600">
                      ${((activeTrack.totalEarned * split.percentage) / 100).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No split data available</p>
            )}
          </div>

          <button
            onClick={handleProcess}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Process Demo Payment
          </button>
        </>
      )}

      {step === 'processing' && (
        <div className="text-center py-12">
          <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Processing Payment</h3>
          <p className="text-gray-500">Simulating blockchain transaction...</p>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Payment Complete!</h3>
          <p className="text-gray-600 mb-4">Demo transaction successful</p>
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
            <p className="text-sm font-mono break-all">{txHash}</p>
          </div>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      )}
    </div>
  );
}