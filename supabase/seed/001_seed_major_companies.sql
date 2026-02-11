-- =============================================
-- SEED MAJOR ENGINEERING COMPANIES
-- Pre-populate marketplace with real company profiles
-- These can be claimed by company representatives
-- =============================================

-- Note: Run migration 008 first to add is_claimed column

-- Insert major engineering companies
INSERT INTO company_profiles (
    company_name,
    tagline,
    description,
    website,
    phone,
    email,
    street_address,
    city,
    state,
    zip_code,
    specialties,
    certifications,
    years_in_business,
    verified,
    active,
    is_claimed,
    verification_status
) VALUES
-- 1. Bechtel Corporation
(
    'Bechtel Corporation',
    'Engineering, Procurement, Construction & Project Management',
    'Bechtel is a trusted engineering, construction and project management partner to industry and government. Differentiated by the quality of our people and our relentless drive to deliver the most successful outcomes, we align our capabilities to our customers'' objectives to create a lasting positive impact.',
    'https://www.bechtel.com',
    '571-392-6000',
    'info@bechtel.com',
    '12011 Sunset Hills Road',
    'Reston',
    'VA',
    '20190',
    ARRAY['Civil Engineering', 'Power Generation', 'Infrastructure', 'Mining & Metals', 'Oil & Gas'],
    ARRAY['ISO 9001', 'ISO 14001', 'OHSAS 18001'],
    126,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 2. AECOM
(
    'AECOM',
    'Built to Deliver a Better World',
    'AECOM is the world''s trusted infrastructure consulting firm, delivering professional services throughout the project lifecycle – from advisory, planning, design and engineering to program and construction management.',
    'https://www.aecom.com',
    '213-593-8000',
    'contact@aecom.com',
    '300 S. Grand Avenue',
    'Dallas',
    'TX',
    '75201',
    ARRAY['Infrastructure', 'Environmental', 'Energy', 'Water', 'Transportation'],
    ARRAY['ISO 9001', 'ISO 14001', 'LEED Certified'],
    34,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 3. Fluor Corporation
(
    'Fluor Corporation',
    'Building a Better Future',
    'Fluor is a global engineering, procurement, fabrication, construction and maintenance company that transforms the world by building prosperity and empowering progress.',
    'https://www.fluor.com',
    '469-398-7000',
    'corporate.communications@fluor.com',
    '6700 Las Colinas Boulevard',
    'Irving',
    'TX',
    '75039',
    ARRAY['Energy & Chemicals', 'Mining & Metals', 'Infrastructure', 'Power', 'Life Sciences'],
    ARRAY['ISO 9001', 'ISO 14001', 'ISO 45001'],
    112,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 4. Jacobs Engineering
(
    'Jacobs Engineering Group',
    'Challenging Today, Reinventing Tomorrow',
    'At Jacobs, we''re challenging today to reinvent tomorrow by solving the world''s most critical problems for thriving cities, resilient environments, mission-critical outcomes, operational advancement, scientific discovery and cutting-edge manufacturing.',
    'https://www.jacobs.com',
    '214-583-8500',
    'communications@jacobs.com',
    '1999 Bryan Street, Suite 1200',
    'Dallas',
    'TX',
    '75201',
    ARRAY['Aerospace & Defense', 'Advanced Facilities', 'Environmental', 'Infrastructure', 'Energy'],
    ARRAY['ISO 9001', 'ISO 14001', 'AS9100'],
    77,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 5. KBR, Inc.
(
    'KBR, Inc.',
    'Delivering Solutions, Changing the World',
    'KBR delivers science, technology and engineering solutions to governments and companies around the world in the areas of defense, space, aviation, government operations, energy transition, and advanced technologies.',
    'https://www.kbr.com',
    '713-753-3011',
    'communications@kbr.com',
    '601 Jefferson Street, Suite 3400',
    'Houston',
    'TX',
    '77002',
    ARRAY['Energy', 'Government Services', 'Technology Solutions', 'Sustainable Technology'],
    ARRAY['ISO 9001', 'ISO 14001', 'ISO 45001'],
    123,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 6. Black & Veatch
(
    'Black & Veatch',
    'Building a World of Difference',
    'Black & Veatch is an employee-owned engineering, procurement, consulting and construction company with a more than 100-year track record of innovation in sustainable infrastructure.',
    'https://www.bv.com',
    '913-458-2000',
    'media@bv.com',
    '11401 Lamar Avenue',
    'Overland Park',
    'KS',
    '66211',
    ARRAY['Power', 'Water', 'Telecommunications', 'Oil & Gas', 'Federal'],
    ARRAY['ISO 9001', 'ISO 14001', 'ISO 55001'],
    110,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 7. HDR, Inc.
(
    'HDR, Inc.',
    'Creating Connected Communities',
    'HDR is an employee-owned design firm specializing in engineering, architecture, environmental and construction services. We''re ranked No. 1 in transportation and No. 6 overall on Engineering News-Record''s Top 500 Design Firms list.',
    'https://www.hdrinc.com',
    '402-399-1000',
    'contact@hdrinc.com',
    '1917 S. 67th Street',
    'Omaha',
    'NE',
    '68106',
    ARRAY['Transportation', 'Water', 'Architecture', 'Environmental', 'Energy'],
    ARRAY['ISO 9001', 'LEED Certified', 'Envision'],
    108,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 8. Parsons Corporation
(
    'Parsons Corporation',
    'Engineering a Better World',
    'Parsons is a leading disruptive technology provider in the national security and global infrastructure markets, with capabilities across defense, intelligence, security, and infrastructure protection.',
    'https://www.parsons.com',
    '626-440-2000',
    'mediarelations@parsons.com',
    '5875 Trinity Parkway, Suite 300',
    'Centreville',
    'VA',
    '20120',
    ARRAY['Defense', 'Intelligence', 'Infrastructure', 'Transportation', 'Water & Environment'],
    ARRAY['ISO 9001', 'ISO 14001', 'ISO 27001', 'CMMI Level 3'],
    80,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 9. WSP USA
(
    'WSP USA',
    'Future Ready',
    'WSP USA is the U.S. operating company of WSP, one of the world''s leading engineering and professional services firms. We provide engineering and design services to optimize the social, economic and environmental outcomes of projects.',
    'https://www.wsp.com/en-us',
    '212-284-7100',
    'info@wsp.com',
    '1 Penn Plaza',
    'New York',
    'NY',
    '10119',
    ARRAY['Transportation', 'Infrastructure', 'Environment', 'Buildings', 'Energy'],
    ARRAY['ISO 9001', 'ISO 14001', 'ISO 45001', 'Envision'],
    128,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
),

-- 10. Wood Group
(
    'Wood',
    'Unlock Solutions to Critical Challenges',
    'Wood is a global leader in consulting and engineering across energy and the built environment, helping to unlock solutions to critical challenges in energy and materials, the environment and our infrastructure.',
    'https://www.woodplc.com',
    '832-636-0123',
    'info-usa@woodplc.com',
    '9401 Southwest Freeway',
    'Houston',
    'TX',
    '77074',
    ARRAY['Energy', 'Chemicals', 'Environment & Infrastructure', 'Operations Solutions'],
    ARRAY['ISO 9001', 'ISO 14001', 'ISO 45001'],
    162,
    TRUE,
    TRUE,
    FALSE,
    'unclaimed'
);

-- Add comment
COMMENT ON COLUMN company_profiles.is_claimed IS 'TRUE if company has been claimed by a verified representative';
COMMENT ON COLUMN company_profiles.verification_status IS 'Status: unclaimed, pending, verified, rejected';
