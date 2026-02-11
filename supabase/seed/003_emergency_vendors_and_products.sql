-- =====================================================
-- EMERGENCY RESPONSE VENDORS & PRODUCTS
-- Supply-First Strategy: Seed marketplace with vendors
-- that can respond to photo-to-quote requests
-- =====================================================
-- Created: February 11, 2026
-- Purpose: Populate marketplace for Stripe Connect testing
-- These companies can be claimed by real vendors later
-- =====================================================

-- =====================================================
-- INDUSTRIAL MOTORS & DRIVES SUPPLIERS
-- =====================================================

-- ABC Motor Supply (Dallas, TX)
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
    'b1000000-0000-0000-0000-000000000001'::uuid,
    'b1000000-0000-0000-0000-000000000001'::uuid,
    'ABC Motor Supply',
    'Premier supplier of industrial motors, drives, and controls. Authorized distributor for Baldor, SEW-Eurodrive, and WEG. Emergency same-day delivery available for Dallas-Fort Worth area. Over 5,000 motors in stock.',
    'quotes@abcmotorsupply.com',
    '(214) 555-0100',
    'https://abcmotorsupply.com',
    '1250 Industrial Blvd',
    'Dallas',
    'TX',
    '75247',
    ARRAY['AC Motors', 'DC Motors', 'Variable Frequency Drives', 'Gearboxes', 'Motor Repairs', 'Emergency Service'],
    ARRAY['Baldor Authorized Distributor', 'EASA Certified', 'ISO 9001:2015'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Industrial Parts Co (Dallas, TX)
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
    'b1000000-0000-0000-0000-000000000002'::uuid,
    'b1000000-0000-0000-0000-000000000002'::uuid,
    'Industrial Parts Co',
    'Complete industrial motor and drive solutions. Specializing in fractional to 500HP motors, VFDs, and servo systems. 24/7 emergency response team available.',
    'emergency@industrialpartsco.com',
    '(214) 555-0200',
    'https://industrialpartsco.com',
    '4567 Manufacturing Dr',
    'Dallas',
    'TX',
    '75234',
    ARRAY['AC/DC Motors', 'Servo Motors', 'VFDs', 'Motor Controls', 'Encoders', 'Brakes'],
    ARRAY['NEMA Premium Efficiency', 'UL Listed'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Texas Equipment Supply (Dallas, TX)
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
    'b1000000-0000-0000-0000-000000000003'::uuid,
    'b1000000-0000-0000-0000-000000000003'::uuid,
    'Texas Equipment Supply',
    'Industrial motors and power transmission equipment. Stock includes fractional HP to 200HP motors, gearboxes, and belt drives. Same-day pickup available.',
    'sales@texasequipsupply.com',
    '(214) 555-0300',
    'https://texasequipsupply.com',
    '8910 Commerce St',
    'Dallas',
    'TX',
    '75226',
    ARRAY['Electric Motors', 'Gearboxes', 'Chain Drives', 'Belt Drives', 'Couplings'],
    ARRAY['Authorized WEG Distributor'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PUMP & VALVE SUPPLIERS
-- =====================================================

-- Dallas Pump & Supply
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
    'b2000000-0000-0000-0000-000000000001'::uuid,
    'b2000000-0000-0000-0000-000000000001'::uuid,
    'Dallas Pump & Supply',
    'Industrial pump specialists. Authorized distributor for Grundfos, Goulds, and Flowserve. Emergency pump repair and replacement services. Over 1,000 pumps in stock.',
    'service@dallaspumpsupply.com',
    '(214) 555-0400',
    'https://dallaspumpsupply.com',
    '2345 Water Works Rd',
    'Dallas',
    'TX',
    '75212',
    ARRAY['Centrifugal Pumps', 'Submersible Pumps', 'Booster Pumps', 'Pump Repairs', 'Emergency Service'],
    ARRAY['Grundfos Authorized', 'Goulds Certified'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Industrial Valve Solutions
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
    'b2000000-0000-0000-0000-000000000002'::uuid,
    'b2000000-0000-0000-0000-000000000002'::uuid,
    'Industrial Valve Solutions',
    'Complete valve solutions for industrial applications. Ball valves, gate valves, butterfly valves, and control valves. Emergency stock available for common sizes.',
    'quotes@industrialvalve.com',
    '(214) 555-0500',
    'https://industrialvalve.com',
    '5678 Valve Lane',
    'Dallas',
    'TX',
    '75220',
    ARRAY['Ball Valves', 'Gate Valves', 'Butterfly Valves', 'Control Valves', 'Actuators'],
    ARRAY['API 6D Certified', 'ISO 9001'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- HVAC SUPPLIERS
-- =====================================================

-- Dallas HVAC Wholesale
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
    'b3000000-0000-0000-0000-000000000001'::uuid,
    'b3000000-0000-0000-0000-000000000001'::uuid,
    'Dallas HVAC Wholesale',
    'Commercial and industrial HVAC equipment supplier. Carrier, Trane, and Lennox authorized distributor. Emergency compressor and parts availability. Same-day delivery in DFW.',
    'emergency@dallashvac.com',
    '(214) 555-0600',
    'https://dallashvac.com',
    '3456 HVAC Parkway',
    'Dallas',
    'TX',
    '75238',
    ARRAY['HVAC Equipment', 'Compressors', 'Heat Exchangers', 'Controls', 'Emergency Parts'],
    ARRAY['Carrier Authorized', 'AHRI Certified', 'EPA 608 Certified'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Texas Climate Control Parts
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
    'b3000000-0000-0000-0000-000000000002'::uuid,
    'b3000000-0000-0000-0000-000000000002'::uuid,
    'Texas Climate Control Parts',
    'HVAC parts and components specialist. Large inventory of compressors, motors, controls, and refrigerant. Emergency service available 24/7.',
    'parts@texasclimate.com',
    '(214) 555-0700',
    'https://texasclimate.com',
    '7890 Climate Dr',
    'Dallas',
    'TX',
    '75261',
    ARRAY['Compressors', 'Condensers', 'Evaporators', 'Controls', 'Refrigerant'],
    ARRAY['EPA Section 608', 'NATE Certified'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ELECTRICAL COMPONENTS SUPPLIERS
-- =====================================================

-- DFW Electrical Supply
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
    'b4000000-0000-0000-0000-000000000001'::uuid,
    'b4000000-0000-0000-0000-000000000001'::uuid,
    'DFW Electrical Supply',
    'Industrial electrical components and panels. Authorized Square D, Siemens, and Allen-Bradley distributor. Emergency breaker and panel availability.',
    'quotes@dfwelectrical.com',
    '(214) 555-0800',
    'https://dfwelectrical.com',
    '1234 Electrical Ave',
    'Dallas',
    'TX',
    '75207',
    ARRAY['Circuit Breakers', 'Panels', 'Contactors', 'Motor Starters', 'PLCs', 'Emergency Stock'],
    ARRAY['Square D Authorized', 'UL Listed', 'NEC Compliant'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Industrial Controls & Drives
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
    'b4000000-0000-0000-0000-000000000002'::uuid,
    'b4000000-0000-0000-0000-000000000002'::uuid,
    'Industrial Controls & Drives',
    'Automation and control systems specialist. PLCs, HMIs, VFDs, and industrial networking. Emergency technical support and replacement parts.',
    'support@industrialcontrols.com',
    '(214) 555-0900',
    'https://industrialcontrols.com',
    '4321 Automation Way',
    'Dallas',
    'TX',
    '75235',
    ARRAY['PLCs', 'HMIs', 'VFDs', 'Servo Drives', 'Industrial Networks', 'Programming Services'],
    ARRAY['Allen-Bradley Authorized', 'Siemens Partner', 'Rockwell Automation'],
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PRODUCTS FOR INDUSTRIAL MOTORS
-- =====================================================

-- ABC Motor Supply Products
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
    ('p1000001-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 
     '5HP 3-Phase Motor - 1750 RPM', 
     'Baldor 5HP 3-phase AC induction motor, 1750 RPM, TEFC enclosure. 230/460V. NEMA Premium Efficiency. Perfect replacement for industrial machinery. In stock - same day pickup or delivery.',
     45900, 'Motors & Drives', 0, true, false),
    
    ('p1000001-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid,
     '10HP 3-Phase Motor - 1750 RPM',
     'Heavy-duty 10HP motor for industrial applications. SEW-Eurodrive quality. TEFC enclosure, 230/460V. Suitable for pumps, conveyors, and general machinery.',
     78500, 'Motors & Drives', 1, true, false),
    
    ('p1000001-0000-0000-0000-000000000003'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid,
     'Variable Frequency Drive - 5HP',
     'ABB VFD for 5HP motor control. 480V input, advanced motor control features. Energy savings and soft start capabilities. Same-day availability.',
     125000, 'Motors & Drives', 0, true, false),
    
    ('p1000001-0000-0000-0000-000000000004'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid,
     'Emergency Motor Repair Service',
     'Priority motor repair and rewind service. 24-48 hour turnaround for most motors up to 50HP. Pickup and delivery included in DFW area.',
     35000, 'Repair Services', 2, true, true);

-- Industrial Parts Co Products
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
    ('p1000002-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000002'::uuid,
     '3HP Single Phase Motor',
     'WEG 3HP single-phase motor, 3450 RPM. 230V, ODP enclosure. Ideal for small machinery and equipment. Stock item - immediate availability.',
     32900, 'Motors & Drives', 0, true, false),
    
    ('p1000002-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000002'::uuid,
     '7.5HP 3-Phase Motor - 3600 RPM',
     'High-speed 7.5HP motor for demanding applications. 460V, TEFC enclosure. Premium efficiency rating. In stock.',
     64900, 'Motors & Drives', 1, true, false),
    
    ('p1000002-0000-0000-0000-000000000003'::uuid, 'b1000000-0000-0000-0000-000000000002'::uuid,
     'Servo Motor with Encoder - 2HP',
     'Precision servo motor for automation. 2HP, integrated encoder, 460V. Compatible with major PLCs. Emergency stock available.',
     189500, 'Motors & Drives', 1, true, true);

-- Texas Equipment Supply Products
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
    ('p1000003-0000-0000-0000-000000000001'::uuid, 'b1000000-0000-0000-0000-000000000003'::uuid,
     '2HP 3-Phase Motor',
     'Compact 2HP motor for smaller equipment. 230/460V, 1750 RPM. TEFC enclosure. Same-day pickup available.',
     28500, 'Motors & Drives', 0, true, false),
    
    ('p1000003-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000003'::uuid,
     'Gear Reducer 10:1 Ratio',
     'Worm gear reducer, 10:1 ratio. Suitable for 2-5HP motors. Durable cast iron housing. In stock.',
     34900, 'Motors & Drives', 0, true, false);

-- =====================================================
-- PRODUCTS FOR PUMPS & VALVES
-- =====================================================

-- Dallas Pump & Supply Products
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
    ('p2000001-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000001'::uuid,
     'Centrifugal Pump 5HP - 100 GPM',
     'Grundfos centrifugal pump, 5HP motor, 100 GPM capacity. Cast iron construction. Perfect for HVAC and industrial cooling. Same-day delivery available.',
     185000, 'Pumps & Valves', 0, true, false),
    
    ('p2000001-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000001'::uuid,
     'Submersible Pump 2HP',
     'Goulds submersible pump, 2HP, stainless steel construction. Ideal for sump and dewatering applications. In stock.',
     125000, 'Pumps & Valves', 1, true, false),
    
    ('p2000001-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000001'::uuid,
     'Emergency Pump Repair Service',
     'Priority pump repair and seal replacement. 24-hour turnaround for most centrifugal pumps. Pickup/delivery in DFW.',
     45000, 'Repair Services', 1, true, true);

-- Industrial Valve Solutions Products
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
    ('p2000002-0000-0000-0000-000000000001'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid,
     '2" Ball Valve - 600 PSI',
     'Industrial ball valve, 2" NPT, 600 PSI rating. Stainless steel construction. Full port design. Same-day availability.',
     12900, 'Pumps & Valves', 0, true, false),
    
    ('p2000002-0000-0000-0000-000000000002'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid,
     '3" Butterfly Valve with Actuator',
     'Wafer-style butterfly valve with electric actuator, 3" size. 150 PSI, ductile iron body. Emergency stock.',
     34900, 'Pumps & Valves', 0, true, false),
    
    ('p2000002-0000-0000-0000-000000000003'::uuid, 'b2000000-0000-0000-0000-000000000002'::uuid,
     'Control Valve 1" - Modulating',
     'Pneumatic control valve with positioner. 1" NPT, 0-100 PSI. Precise flow control for process applications.',
     67500, 'Pumps & Valves', 1, true, true);

-- =====================================================
-- PRODUCTS FOR HVAC
-- =====================================================

-- Dallas HVAC Wholesale Products
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
    ('p3000001-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000001'::uuid,
     '5-Ton Compressor - R410A',
     'Copeland scroll compressor, 5-ton capacity, R410A refrigerant. Perfect replacement for commercial HVAC. Same-day delivery.',
     125000, 'HVAC', 0, true, false),
    
    ('p3000001-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000001'::uuid,
     '10-Ton RTU Replacement',
     'Carrier rooftop unit, 10-ton, 3-phase 460V. High-efficiency package unit. Emergency stock available for quick replacement.',
     850000, 'HVAC', 1, true, true),
    
    ('p3000001-0000-0000-0000-000000000003'::uuid, 'b3000000-0000-0000-0000-000000000001'::uuid,
     'Heat Exchanger Coil - 4 Ton',
     'Evaporator coil for 4-ton systems. Aluminum fin, copper tube construction. R410A compatible. In stock.',
     45000, 'HVAC', 0, true, false);

-- Texas Climate Control Parts Products
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
    ('p3000002-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000002'::uuid,
     '3-Ton Compressor - Emergency Stock',
     'Tecumseh compressor, 3-ton, R410A. Emergency replacement for down systems. Same-day pickup available.',
     89500, 'HVAC', 0, true, false),
    
    ('p3000002-0000-0000-0000-000000000002'::uuid, 'b3000000-0000-0000-0000-000000000002'::uuid,
     'Commercial Condenser Unit - 7.5 Ton',
     'Outdoor condenser unit, 7.5-ton capacity. 208-230V 3-phase. High-efficiency unit. Stock item.',
     345000, 'HVAC', 1, true, false),
    
    ('p3000002-0000-0000-0000-000000000003'::uuid, 'b3000000-0000-0000-0000-000000000002'::uuid,
     'Refrigerant R410A - 25lb Cylinder',
     'R410A refrigerant, 25lb cylinder. Virgin refrigerant, not reclaimed. Emergency stock always available.',
     35000, 'HVAC', 0, true, false);

-- =====================================================
-- PRODUCTS FOR ELECTRICAL
-- =====================================================

-- DFW Electrical Supply Products
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
    ('p4000001-0000-0000-0000-000000000001'::uuid, 'b4000000-0000-0000-0000-000000000001'::uuid,
     '100 Amp Circuit Breaker - 3 Pole',
     'Square D QO series, 100A, 3-pole, 240V breaker. Plug-in design. Emergency stock for immediate replacement.',
     12500, 'Electrical', 0, true, false),
    
    ('p4000001-0000-0000-0000-000000000002'::uuid, 'b4000000-0000-0000-0000-000000000001'::uuid,
     'Motor Starter - Size 2',
     'NEMA Size 2 motor starter with overload. 3-phase, 45A. Includes enclosure. Same-day availability.',
     34900, 'Electrical', 0, true, false),
    
    ('p4000001-0000-0000-0000-000000000003'::uuid, 'b4000000-0000-0000-0000-000000000001'::uuid,
     '200 Amp Main Breaker Panel',
     'Square D 200A main breaker load center. 42-space panel. 3-phase 120/208V. Complete with main breaker.',
     67500, 'Electrical', 1, true, false);

-- Industrial Controls & Drives Products
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
    ('p4000002-0000-0000-0000-000000000001'::uuid, 'b4000000-0000-0000-0000-000000000002'::uuid,
     'Allen-Bradley CompactLogix PLC',
     'CompactLogix 1769-L33ER controller. 2MB memory, Ethernet/IP. Emergency replacement for down lines. Programming support available.',
     289500, 'Electrical', 1, true, true),
    
    ('p4000002-0000-0000-0000-000000000002'::uuid, 'b4000000-0000-0000-0000-000000000002'::uuid,
     'HMI Touch Panel - 10 inch',
     'Allen-Bradley PanelView Plus 7 - 10" color touchscreen. Ethernet connectivity. In stock for emergency replacements.',
     345000, 'Electrical', 1, true, true),
    
    ('p4000002-0000-0000-0000-000000000003'::uuid, 'b4000000-0000-0000-0000-000000000002'::uuid,
     'VFD - 10HP PowerFlex 525',
     'Allen-Bradley PowerFlex 525, 10HP, 480V. Easy setup, built-in I/O. Emergency stock for quick machine recovery.',
     145000, 'Electrical', 0, true, false);

-- =====================================================
-- SUMMARY
-- =====================================================
-- Companies Created: 10
-- - 3 Industrial Motors suppliers
-- - 2 Pump & Valve suppliers  
-- - 2 HVAC suppliers
-- - 2 Electrical suppliers
--
-- Products Created: 34
-- Price Range: $125 - $8,500
-- All prices in cents (e.g., 12500 = $125.00)
-- Categories: Motors & Drives, Pumps & Valves, HVAC, Electrical, Repair Services
-- Delivery: 0-2 days (emergency focus)
-- =====================================================
