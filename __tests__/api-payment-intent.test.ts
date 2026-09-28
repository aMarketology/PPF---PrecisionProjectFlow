/**
 * API Route Tests - Create Payment Intent
 * @jest-environment node
 */
import { POST as POSTHandler } from '@/app/api/stripe/create-payment-intent/route';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Next.js route handlers are typed to accept NextRequest, but these tests build
// plain Request objects. Wrap the handler so the tests stay framework-agnostic.
const POST = (request: Request) => POSTHandler(request as any);

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
  }));
});

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockProduct = {
  id: 'product-123',
  name: 'Test Product',
  description: 'Test Description',
  price: 5000,
  currency: 'usd',
  is_active: true,
  company_profiles: {
    id: 'company-123',
    company_name: 'Test Company',
    stripe_connect_accounts: [
      {
        stripe_account_id: 'acct_test123',
      },
    ],
  },
};

describe('Create Payment Intent API', () => {
  let mockStripeInstance: any;
  let mockSupabaseInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Stripe instance
    mockStripeInstance = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({
          id: 'pi_test123',
          client_secret: 'pi_test123_secret_test',
          amount: 500000,
          currency: 'usd',
        }),
      },
    };

    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(
      () => mockStripeInstance as any
    );

    // Mock Supabase instance
    mockSupabaseInstance = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: mockProduct,
                error: null,
              })),
            })),
          })),
        })),
        insert: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseInstance);
  });

  it('creates a payment intent successfully', async () => {
    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clientSecret).toBe('pi_test123_secret_test');
    expect(data.paymentIntentId).toBe('pi_test123');
    expect(data.amount).toBe(5000);
    expect(data.currency).toBe('usd');
  });

  it('calculates platform fee correctly (10%)', async () => {
    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    await POST(request);

    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500000, // $5000 in cents
        application_fee_amount: 50000, // 10% = $500 in cents
      })
    );
  });

  it('includes product metadata in payment intent', async () => {
    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    await POST(request);

    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          product_id: 'product-123',
          product_name: 'Test Product',
          company_id: 'company-123',
          company_name: 'Test Company',
          customer_id: 'user-123',
        }),
      })
    );
  });

  it('returns 400 when product ID is missing', async () => {
    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Product ID is required');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabaseInstance.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when product is not found', async () => {
    mockSupabaseInstance.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Not found' },
            })),
          })),
        })),
      })),
    }));

    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'invalid-id' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Product not found');
  });

  it('returns 400 when company has no Stripe Connect account', async () => {
    const productWithoutStripe = {
      ...mockProduct,
      company_profiles: {
        ...mockProduct.company_profiles,
        stripe_connect_accounts: [],
      },
    };

    mockSupabaseInstance.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: productWithoutStripe,
              error: null,
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Company has not connected their Stripe account');
  });

  it('stores payment intent in database', async () => {
    const insertMock = jest.fn(() => ({
      data: null,
      error: null,
    }));

    mockSupabaseInstance.from = jest.fn((table: string) => {
      if (table === 'payment_intents') {
        return {
          insert: insertMock,
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: mockProduct,
                error: null,
              })),
            })),
          })),
        })),
      };
    });

    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    await POST(request);

    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        stripe_payment_intent_id: 'pi_test123',
        customer_id: 'user-123',
        product_id: 'product-123',
        company_id: 'company-123',
        amount: 5000,
        currency: 'usd',
        platform_fee: 500, // 10% of $5000
        status: 'created',
      }),
    ]);
  });

  it('handles Stripe API errors', async () => {
    mockStripeInstance.paymentIntents.create.mockRejectedValue(
      new Error('Stripe API error')
    );

    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Stripe API error');
  });

  it('handles different currencies', async () => {
    const productInEur = {
      ...mockProduct,
      currency: 'eur',
      price: 4500,
    };

    mockSupabaseInstance.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: productInEur,
              error: null,
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    const request = new Request('http://localhost:3000/api/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ productId: 'product-123' }),
    });

    await POST(request);

    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 450000, // €4500 in cents
        currency: 'eur',
        application_fee_amount: 45000, // 10% = €450 in cents
      })
    );
  });
});
