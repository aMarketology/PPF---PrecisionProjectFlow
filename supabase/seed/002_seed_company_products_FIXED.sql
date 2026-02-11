-- =============================================
-- SEED SAMPLE PRODUCTS/SERVICES
-- Create realistic engineering services for each company
-- =============================================

-- Note: This assumes companies have been seeded first
-- Product prices are in cents (Stripe format)

-- Get company IDs (these will vary in your database)
-- You'll need to replace these with actual UUIDs after running the company seed

-- For Bechtel
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Infrastructure Design & Planning',
    'Comprehensive infrastructure design services including roads, bridges, airports, and rail systems. Our team brings 125+ years of experience delivering major infrastructure projects worldwide. Includes feasibility studies, preliminary design, detailed engineering, and construction support.',
    2500000, -- $25,000
    'Civil Engineering',
    90,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Bechtel Corporation'
UNION ALL
SELECT 
    id,
    'Power Plant Engineering Services',
    'Full-service power generation facility design including nuclear, fossil fuel, and renewable energy plants. Covers conceptual design through commissioning with focus on efficiency, safety, and regulatory compliance.',
    5000000, -- $50,000
    'Power Generation',
    180,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Bechtel Corporation'
UNION ALL
SELECT 
    id,
    'Mining Facility Development',
    'End-to-end mining and metals facility engineering including mine planning, processing plant design, tailings management, and environmental compliance. Expert in copper, gold, iron ore, and lithium operations.',
    7500000, -- $75,000
    'Mining & Metals',
    240,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Bechtel Corporation';

-- For AECOM
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Urban Transportation Master Planning',
    'Strategic transportation planning for cities and metropolitan areas. Includes multimodal integration, traffic modeling, public transit optimization, and sustainable mobility solutions. Proven track record across 150+ cities globally.',
    1500000, -- $15,000
    'Transportation',
    120,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'AECOM'
UNION ALL
SELECT 
    id,
    'Water Treatment Plant Design',
    'Complete water and wastewater treatment facility design services. Expertise in membrane bioreactors, advanced oxidation, nutrient removal, and water reuse systems. Compliance with EPA and state regulations guaranteed.',
    3000000, -- $30,000
    'Water',
    150,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'AECOM'
UNION ALL
SELECT 
    id,
    'Environmental Impact Assessment',
    'Comprehensive environmental studies for major development projects including NEPA documentation, air quality analysis, wetlands delineation, endangered species surveys, and mitigation planning.',
    800000, -- $8,000
    'Environmental',
    60,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'AECOM'
UNION ALL
SELECT 
    id,
    'Smart Building Design Services',
    'Sustainable commercial building design with integrated IoT systems, energy management, and LEED certification support. Specializing in office towers, data centers, and mixed-use developments.',
    2000000, -- $20,000
    'Architecture',
    180,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'AECOM';

-- For Fluor
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Chemical Plant Process Engineering',
    'Process design and optimization for petrochemical, specialty chemical, and pharmaceutical facilities. Includes P&IDs, equipment specifications, HAZOP studies, and process simulation using Aspen Plus.',
    4500000, -- $45,000
    'Energy & Chemicals',
    200,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Fluor Corporation'
UNION ALL
SELECT 
    id,
    'LNG Terminal Engineering',
    'Liquefied natural gas terminal design including receiving facilities, storage tanks, vaporization systems, and marine works. Experience with 50+ LNG projects worldwide.',
    8000000, -- $80,000
    'Oil & Gas',
    300,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Fluor Corporation'
UNION ALL
SELECT 
    id,
    'Mining Maintenance Programs',
    'Comprehensive maintenance engineering for mining operations including predictive maintenance systems, equipment reliability analysis, and spare parts optimization. Reduces downtime by 30%.',
    1200000, -- $12,000
    'Mining & Metals',
    45,
    FALSE,
    TRUE
FROM company_profiles WHERE company_name = 'Fluor Corporation';

-- For Jacobs
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Aerospace Facility Design',
    'Specialized design for aerospace manufacturing, testing, and R&D facilities. Includes cleanroom design, vibration isolation, electromagnetic shielding, and security integration. AS9100 compliant.',
    6000000, -- $60,000
    'Aerospace & Defense',
    210,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Jacobs Engineering Group'
UNION ALL
SELECT 
    id,
    'Mission-Critical Data Center',
    'Tier III/IV data center design with redundant power, cooling, and network infrastructure. Includes computational fluid dynamics modeling, energy optimization, and 24/7 uptime design.',
    5500000, -- $55,000
    'Advanced Facilities',
    180,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Jacobs Engineering Group'
UNION ALL
SELECT 
    id,
    'Environmental Remediation Engineering',
    'Site cleanup and restoration services for contaminated industrial sites. Includes soil vapor extraction, groundwater treatment, brownfield redevelopment, and regulatory closure documentation.',
    2500000, -- $25,000
    'Environmental',
    365,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Jacobs Engineering Group';

-- For KBR
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Ammonia Production Technology',
    'Proprietary ammonia synthesis process design and licensing. Industry-leading energy efficiency with 30+ reference plants worldwide. Includes technology transfer and operator training.',
    10000000, -- $100,000
    'Sustainable Technology',
    240,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'KBR, Inc.'
UNION ALL
SELECT 
    id,
    'Refinery Optimization Study',
    'Comprehensive refinery performance analysis and optimization. Uses advanced process simulation to identify bottlenecks and improve yields. Typical ROI < 12 months.',
    900000, -- $9,000
    'Energy',
    60,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'KBR, Inc.'
