const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. Look up users by email
  const emails = ['bootysweat.808@gmail.com', 'reinard.j@gmail.com', 'jg.reinard@gmail.com'];
  console.log('=== Looking up users ===');
  const foundUsers = [];
  for (const email of emails) {
    const { data } = await supabase.auth.admin.listUsers();
    const match = (data?.users || []).find(u => u.email === email);
    if (match) {
      console.log('FOUND:', email, '| id:', match.id);
      foundUsers.push({ email, id: match.id });
    } else {
      console.log('NOT FOUND:', email);
    }
  }

  // 2. Check if PPF company exists
  const { data: existing } = await supabase.from('company_profiles')
    .select('id, company_name, owner_id').ilike('company_name', '%precision project flow%');
  console.log('\n=== Existing PPF companies ===');
  console.log(JSON.stringify(existing, null, 2));

  // 3. Create company if not exists
  if (!existing || existing.length === 0) {
    console.log('\n=== Creating Precision Project Flow company ===');
    const ownerId = foundUsers[0]?.id;
    if (!ownerId) { console.log('ERROR: bootysweat.808@gmail.com not found as user'); process.exit(1); }

    const { data: company, error } = await supabase.from('company_profiles').insert({
      owner_id: ownerId,
      company_name: 'Precision Project Flow',
      slug: 'precision-project-flow',
      industry: 'Software Engineering',
      description: 'The B2B marketplace connecting engineers and vendors with clients for precision manufacturing and engineering services.',
      website: 'https://precisionprojectflow.com',
      email: 'bootysweat.808@gmail.com',
      city: 'Buffalo',
      state: 'NY',
      specialties: ['Engineering Marketplace', 'Precision Manufacturing', 'B2B Platform'],
      is_verified: true,
    }).select('id').single();

    if (error) { console.error('Create company error:', error.message); process.exit(1); }
    console.log('Company created:', company.id);

    // Add owner as company_member
    await supabase.from('company_members').insert({
      company_id: company.id, user_id: ownerId, role: 'owner', status: 'active',
    });
    console.log('Owner added as member');

    // Create General channel
    const { data: chanId } = await supabase.rpc('ensure_company_channel', {
      p_company_id: company.id, p_user_id: ownerId,
    });
    console.log('General channel created:', chanId);

    // Invite other users
    for (const u of foundUsers.slice(1)) {
      const { data: result } = await supabase.rpc('invite_company_member', {
        p_company_id: company.id, p_user_id: u.id, p_role: 'admin',
      });
      console.log('Invited', u.email, ':', result);
    }
  } else {
    console.log('\nCompany already exists. Inviting missing members...');
    const companyId = existing[0].id;

    for (const u of foundUsers) {
      const { data: result } = await supabase.rpc('invite_company_member', {
        p_company_id: companyId, p_user_id: u.id, p_role: u.email === 'bootysweat.808@gmail.com' ? 'owner' : 'admin',
      });
      console.log('Invited/ensured', u.email, ':', result);
    }
  }

  console.log('\n=== Done ===');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });