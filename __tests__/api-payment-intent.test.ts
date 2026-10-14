/**
 * API Route Tests - Create Payment Intent
 * @jest-environment node
 *
 * Rewritten Oct 9, 2026 to match the CURRENT route contract:
 *   - Handles both products (type='product') and services (default).
 *   - Resolves the seller via `company:company_profiles(id, owner_id)` (products)
 *     or `provider:profiles(...)` (services).
 *   - Direct Charge + 10% application fee ONLY when the seller has a
 *     charges-enabled Stripe Connect account; otherwise platform-direct fallback.
 *   - Writes a `pending_payment` row to `marketplace_orders` (the unified ledger).
 *   - Response: { clientSecret, paymentIntentId, amount (cents), currency, directCharge }
 */
import { POST as POSTHandler } from '@/app/api/stripe/create-payment-intent/route';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Next.js route handlers are typed to accept NextRequest, but these tests build
// plain Request-like objects. Wrap the handler so the tests stay framework-agnostic.
const POST = (request: any) => POSTHandler(request as any);

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
    },
  }));
});

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock email sends (fire-and-forget in the route; avoid Resend in tests)
jest.mock('@/lib/email', () => ({
  sendNewOrderEmailVendor: jest.fn().mockResolvedValue(undefined),
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
}));

// The route calls getStripe() which throws without a secret key.
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

// Mock global fetch (route fires /api/feed/auto-post, fire and forget)
global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

// ── Fixtures ────────────────────────────────────────────────────────
const mockProduct = {
  id: 'product-123',
  name: 'Test Product',
  description: 'Test Description',
  price: 5000, // dollars
  category: 'CNC Machining',
  is_active: true,
  company_id: 'company-123',
  company: { id: 'company-123', owner_id: 'seller-123' },
};

const mockService = {
  id: 'service-123',
  title: 'Test Service',
  description: 'Test Service Description',
  price: 2500, // dollars
  category: 'Mechanical Engineering',
  active: true,
  provider_id: 'seller-123',
  provider: { id: 'seller-123', full_name: 'Seller', email: 'seller@ppf.test', company_id: 'company-123' },
};

const mockConnectAccount = {
  stripe_account_id: 'acct_test123',
  charges_enabled: true,
  payouts_enabled: true,
};

const mockProfile = { id: 'user-123', full_name: 'Buyer', email: 'buyer@ppf.test' };

// ── Test helpers ────────────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    nextUrl: { origin: 'http://localhost:3000' },
  };
}

interface MockState {
  product?: any;
  service?: any;
  connectAccount?: any;
  profile?: any;
  insertError?: any;
  user?: any;
}

