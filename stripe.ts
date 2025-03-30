import { loadStripe } from '@stripe/stripe-js';

// Load Stripe with the publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Function to load Stripe script ahead of time
export const loadStripeScript = () => {
  // This just ensures the Promise is initiated
  return stripePromise;
};

// Function to get the Stripe instance
export const getStripe = () => {
  return stripePromise;
};
