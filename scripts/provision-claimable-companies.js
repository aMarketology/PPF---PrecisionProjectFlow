#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const companies = [
  {
    company_name: 'Central Plains Steel Co.',
    slug: 'central-plains-steel-co',
    description: 'Central Plains Steel Co. supplies steel products and services to industrial and commercial customers in the Wichita area.',
    industry: 'Mechanical Engineering',
    specialties: ['Steel Supply', 'Metal Fabrication', 'Industrial Materials'],
    email: 'jwill@cpssteel.com',
    phone: '+1 316-636-4500',
    website: null,
    city: 'Wichita',
    state: 'KS',
    contact_name: 'Jeremy Will',
    contact_title: 'Inside Sales Account Manager',
    contact_email: 'jwill@cpssteel.com',
    contact_phone: '+1 785-770-7759',
    contact_mobile: '+1 785-770-7759',
    contact_linkedin: 'https://linkedin.com/in/jawill',
  },
  {
    company_name: 'Williams Valve Corp.',
    slug: 'williams-valve-corp',
    description: 'Williams Valve Corp. provides industrial valve solutions and fluid-control products for engineering and manufacturing customers.',
    industry: 'Mechanical Engineering',
    specialties: ['Industrial Valves', 'Fluid Control', 'Mechanical Components'],
    email: null,
    phone: '+1 800-221-1115',
    website: 'https://williamsvalve.com',
    city: 'Long Island City',
    state: 'NY',
    contact_name: 'Ifeanyi Okpara',
    contact_title: 'Inside Sales Manager',
    contact_email: null,
    contact_phone: '+1 516-410-7563',
    contact_mobile: '+1 516-410-7563',
    contact_linkedin: 'https://linkedin.com/in/ifeanyi-henry-okpara-454680b',
  },
  {
    company_name: 'Precision Project Flow',
    slug: 'precision-project-flow',
    description: 'Precision Project Flow is a B2B marketplace connecting engineering and manufacturing teams with qualified suppliers and service providers.',
    industry: 'Software Engineering',
    specialties: ['Engineering Marketplace', 'Precision Manufacturing', 'B2B Platform'],
    email: 'precisionprojectflow@gmail.com',
    phone: null,
    website: 'https://precisionprojectflow.com',
    city: null,
    state: null,
    contact_name: 'Josh',
    contact_title: 'Owner',
    contact_email: 'precisionprojectflow@gmail.com',
    contact_phone: null,
    contact_mobile: null,
    contact_linkedin: null,
  },
  {
    company_name: 'Equipment & Controls, Inc.',
    slug: 'equipment-and-controls-inc',
    description: 'Equipment & Controls, Inc. provides industrial automation, process control, and electrical systems solutions for engineering and manufacturing teams.',
    industry: 'Electrical Engineering',
    specialties: ['Industrial Automation', 'Process Control', 'Electrical Systems'],
    email: 'piper.mclaughlin@eci.us',
    phone: '+1 724-746-3700',
    website: 'https://eci.us',
    city: 'Houston',
    state: 'PA',
    contact_name: 'Piper McLaughlin',
    contact_title: 'Inside Sales Manager',
    contact_email: 'piper.mclaughlin@eci.us',
    contact_phone: '+1 724-746-3700',
    contact_mobile: '+1 724-746-3700',
    contact_linkedin: 'https://www.linkedin.com/in/piper-mclaughlin-3627b91a7',
  },
  {
    company_name: 'Gritton & Associates',
    slug: 'gritton-and-associates',
    description: 'Gritton & Associates is an engineering services firm supporting industrial and commercial projects in the Salt Lake City area.',
    industry: 'Consulting Services',
    specialties: ['Engineering Consulting', 'Project Management', 'Technical Services'],
    email: 'mwoodfield@gritton.com',
    phone: '+1 801-486-0767',
    website: 'https://gritton.com',
    city: 'Salt Lake City',
    state: 'UT',
    contact_name: 'Mariah Woodfield',
    contact_title: 'Inside Sales Project Manager',
    contact_email: 'mwoodfield@gritton.com',
    contact_phone: '+1 801-486-0767',
    contact_mobile: '+1 801-486-0767',
    contact_linkedin: 'https://www.linkedin.com/in/mariah-woodfield',
  },
];

async function provisionCompany(company) {
  const { data: existing, error: lookupError } = await supabase
    .from('company_profiles')
    .select('id, owner_id')
    .eq('slug', company.slug)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const claimableFields = {
    ...company,
    owner_id: null,
    is_claimed: false,
    claimed_by: null,
    claimed_at: null,
    source: 'outreach_listing',
  };

  const query = existing
    ? supabase.from('company_profiles').update(claimableFields).eq('id', existing.id)
    : supabase.from('company_profiles').insert(claimableFields);
  const { error } = await query;
  if (error) throw error;

  console.log(`${existing ? 'Updated' : 'Created'} claimable listing: ${company.company_name}`);
}

async function main() {
  for (const company of companies) await provisionCompany(company);
}

main().catch((error) => {
  console.error('Provisioning failed:', error.message);
  process.exit(1);
});