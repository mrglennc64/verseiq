"use client";

import { useState } from 'react';
import { useAccount, useBalance, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { CheckCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface Split {
  address: string;
  percentage: number;
  name: string;
  role: 'artist' | 'producer' | 'label' | 'publisher';
}

interface RoyaltyPaymentProps {
  track: {
    isrc: string;
    title: string;
    artist: string;
    totalEarned: number;
    splits: Split[];
  };
  onPaymentComplete?: (txHash: string) => void;
}

export default function RoyaltyPayment({ track, onPaymentComplete }: RoyaltyPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { sendTransactionAsync } = useSendTransaction();

  // Royalty splitter contract address on Monad
  const ROYALTY_SPLITTER_ADDRESS = '0xAa19bFC7Bd852efe49ef31297bB082FB044B2ea4';

  const processPayment = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Calculate total amount (in MON)
      const totalAmount = track.totalEarned;
      
      // Build transaction data for royalty splitter contract
      const tx = await sendTransactionAsync({
        to: ROYALTY_SPLITTER_ADDRESS,
        value: parseEther(totalAmount.toString()),
        data: encodeRoyaltySplit(track.isrc, track.splits, totalAmount),
      });

      setTxHash(tx);
      
      if (onPaymentComplete) {
        onPaymentComplete(tx);
      }

      // Record payment in your backend
      await fetch('/api/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isrc: track.isrc,
          amount: totalAmount,
          txHash: tx,
          splits: track.splits,
          timestamp: new Date().toISOString(),
        }),
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to encode royalty split data for contract
  const encodeRoyaltySplit = (isrc: string, splits: Split[], totalAmount: number): `0x${string}` => {
    // This would encode the function call to your royalty splitter contract
    // For now, returning placeholder
    return '0x';
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-700 text-sm">
          Connect your wallet to process payments
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Process Royalty Payment</h3>
      
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm text-gray-600">Track</p>
            <p className="font-medium">{track.title}</p>
            <p className="text-xs text-gray-500">{track.artist}</p>
            <p className="text-xs font-mono text-gray-400 mt-1">ISRC: {track.isrc}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Due</p>
            <p className="text-2xl font-bold text-purple-600">${track.totalEarned}</p>
            <p className="text-xs text-gray-500">{track.totalEarned} MON</p>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium mb-3">Royalty Split</p>
          {track.splits.map((split, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  split.role === 'artist' ? 'bg-purple-100 text-purple-600' :
                  split.role === 'producer' ? 'bg-blue-100 text-blue-600' :
                  split.role === 'label' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {split.role}
                </span>
                <div>
                  <p className="text-sm font-medium">{split.name}</p>
                  <p className="text-xs font-mono text-gray-500">{split.address.slice(0, 6)}...{split.address.slice(-4)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{split.percentage}%</p>
                <p className="text-xs text-gray-500">${((track.totalEarned * split.percentage) / 100).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {balance && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
          <span className="text-sm text-gray-600">Your Balance</span>
          <span className="font-medium">{parseFloat(balance.formatted).toFixed(4)} MON</span>
        </div>
      )}

      <button
        onClick={processPayment}
        disabled={isProcessing || (balance && parseFloat(balance.formatted) < track.totalEarned)}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
          isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : balance && parseFloat(balance.formatted) < track.totalEarned
            ? 'bg-red-500 text-white cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : balance && parseFloat(balance.formatted) < track.totalEarned ? (
          <>
            <AlertCircle className="h-5 w-5" />
            <span>Insufficient Balance</span>
          </>
        ) : (
          <span>Process Payment (${track.totalEarned})</span>
        )}
      </button>

      {txHash && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700">Payment Successful!</p>
              <p className="text-xs text-green-600 mt-1">Transaction Hash:</p>
              <code className="text-xs bg-white px-2 py-1 rounded block mt-1 font-mono">
                {txHash}
              </code>
              <a
                href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-700 mt-2"
              >
                <span>View on Explorer</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