UNION ALL
SELECT 
    id,
    'Defense Installation Support',
    'Engineering and technical services for military bases and government facilities including infrastructure upgrades, security systems, and energy resilience solutions.',
    3500000, -- $35,000
    'Government Services',
    120,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'KBR, Inc.';

-- For Black & Veatch
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Utility-Scale Solar EPC',
    'Complete engineering, procurement, and construction services for large-scale solar photovoltaic plants (50-500 MW). Includes tracker selection, inverter sizing, and grid interconnection studies.',
    12000000, -- $120,000
    'Power',
    365,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Black & Veatch'
UNION ALL
SELECT 
    id,
    'Municipal Water Distribution Design',
    'Water distribution system design and hydraulic modeling for cities and water utilities. Includes pipe network optimization, pump station design, and pressure zone analysis using WaterGEMS.',
    1800000, -- $18,000
    'Water',
    90,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Black & Veatch'
UNION ALL
SELECT 
    id,
    'Telecom Network Infrastructure',
    '5G network infrastructure design including fiber backbone, cell tower placement optimization, and distributed antenna systems. Expertise in dense urban deployments.',
    2200000, -- $22,000
    'Telecommunications',
    120,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Black & Veatch';

-- For HDR
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Highway Corridor Study',
    'Comprehensive highway planning and design services including traffic forecasting, geometric design, drainage, pavement design, and construction phasing. Complete NEPA compliance support.',
    2800000, -- $28,000
    'Transportation',
    180,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'HDR, Inc.'
UNION ALL
SELECT 
    id,
    'Bridge Rehabilitation Engineering',
    'Structural assessment and rehabilitation design for aging bridges. Includes load rating, seismic retrofitting, deck replacement, and foundation strengthening. 500+ bridges designed.',
    1500000, -- $15,000
    'Transportation',
    120,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'HDR, Inc.'
UNION ALL
SELECT 
    id,
    'Sustainable Campus Master Planning',
    'Holistic planning for university and corporate campuses integrating buildings, infrastructure, landscape, and sustainability goals. LEED and SITES certified professionals.',
    1000000, -- $10,000
    'Architecture',
    150,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'HDR, Inc.';

-- For Parsons
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Cybersecurity Infrastructure Design',
    'Critical infrastructure protection and cybersecurity engineering for government and defense applications. NIST 800-53 compliant. Includes threat modeling, network segmentation, and SCADA security.',
    4000000, -- $40,000
    'Defense',
    150,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Parsons Corporation'
UNION ALL
SELECT 
    id,
    'Intelligent Transportation Systems',
    'Advanced traffic management system design including adaptive signal control, connected vehicle integration, and real-time traveler information. Proven to reduce congestion by 25%.',
    3200000, -- $32,000
    'Transportation',
    180,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Parsons Corporation'
UNION ALL
SELECT 
    id,
    'Critical Facility Security Assessment',
    'Comprehensive security vulnerability assessment for high-value assets including physical security, access control, surveillance systems, and blast protection. Classified projects welcome.',
    850000, -- $8,500
    'Intelligence',
    90,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Parsons Corporation';

-- For WSP USA
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Transit-Oriented Development Planning',
    'Integrated land use and transportation planning around transit stations. Includes market analysis, zoning recommendations, parking studies, and pedestrian connectivity design.',
    1600000, -- $16,000
    'Transportation',
    120,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'WSP USA'
UNION ALL
SELECT 
    id,
    'Green Building Certification Support',
    'Expert consulting for LEED, WELL, Living Building Challenge, and Passive House certifications. Our team has certified 1,000+ sustainable buildings with 98% success rate.',
    500000, -- $5,000
    'Buildings',
    60,
    FALSE,
    TRUE
FROM company_profiles WHERE company_name = 'WSP USA'
UNION ALL
SELECT 
    id,
    'Climate Adaptation Strategy',
    'Climate resilience planning for cities and infrastructure owners. Includes vulnerability assessment, adaptation measures, and cost-benefit analysis for sea level rise, flooding, and extreme weather.',
    2400000, -- $24,000
    'Environment',
    180,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'WSP USA';

-- For Wood
INSERT INTO products (
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    requires_consultation,
    is_active
) 
SELECT 
    id,
    'Offshore Platform Engineering',
    'Fixed and floating offshore oil & gas platform design including topsides, jackets, mooring systems, and subsea tie-ins. Experience in Gulf of Mexico, North Sea, and West Africa.',
    9000000, -- $90,000
    'Energy',
    300,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Wood'
UNION ALL
SELECT 
    id,
    'Emissions Reduction Engineering',
    'Carbon capture, utilization, and storage (CCUS) engineering services. Includes process design for CO2 capture, compression, pipeline transport, and geological sequestration.',
    3800000, -- $38,000
    'Environment & Infrastructure',
    180,
    TRUE,
    TRUE
FROM company_profiles WHERE company_name = 'Wood'
UNION ALL
SELECT 
    id,
    'Asset Integrity Management',
    'Comprehensive integrity management programs for oil & gas facilities including risk-based inspection, corrosion management, and fitness-for-service assessments. Extends asset life by 15+ years.',
    1400000, -- $14,000
    'Operations Solutions',
    90,
    FALSE,
    TRUE
FROM company_profiles WHERE company_name = 'Wood';

-- Add helpful comment
COMMENT ON TABLE products IS 'Engineering products and services offered by companies on the marketplace';
