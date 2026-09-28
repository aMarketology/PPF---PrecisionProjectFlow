'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CheckoutFormProps {
  productId: string;
  amount: number;
  currency: string;
}

export default function CheckoutForm({ productId, amount, currency }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?product_id=${productId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        console.error('Payment error:', error);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        router.push(`/checkout/success?payment_intent=${paymentIntent.id}&product_id=${productId}`);
      } else {
        toast.error('Payment processing...');
      }
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(err.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number, curr?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (curr || 'USD').toUpperCase(),
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="bg-slate-900/50 rounded-lg p-4">
        <PaymentElement />
      </div>

      {/* Test Card Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-400 font-semibold mb-2">🧪 Test Mode - Use Test Cards</p>
        <div className="space-y-1 text-xs text-slate-400">
          <p><strong className="text-slate-300">Success:</strong> 4242 4242 4242 4242</p>
          <p><strong className="text-slate-300">Decline:</strong> 4000 0000 0000 0002</p>
          <p><strong className="text-slate-300">3D Secure:</strong> 4000 0025 0000 3155</p>
          <p className="text-slate-500 mt-2">Use any future expiry date, any CVC, and any ZIP</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
      >
        {isProcessing ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay {formatPrice(amount, currency)}
          </>
        )}
      </button>

      {/* Security Note */}
      <p className="text-center text-xs text-slate-500">
        Your payment information is encrypted and secure. We never store your card details.
      </p>
    </form>
  );
}