function buildSupabaseMock(state: MockState = {}) {
  const s = {
    product: state.product !== undefined ? state.product : mockProduct,
    service: state.service !== undefined ? state.service : mockService,
    connectAccount: state.connectAccount !== undefined ? state.connectAccount : mockConnectAccount,
    profile: state.profile !== undefined ? state.profile : mockProfile,
    insertError: state.insertError !== undefined ? state.insertError : null,
    user: state.user !== undefined ? state.user : { id: 'user-123' },
  };

  const builder = (result: any) => {
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      single: jest.fn(async () => result),
      maybeSingle: jest.fn(async () => result),
      insert: jest.fn(async () => ({ data: null, error: s.insertError })),
      order: jest.fn(() => chain),
      range: jest.fn(() => chain),
    };
    return chain;
  };

  const instance = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: s.user }, error: null }),
    },
    from: jest.fn((table: string) => {
      switch (table) {
        case 'products':
          return builder({ data: s.product, error: s.product ? null : { message: 'Not found' } });
        case 'services':
          return builder({ data: s.service, error: s.service ? null : { message: 'Not found' } });
        case 'stripe_connect_accounts':
          return builder({ data: s.connectAccount, error: null });
        case 'marketplace_orders':
          return builder({ data: null, error: s.insertError });
        case 'profiles':
          return builder({ data: s.profile, error: null });
        default:
          return builder({ data: null, error: null });
      }
    }),
  };

  return instance;
}

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

    mockSupabaseInstance = buildSupabaseMock();
    (createClient as jest.Mock).mockResolvedValue(mockSupabaseInstance);
  });

  it('creates a payment intent for a product with Direct Charge (10% fee)', async () => {
    const request = makeRequest({ productId: 'product-123', type: 'product' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clientSecret).toBe('pi_test123_secret_test');
    expect(data.paymentIntentId).toBe('pi_test123');
    expect(data.amount).toBe(500000); // $5000 in cents
    expect(data.currency).toBe('usd');
    expect(data.directCharge).toBe(true);

    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500000,
        application_fee_amount: 50000, // 10% of $5000
        transfer_data: { destination: 'acct_test123' },
        metadata: expect.objectContaining({
          order_type: 'product',
          product_id: 'product-123',
          product_name: 'Test Product',
          seller_id: 'seller-123',
          buyer_id: 'user-123',
          platform_fee_cents: '50000',
        }),
      }),
      expect.objectContaining({ stripeAccount: 'acct_test123' })
    );
  });

  it('falls back to a platform-direct charge when the seller has no Connect account', async () => {
    mockSupabaseInstance = buildSupabaseMock({ connectAccount: null });
    (createClient as jest.Mock).mockResolvedValue(mockSupabaseInstance);

    const request = makeRequest({ productId: 'product-123', type: 'product' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.directCharge).toBe(false);

    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500000,
        metadata: expect.objectContaining({ order_type: 'product' }),
      })
    );
    // No application fee / transfer when not using Connect.
    const call = mockStripeInstance.paymentIntents.create.mock.calls[0][0];
    expect(call.application_fee_amount).toBeUndefined();
    expect(call.transfer_data).toBeUndefined();
  });

  it('creates a payment intent for a service (default type)', async () => {
    const request = makeRequest({ productId: 'service-123' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.directCharge).toBe(true);

    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 250000, // $2500 in cents
        application_fee_amount: 25000,
        metadata: expect.objectContaining({
          order_type: 'service',
          service_id: 'service-123',
          service_title: 'Test Service',
          seller_id: 'seller-123',
        }),
      }),
      expect.objectContaining({ stripeAccount: 'acct_test123' })
    );
  });

  it('returns 400 when product ID is missing', async () => {
    const request = makeRequest({});

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

    const request = makeRequest({ productId: 'product-123', type: 'product' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when product is not found', async () => {
    mockSupabaseInstance = buildSupabaseMock({ product: null });
    (createClient as jest.Mock).mockResolvedValue(mockSupabaseInstance);

    const request = makeRequest({ productId: 'invalid-id', type: 'product' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Product not found');
  });

  it('returns 404 when service is not found', async () => {
    mockSupabaseInstance = buildSupabaseMock({ service: null });
    (createClient as jest.Mock).mockResolvedValue(mockSupabaseInstance);

    const request = makeRequest({ productId: 'invalid-id' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Service not found');
  });

  it('returns 409 when the seller has no linked profile', async () => {
    mockSupabaseInstance = buildSupabaseMock({
      product: { ...mockProduct, company: { id: 'company-123', owner_id: null } },
    });
    (createClient as jest.Mock).mockResolvedValue(mockSupabaseInstance);

    const request = makeRequest({ productId: 'product-123', type: 'product' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('The seller has no linked profile');
  });

  it('records a pending_payment row in marketplace_orders', async () => {
    const request = makeRequest({ productId: 'product-123', type: 'product' });

    await POST(request);

    // Capture the actual builder returned by from('marketplace_orders') so we
    // assert on the insert mock the route actually called.
    const ordersCallIndex = mockSupabaseInstance.from.mock.calls.findIndex(
      (c: any) => c[0] === 'marketplace_orders'
    );
    expect(ordersCallIndex).toBeGreaterThanOrEqual(0);

    const ordersResult = mockSupabaseInstance.from.mock.results[ordersCallIndex];
    expect(ordersResult).toBeDefined();
    expect(ordersResult.value.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_number: expect.stringMatching(/^PPF-PRD-/),
        order_type: 'product',
        buyer_id: 'user-123',
        seller_id: 'seller-123',
        seller_company_id: 'company-123',
        subtotal_amount: 4500, // $5000 - 10% fee
        fee_amount: 500,
        total_amount: 5000,
        currency: 'usd',
        stripe_payment_intent_id: 'pi_test123',
        stripe_account_id: 'acct_test123',
        status: 'pending_payment',
        payout_status: 'not_held',
      })
    );
  });

  it('handles Stripe API errors', async () => {
    mockStripeInstance.paymentIntents.create.mockRejectedValue(
      new Error('Stripe API error')
    );

    const request = makeRequest({ productId: 'product-123', type: 'product' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Stripe API error');
  });
});
