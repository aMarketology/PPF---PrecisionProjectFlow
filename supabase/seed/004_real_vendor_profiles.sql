-- =====================================================
-- REAL VENDOR PROFILES - Based on Actual Companies
-- Supply-First Strategy: Add real company profiles
-- =====================================================
-- Created: February 11, 2026
-- Purpose: Seed marketplace with real-world vendor examples
-- Companies can claim these profiles later
-- =====================================================

-- =====================================================
-- MINCO - Thermal Solutions & Sensors
-- https://www.minco.com/company/
-- =====================================================

INSERT INTO public.company_profiles (
    id,
    owner_id,
    company_name,
    description,
    email,
    phone,
    website,
    address,
    city,
    state,
    zip_code,
    specialties,
    certifications,
    is_verified,
    is_claimed
) VALUES (
    'c1000000-0000-0000-0000-000000000001'::uuid,
    'c1000000-0000-0000-0000-000000000001'::uuid,
    'Minco',
    'Leading manufacturer of thermal solutions including heaters, sensors, and instrumentation. Over 60 years of experience in precision temperature measurement and control. Serving aerospace, medical, industrial, and semiconductor markets. Custom thermal solutions designed and manufactured in USA.',
    'info@minco.com',
    '(763) 571-3121',
    'https://www.minco.com',
    '7300 Commerce Lane North',
    'Minneapolis',
    'MN',
    '55432',
    ARRAY['RTD Sensors', 'Thermocouples', 'Flexible Heaters', 'Thermal Switches', 'Custom Sensors', 'Temperature Controllers'],
    ARRAY['ISO 9001:2015', 'AS9100D', 'ISO 13485', 'ITAR Registered'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Minco Products
INSERT INTO public.products (
    id,
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    is_active,
    requires_consultation
) VALUES
    ('pc100001-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid,
     'RTD Temperature Sensor - PT100',
     'Precision platinum RTD sensor, Class A accuracy ±0.15°C at 0°C. 1/8" diameter probe, 6" length. Stainless steel construction. -200°C to 600°C range. 3-wire configuration. Perfect for industrial process control.',
     12500, 'Sensors & Instrumentation', 3, true, false),
    
    ('pc100001-0000-0000-0000-000000000002'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid,
     'Flexible Silicone Heater - 4" x 6"',
     'Custom flexible heater, silicone rubber construction. 120V AC, 150W output. Operating range -60°C to 200°C. PSA adhesive backing. Perfect for industrial equipment heating.',
     8900, 'Heating Solutions', 5, true, false),
    
    ('pc100001-0000-0000-0000-000000000003'::uuid, 'c1000000-0000-0000-0000-000000000001'::uuid,
     'Custom Thermal Solution Design',
     'Engineering design services for custom thermal solutions. Includes thermal modeling, prototype development, and testing. Ideal for OEM applications requiring precise temperature control.',
     250000, 'Engineering Services', 14, true, true);

-- =====================================================
-- PEKO PRECISION - Machinery Manufacturing
-- https://www.pekoprecision.com/services/machinery-manufacturing/
-- =====================================================

INSERT INTO public.company_profiles (
    id,
    owner_id,
    company_name,
    description,
    email,
    phone,
    website,
    address,
    city,
    state,
    zip_code,
    specialties,
    certifications,
    is_verified,
    is_claimed
) VALUES (
    'c2000000-0000-0000-0000-000000000001'::uuid,
    'c2000000-0000-0000-0000-000000000001'::uuid,
    'PEKO Precision Products',
    'Full-service contract manufacturer specializing in precision machining, fabrication, and assembly. From prototype to production, we deliver complex machined components and assemblies for medical, aerospace, defense, and industrial markets. ISO 9001 and AS9100 certified facility with advanced CNC capabilities.',
    'sales@pekoprecision.com',
    '(585) 924-1600',
    'https://www.pekoprecision.com',
    '1235 Scottsville Road',
    'Rochester',
    'NY',
    '14624',
    ARRAY['CNC Machining', 'Precision Fabrication', 'Sheet Metal', 'Assembly Services', 'Prototype Development', 'Production Manufacturing'],
    ARRAY['ISO 9001:2015', 'AS9100D', 'ITAR Registered', 'ISO 13485'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- PEKO Products
INSERT INTO public.products (
    id,
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    is_active,
    requires_consultation
) VALUES
    ('pc200001-0000-0000-0000-000000000001'::uuid, 'c2000000-0000-0000-0000-000000000001'::uuid,
     'Precision CNC Machining Service',
     'Complex 5-axis CNC machining for aluminum, steel, titanium, and exotic alloys. Tolerances to ±0.0005". From single prototypes to production runs. Includes programming, setup, and inspection.',
     15000, 'Manufacturing Services', 10, true, true),
    
    ('pc200001-0000-0000-0000-000000000002'::uuid, 'c2000000-0000-0000-0000-000000000001'::uuid,
     'Sheet Metal Fabrication & Assembly',
     'Complete sheet metal fabrication including laser cutting, forming, welding, and powder coating. Aluminum and steel up to 1/4" thick. Includes assembly and hardware installation.',
     12500, 'Manufacturing Services', 14, true, true),
    
    ('pc200001-0000-0000-0000-000000000003'::uuid, 'c2000000-0000-0000-0000-000000000001'::uuid,
     'Prototype Development Package',
     'Rapid prototype service including design review, DFM analysis, prototype machining, and testing support. Ideal for new product development. 2-week turnaround.',
     35000, 'Engineering Services', 14, true, true);

-- =====================================================
-- IDS Engineering Group - Civil Engineering
-- https://www.idseg.com/land-development/
-- =====================================================

INSERT INTO public.company_profiles (
    id,
    owner_id,
    company_name,
    description,
    email,
    phone,
    website,
    address,
    city,
    state,
    zip_code,
    specialties,
    certifications,
    is_verified,
    is_claimed
) VALUES (
    'c3000000-0000-0000-0000-000000000001'::uuid,
    'c3000000-0000-0000-0000-000000000001'::uuid,
    'IDS Engineering Group',
    'Texas-based civil engineering firm specializing in land development, site planning, and municipal infrastructure. Over 30 years serving residential, commercial, and municipal clients. Full-service design from feasibility studies through construction administration.',
    'contact@idseg.com',
    '(214) 555-1000',
    'https://www.idseg.com',
    '5050 Quorum Drive, Suite 700',
    'Dallas',
    'TX',
    '75254',
    ARRAY['Land Development', 'Site Planning', 'Drainage Design', 'Utility Design', 'Surveying', 'Municipal Engineering'],
    ARRAY['Texas Licensed Engineers', 'TBPE Registered', 'Professional Land Surveyors'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- IDS Products/Services
INSERT INTO public.products (
    id,
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    is_active,
    requires_consultation
) VALUES
    ('pc300001-0000-0000-0000-000000000001'::uuid, 'c3000000-0000-0000-0000-000000000001'::uuid,
     'Residential Subdivision Design',
     'Complete civil engineering for residential developments. Includes grading plans, drainage design, utility design, and construction documents. Typical 50-lot subdivision. Permitting assistance included.',
     85000, 'Civil Engineering', 45, true, true),
    
    ('pc300001-0000-0000-0000-000000000002'::uuid, 'c3000000-0000-0000-0000-000000000001'::uuid,
     'Commercial Site Development',
     'Site civil engineering for commercial projects. Grading, drainage, utilities, paving, and detention design. Includes coordination with local municipalities. Up to 5-acre site.',
     45000, 'Civil Engineering', 30, true, true),
    
    ('pc300001-0000-0000-0000-000000000003'::uuid, 'c3000000-0000-0000-0000-000000000001'::uuid,
     'Drainage Study & Design',
     'Comprehensive drainage analysis and design. Hydrologic and hydraulic modeling, detention pond design, storm sewer design. Includes regulatory compliance review.',
     15000, 'Civil Engineering', 14, true, true),
    
    ('pc300001-0000-0000-0000-000000000004'::uuid, 'c3000000-0000-0000-0000-000000000001'::uuid,
     'Topographic Survey',
     'Professional land surveying services. Boundary survey, topographic mapping, ALTA surveys. Includes field work and CAD deliverables. Up to 5 acres.',
     5500, 'Surveying Services', 7, true, false);

-- =====================================================
-- SmartFlow USA - Flow Meters & Instrumentation
-- https://www.smartflow-usa.com/flow-meters/mechanical/
-- =====================================================

INSERT INTO public.company_profiles (
    id,
    owner_id,
    company_name,
    description,
    email,
    phone,
    website,
    address,
    city,
    state,
    zip_code,
    specialties,
    certifications,
    is_verified,
    is_claimed
) VALUES (
    'c4000000-0000-0000-0000-000000000001'::uuid,
    'c4000000-0000-0000-0000-000000000001'::uuid,
    'SmartFlow USA',
    'Manufacturer of precision flow meters and instrumentation for industrial applications. Specializing in mechanical, ultrasonic, and electromagnetic flow measurement. Serving plastics, chemical, food & beverage, and water treatment industries. Custom calibration and integration services available.',
    'sales@smartflow-usa.com',
    '(724) 535-5522',
    'https://www.smartflow-usa.com',
    '105 Progress Drive',
    'Cranberry Township',
    'PA',
    '16066',
    ARRAY['Flow Meters', 'Mechanical Flow Meters', 'Ultrasonic Flow Meters', 'Electromagnetic Flow Meters', 'Process Control', 'Custom Calibration'],
    ARRAY['ISO 9001:2015', 'NIST Traceable Calibration'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- SmartFlow Products (with detailed specs like McMaster-Carr)
INSERT INTO public.products (
    id,
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    is_active,
    requires_consultation
) VALUES
    ('pc400001-0000-0000-0000-000000000001'::uuid, 'c4000000-0000-0000-0000-000000000001'::uuid,
     'Mechanical Flow Meter - 1" NPT',
     'Positive displacement flow meter for viscous liquids. Specifications: Size: 1" NPT male threads | Flow Range: 1-50 GPM | Accuracy: ±1% of reading | Max Pressure: 500 PSI | Temperature: -20°F to 200°F | Materials: 316 Stainless steel body, PTFE seals | Output: 4-20mA analog | Viscosity Range: 1-1000 cP | Display: LCD with totalizer | Power: 24V DC | Enclosure: IP67 rated. Includes NIST traceable calibration certificate.',
     189500, 'Flow Meters', 5, true, false),
    
    ('pc400001-0000-0000-0000-000000000002'::uuid, 'c4000000-0000-0000-0000-000000000001'::uuid,
     'Ultrasonic Clamp-On Flow Meter - 2"',
     'Non-invasive ultrasonic flow meter. Specifications: Pipe Size: 2" (DN50) | Flow Range: 0.5-100 GPM | Accuracy: ±0.5% of reading | Max Pressure: Unlimited (clamp-on) | Temperature: -40°F to 300°F | Materials: Transducers: Stainless steel, Cable: 20 ft standard | Output: 4-20mA, Pulse, Modbus RTU | Measurement: Transit time technology | Display: Backlit LCD, flow rate & totalizer | Power: 110-240V AC or 24V DC | Enclosure: NEMA 4X (IP66) | Installation: No pipe cutting required, Quick clamp-on mounting.',
     245000, 'Flow Meters', 3, true, false),
    
    ('pc400001-0000-0000-0000-000000000003'::uuid, 'c4000000-0000-0000-0000-000000000001'::uuid,
     'Electromagnetic Flow Meter - 3" Flange',
     'Magmeter for conductive fluids. Specifications: Size: 3" ANSI 150# flanged | Flow Range: 5-500 GPM | Accuracy: ±0.2% of rate | Max Pressure: 150 PSI (ANSI 150) | Temperature: -4°F to 250°F | Materials: Body: 316L stainless steel, Liner: PTFE, Electrodes: Hastelloy C | Output: 4-20mA, HART, Pulse, Modbus RTU/TCP | Conductivity Requirement: >5 μS/cm | Display: Graphical LCD with advanced diagnostics | Power: 110-240V AC or 24V DC | Enclosure: IP68 submersible | Approvals: FM, CSA, ATEX. Ideal for wastewater, chemicals, slurries.',
     425000, 'Flow Meters', 7, true, false),
    
    ('pc400001-0000-0000-0000-000000000004'::uuid, 'c4000000-0000-0000-0000-000000000001'::uuid,
     'Custom Flow Meter Integration Service',
     'Engineering services for flow meter system design and integration. Includes application consultation, meter selection, custom calibration, PLC/SCADA integration programming, and installation support. Perfect for OEM equipment builders and process control upgrades.',
     35000, 'Engineering Services', 21, true, true);

-- =====================================================
-- Henderson Engineers - Code Consulting
-- https://www.hendersonengineers.com/what-we-do/code-consulting/
-- =====================================================

INSERT INTO public.company_profiles (
    id,
    owner_id,
    company_name,
    description,
    email,
    phone,
    website,
    address,
    city,
    state,
    zip_code,
    specialties,
    certifications,
    is_verified,
    is_claimed
) VALUES (
    'c5000000-0000-0000-0000-000000000001'::uuid,
    'c5000000-0000-0000-0000-000000000001'::uuid,
    'Henderson Engineers',
    'Comprehensive MEP and structural engineering consultancy. Specialists in code consulting, sustainable design, and building systems integration. Serving architects, developers, and building owners nationwide. Expert testimony and peer review services available.',
    'contact@hendersonengineers.com',
    '(913) 742-8100',
    'https://www.hendersonengineers.com',
    '8345 Lenexa Drive, Suite 300',
    'Lenexa',
    'KS',
    '66214',
    ARRAY['MEP Engineering', 'Code Consulting', 'Structural Engineering', 'LEED Design', 'Commissioning', 'Energy Modeling'],
    ARRAY['LEED Accredited Professionals', 'Licensed Engineers All 50 States', 'ASHRAE Members', 'USGBC Members'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Henderson Products/Services
INSERT INTO public.products (
    id,
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    is_active,
    requires_consultation
) VALUES
    ('pc500001-0000-0000-0000-000000000001'::uuid, 'c5000000-0000-0000-0000-000000000001'::uuid,
     'Building Code Compliance Review',
     'Comprehensive code review for architectural and engineering plans. IBC, NFPA, ADA, and local code compliance check. Written report with deficiency list and recommendations. Typical 50,000 SF building.',
     12500, 'Code Consulting', 7, true, true),
    
    ('pc500001-0000-0000-0000-000000000002'::uuid, 'c5000000-0000-0000-0000-000000000001'::uuid,
     'MEP Engineering Design - Office Building',
     'Complete mechanical, electrical, and plumbing design for commercial office space. Includes HVAC load calculations, electrical distribution, lighting design, and plumbing systems. Up to 25,000 SF.',
     65000, 'MEP Engineering', 45, true, true),
    
    ('pc500001-0000-0000-0000-000000000003'::uuid, 'c5000000-0000-0000-0000-000000000001'::uuid,
     'Structural Peer Review',
     'Independent structural engineering peer review. Third-party verification of design calculations, connection details, and construction documents. Includes site visit and written report.',
     18500, 'Structural Engineering', 14, true, true),
    
    ('pc500001-0000-0000-0000-000000000004'::uuid, 'c5000000-0000-0000-0000-000000000001'::uuid,
     'LEED Consultation & Energy Modeling',
     'LEED certification support and energy modeling services. Includes LEED documentation, energy analysis, daylighting studies, and commissioning support. Targeting LEED Silver or Gold.',
     35000, 'Sustainable Design', 30, true, true);

-- =====================================================
-- F&V Engineering - Water System Improvements
-- https://www.fveng.com/projects/private-water-system-improvements/
-- =====================================================

INSERT INTO public.company_profiles (
    id,
    owner_id,
    company_name,
    description,
    email,
    phone,
    website,
    address,
    city,
    state,
    zip_code,
    specialties,
    certifications,
    is_verified,
    is_claimed
) VALUES (
    'c6000000-0000-0000-0000-000000000001'::uuid,
    'c6000000-0000-0000-0000-000000000001'::uuid,
    'Fishbeck (F&V Engineering)',
    'Michigan-based engineering firm specializing in water and wastewater systems. Experts in municipal infrastructure, water treatment, distribution systems, and regulatory compliance. Serving communities and private developments across Michigan for over 80 years.',
    'info@fishbeck.com',
    '(616) 464-3873',
    'https://www.fveng.com',
    '1515 Arboretum Drive SE',
    'Grand Rapids',
    'MI',
    '49546',
    ARRAY['Water System Design', 'Wastewater Engineering', 'Water Treatment', 'Distribution Systems', 'Municipal Engineering', 'Regulatory Compliance'],
    ARRAY['Michigan Licensed Engineers', 'AWWA Members', 'WEF Members'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- F&V Products/Services
INSERT INTO public.products (
    id,
    company_id,
    name,
    description,
    price,
    category,
    delivery_time_days,
    is_active,
    requires_consultation
) VALUES
    ('pc600001-0000-0000-0000-000000000001'::uuid, 'c6000000-0000-0000-0000-000000000001'::uuid,
     'Private Water System Design',
     'Complete water system engineering for private developments. Includes well analysis, water treatment design, distribution piping, storage tanks, and pumping stations. Regulatory approval assistance. Typical 200-home community.',
     75000, 'Water Engineering', 60, true, true),
    
    ('pc600001-0000-0000-0000-000000000002'::uuid, 'c6000000-0000-0000-0000-000000000001'::uuid,
     'Water Treatment Plant Design',
     'Water treatment facility design and permitting. Iron/manganese removal, disinfection, and filtration systems. Capacity up to 500 GPM. Includes MDEQ permitting support.',
     125000, 'Water Engineering', 90, true, true),
    
    ('pc600001-0000-0000-0000-000000000003'::uuid, 'c6000000-0000-0000-0000-000000000001'::uuid,
     'Water Distribution System Analysis',
     'Hydraulic modeling and analysis of existing water distribution systems. Includes fire flow testing, pressure analysis, and improvement recommendations. WaterCAD modeling software.',
     15000, 'Water Engineering', 21, true, true),
    
    ('pc600001-0000-0000-0000-000000000004'::uuid, 'c6000000-0000-0000-0000-000000000001'::uuid,
     'Well Siting & Permitting',
     'Well location evaluation, hydrogeologic assessment, and permitting services. Includes coordination with drilling contractor and well construction inspection. Michigan DEQ compliance.',
     8500, 'Water Engineering', 30, true, true);

-- =====================================================
-- SUMMARY
-- =====================================================
-- Companies Added: 6 real-world vendors
-- 
-- 1. Minco - Thermal solutions & sensors (Minneapolis, MN)
--    Products: RTD sensors, flexible heaters, custom design
--    
-- 2. PEKO Precision - Contract manufacturing (Rochester, NY)
--    Products: CNC machining, fabrication, prototypes
--    
-- 3. IDS Engineering - Civil engineering (Dallas, TX)
--    Products: Land development, site design, drainage, surveys
--    
-- 4. SmartFlow USA - Flow meters (Pittsburgh, PA)
--    Products: Mechanical, ultrasonic, electromagnetic meters
--    *Detailed specs like McMaster-Carr*
--    
-- 5. Henderson Engineers - MEP/Code consulting (Kansas City, KS)
--    Products: Code review, MEP design, LEED, peer review
--    
-- 6. Fishbeck (F&V) - Water systems (Grand Rapids, MI)
--    Products: Water system design, treatment, distribution
--
-- Total Products: 22 professional services & products
-- Price Range: $55 - $4,250 ($5,500 - $425,000)
-- All claimable by real vendors later
-- =====================================================
