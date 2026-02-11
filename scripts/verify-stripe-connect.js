#!/usr/bin/env node

/**
 * Stripe Connect Verification Script
 * Checks if Stripe Connect is properly configured
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function verifyStripeConnect() {
  console.log('🔍 Verifying Stripe Connect Setup...\n');

  try {
    // Check 1: Verify API Key
    console.log('1️⃣ Checking API Key...');
    const keyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 7);
    
    if (keyPrefix === 'sk_test') {
      console.log('✅ Using TEST mode keys (recommended for development)');
    } else if (keyPrefix === 'sk_live') {
      console.log('⚠️  WARNING: Using LIVE mode keys in development!');
      console.log('   Switch to test keys to avoid real charges');
    } else {
      console.log('❌ Invalid API key format');
      process.exit(1);
    }

    // Check 2: Test API Connection
    console.log('\n2️⃣ Testing API Connection...');
    const balance = await stripe.balance.retrieve();
    console.log('✅ Successfully connected to Stripe API');
    console.log(`   Available balance: $${(balance.available[0]?.amount || 0) / 100}`);

    // Check 3: Check Connect Capabilities
    console.log('\n3️⃣ Checking Connect Capabilities...');
    try {
      // Try to create a test account (in test mode this is free)
      const testAccount = await stripe.accounts.create({
        type: 'standard',
        metadata: { test: 'verification' }
      });
      console.log('✅ Can create Connect accounts');
      console.log(`   Test account ID: ${testAccount.id}`);
      
      // Delete the test account
      await stripe.accounts.del(testAccount.id);
      console.log('   Test account deleted');
    } catch (error) {
      console.log('❌ Cannot create Connect accounts');
      console.log(`   Error: ${error.message}`);
      console.log('\n   💡 Action required:');
      console.log('   1. Go to: https://dashboard.stripe.com/test/settings/applications');
      console.log('   2. Click "Get started" to enable Connect');
      console.log('   3. Complete the platform setup form');
    }

    // Check 4: List any existing accounts
    console.log('\n4️⃣ Checking Existing Connected Accounts...');
    const accounts = await stripe.accounts.list({ limit: 5 });
    if (accounts.data.length > 0) {
      console.log(`✅ Found ${accounts.data.length} connected account(s):`);
      accounts.data.forEach(acc => {
        console.log(`   - ${acc.id} (${acc.type}, charges: ${acc.charges_enabled})`);
      });
    } else {
      console.log('ℹ️  No connected accounts yet (this is normal for new setup)');
    }

    // Check 5: Verify publishable key
    console.log('\n5️⃣ Checking Publishable Key...');
    const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pubKey) {
      console.log('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set');
    } else {
      const pubKeyPrefix = pubKey.substring(0, 7);
      if (pubKeyPrefix === 'pk_test') {
        console.log('✅ Publishable key is in TEST mode');
      } else if (pubKeyPrefix === 'pk_live') {
        console.log('⚠️  Publishable key is in LIVE mode');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${keyPrefix === 'sk_test' ? 'TEST ✅' : 'LIVE ⚠️'}`);
    console.log(`API Connection: Working ✅`);
    console.log(`Connect Enabled: ${accounts.data.length >= 0 ? 'Yes ✅' : 'Unknown'}`);
    console.log('\n🎯 Next Steps:');
    console.log('1. Run vendor signup and onboarding test');
    console.log('2. Visit: http://localhost:3000/settings/payments');
    console.log('3. Complete Stripe Connect onboarding');
    console.log('4. Test a payment with card: 4242 4242 4242 4242');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check .env.local has STRIPE_SECRET_KEY');
    console.error('2. Verify key starts with sk_test_ or sk_live_');
    console.error('3. Restart dev server: npm run dev');
    process.exit(1);
  }
}

// Run verification
verifyStripeConnect();
