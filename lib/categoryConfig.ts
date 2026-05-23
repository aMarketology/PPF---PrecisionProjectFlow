export interface CategoryConfig {
  slug: string
  dbCategory: string         // matches `services.category` in DB
  title: string
  headline: string
  subheadline: string
  seoTitle: string
  seoDescription: string
  heroKeyword: string        // bolded word in hero
  stats: { label: string; value: string }[]
  benefits: { icon: string; title: string; desc: string }[]
  faqs: { q: string; a: string }[]
}

export const categoryConfigs: Record<string, CategoryConfig> = {
  'structural-engineering': {
    slug: 'structural-engineering',
    dbCategory: 'Structural Engineering',
    title: 'Structural Engineering Services',
    headline: 'Hire a Licensed Structural Engineer Online',
    subheadline: 'Get PE-stamped drawings, structural analysis, and plan reviews from verified structural engineers. Fast turnaround, fixed pricing.',
    seoTitle: 'Hire a Structural Engineer Online | PE Stamps & Drawings | PPF',
    seoDescription: 'Find licensed structural engineers for PE-stamped drawings, structural analysis, and plan reviews. Post your project and get quotes in 24 hours.',
    heroKeyword: 'Structural Engineer',
    stats: [
      { value: '48h', label: 'Avg. first quote' },
      { value: 'PE', label: 'Licensed engineers only' },
      { value: '$300+', label: 'Starting price' },
      { value: '100%', label: 'Verified professionals' },
    ],
    benefits: [
      { icon: '🏗️', title: 'PE-Stamped Drawings', desc: 'Get drawings signed and sealed by a licensed Professional Engineer in your state.' },
      { icon: '📐', title: 'Structural Analysis', desc: 'Load calculations, seismic analysis, wind uplift studies, and more.' },
      { icon: '🔍', title: 'Plan Review', desc: 'Third-party structural plan reviews and peer reviews for permits and compliance.' },
      { icon: '⚡', title: 'Fast Turnaround', desc: 'Most projects quoted within 24 hours. Rush service available.' },
    ],
    faqs: [
      { q: 'How quickly can I get a structural engineer?', a: 'Most clients receive their first quote within 24–48 hours of posting. For urgent projects, many engineers on PPF offer rush turnaround.' },
      { q: 'Do your structural engineers provide PE stamps?', a: 'Yes. All structural engineers on PPF are licensed Professional Engineers (PE) and can provide stamped and sealed drawings valid in their licensed states.' },
      { q: 'How much does a structural engineer cost?', a: 'Pricing varies by project scope. Simple PE stamp reviews start around $300–$500. Full structural design for a residential project typically runs $1,500–$5,000.' },
      { q: 'Can I hire a structural engineer remotely?', a: 'Absolutely. Most structural engineering work — plan reviews, calculations, stamped drawings — can be done entirely remotely.' },
    ],
  },

  'mechanical-engineering': {
    slug: 'mechanical-engineering',
    dbCategory: 'Mechanical Engineering',
    title: 'Mechanical Engineering Services',
    headline: 'Hire a Mechanical Engineer for Your Project',
    subheadline: 'HVAC design, mechanical system analysis, product engineering, and FEA services from licensed mechanical engineers. Get your first quote in 24 hours.',
    seoTitle: 'Hire a Mechanical Engineer Online | HVAC, FEA & More | PPF',
    seoDescription: 'Connect with licensed mechanical engineers for HVAC design, FEA analysis, product development, and mechanical system consulting. Post your RFQ free.',
    heroKeyword: 'Mechanical Engineer',
    stats: [
      { value: '24h', label: 'Avg. first quote' },
      { value: 'PE', label: 'Licensed engineers' },
      { value: '$500+', label: 'Starting price' },
      { value: 'Remote', label: 'Work available' },
    ],
    benefits: [
      { icon: '❄️', title: 'HVAC Design', desc: 'Load calculations, duct design, equipment selection, and energy modeling for commercial and residential projects.' },
      { icon: '🔬', title: 'FEA Analysis', desc: 'Finite element analysis for stress, thermal, and dynamic performance of mechanical components.' },
      { icon: '⚙️', title: 'Product Engineering', desc: 'Mechanical design, DFM review, tolerance analysis, and manufacturing drawings.' },
      { icon: '📊', title: 'System Analysis', desc: 'Piping, pressure vessel, and mechanical system engineering and code compliance.' },
    ],
    faqs: [
      { q: 'What types of mechanical engineering services are available?', a: 'PPF has mechanical engineers specializing in HVAC, FEA analysis, product development, piping systems, pressure vessels, and general mechanical consulting.' },
      { q: 'Can a mechanical engineer help with HVAC design for my building?', a: 'Yes. HVAC engineers on PPF can provide load calculations, equipment sizing, duct design, and energy compliance documentation.' },
      { q: 'How much does mechanical engineering consulting cost?', a: 'Simple HVAC load calculations start around $500–$800. Full mechanical system design for a commercial building runs $3,000–$15,000 depending on size and complexity.' },
      { q: 'Do I need a licensed PE for my mechanical engineering project?', a: 'It depends on your jurisdiction and project type. Many commercial and industrial projects require PE-stamped mechanical drawings. Engineers on PPF can advise on your specific requirements.' },
    ],
  },

  'civil-engineering': {
    slug: 'civil-engineering',
    dbCategory: 'Civil Engineering',
    title: 'Civil Engineering Services',
    headline: 'Find a Civil Engineering Consultant Online',
    subheadline: 'Site grading, drainage design, permitting support, and civil engineering consulting from licensed PE civil engineers. Post your project today.',
    seoTitle: 'Civil Engineering Consultant Online | Site Design & Permits | PPF',
    seoDescription: 'Hire licensed civil engineers for site grading, drainage, stormwater management, and permitting. Get competitive quotes from civil engineering consultants.',
    heroKeyword: 'Civil Engineer',
    stats: [
      { value: '48h', label: 'Avg. first quote' },
      { value: 'PE', label: 'Licensed civil PEs' },
      { value: '5 ac', label: 'Avg. site size' },
      { value: 'Remote', label: '& on-site available' },
    ],
    benefits: [
      { icon: '🏔️', title: 'Grading & Drainage', desc: 'Site grading plans, drainage design, and stormwater management for residential and commercial developments.' },
      { icon: '📋', title: 'Permitting Support', desc: 'Civil drawings and calculations required for municipal permit applications.' },
      { icon: '🌊', title: 'Stormwater Management', desc: 'SWPPP, retention ponds, detention basins, and erosion control plans.' },
      { icon: '🛣️', title: 'Infrastructure Design', desc: 'Roads, utilities, site layouts, and infrastructure engineering for land development.' },
    ],
    faqs: [
      { q: 'What does a civil engineering consultant do?', a: 'Civil engineers design and plan the physical infrastructure of a site — grading, drainage, utilities, roads, and stormwater systems. They also prepare permit drawings and calculations required by municipalities.' },
      { q: 'How much does civil engineering cost for a residential site?', a: 'Civil engineering for a residential lot typically runs $2,000–$8,000. For larger commercial sites (1–5 acres), expect $5,000–$25,000 depending on complexity.' },
      { q: 'Do I need a civil engineer for my project?', a: 'Most land development and construction projects require civil engineering input. If you\'re pulling permits for grading, drainage, or site work — you likely need a PE civil engineer.' },
      { q: 'Can a civil engineer help me get my permit approved?', a: 'Yes. Civil engineers on PPF regularly prepare permit packages including grading plans, drainage calculations, and utility plans that meet local municipality requirements.' },
    ],
  },

  'electrical-engineering': {
    slug: 'electrical-engineering',
    dbCategory: 'Electrical Engineering',
    title: 'Electrical Engineering Services',
    headline: 'Hire an Electrical Engineering Consultant',
    subheadline: 'Power systems design, electrical plan review, solar PV engineering, and load analysis from licensed electrical engineers. Get quotes in 24 hours.',
    seoTitle: 'Hire an Electrical Engineer Online | Power Systems & Solar | PPF',
    seoDescription: 'Find licensed electrical engineers for power systems, solar PV design, electrical plan review, and load analysis. Post your RFQ and get quotes fast.',
    heroKeyword: 'Electrical Engineer',
    stats: [
      { value: '24h', label: 'First quote' },
      { value: 'PE', label: 'Licensed electrical PEs' },
      { value: '$400+', label: 'Starting price' },
      { value: 'Solar', label: 'PV stamps available' },
    ],
    benefits: [
      { icon: '⚡', title: 'Power Systems Design', desc: 'Single-line diagrams, load calculations, panel schedules, and power distribution design.' },
      { icon: '☀️', title: 'Solar PV Engineering', desc: 'PE-stamped solar PV design packages for residential and commercial installations.' },
      { icon: '🔌', title: 'Electrical Plan Review', desc: 'Code compliance review, NEC analysis, and electrical drawing peer review.' },
      { icon: '🏭', title: 'Industrial Electrical', desc: 'Motor controls, PLC systems, switchgear, and industrial power design.' },
    ],
    faqs: [
      { q: 'What electrical engineering services are available on PPF?', a: 'PPF electrical engineers offer power systems design, solar PV engineering stamps, electrical plan reviews, load calculations, and industrial electrical consulting.' },
      { q: 'Do you have engineers who can stamp solar PV designs?', a: 'Yes. Solar PV engineering and PE stamp packages are one of the most popular services on PPF. Engineers can review and stamp systems for AHJ (Authority Having Jurisdiction) approval.' },
      { q: 'How much does electrical engineering cost?', a: 'Solar PV stamp packages start around $400–$600. Full electrical design for a commercial building runs $3,000–$20,000 depending on size and complexity.' },
      { q: 'Can an electrical engineer help with my permit application?', a: 'Yes. Electrical engineers on PPF regularly prepare permit packages with single-line diagrams, load calculations, and panel schedules required by building departments.' },
    ],
  },

  'pe-stamps': {
    slug: 'pe-stamps',
    dbCategory: 'Consulting Services',
    title: 'PE Stamp Services',
    headline: 'Get PE-Stamped Drawings Online — Fast',
    subheadline: 'Connect with licensed Professional Engineers to review and stamp your drawings. Structural, mechanical, civil, and electrical PE stamps available. Most projects completed in 2–5 business days.',
    seoTitle: 'PE Stamped Drawings Online | Fast Turnaround | PPF',
    seoDescription: 'Get PE-stamped drawings from licensed Professional Engineers. Structural, mechanical, civil, and electrical stamps. Fast turnaround, competitive pricing.',
    heroKeyword: 'PE Stamp',
    stats: [
      { value: '2–5', label: 'Business days avg.' },
      { value: 'All 50', label: 'States covered' },
      { value: '$300+', label: 'Starting price' },
      { value: '4', label: 'Engineering disciplines' },
    ],
    benefits: [
      { icon: '🏗️', title: 'Structural PE Stamps', desc: 'Residential, commercial, and industrial structural drawings reviewed and stamped by licensed SEs.' },
      { icon: '☀️', title: 'Solar PV PE Stamps', desc: 'Solar installation packages stamped and sealed for AHJ permit approval.' },
      { icon: '❄️', title: 'Mechanical PE Stamps', desc: 'HVAC, mechanical system, and equipment drawings stamped for permit submission.' },
      { icon: '⚡', title: 'Electrical PE Stamps', desc: 'Electrical single-line diagrams and panel schedules stamped for building permit applications.' },
    ],
    faqs: [
      { q: 'What is a PE stamp?', a: 'A PE stamp (Professional Engineer stamp) is a seal applied by a licensed Professional Engineer that certifies engineering drawings meet applicable codes and standards. Most municipalities require PE-stamped drawings for permit applications.' },
      { q: 'How fast can I get a PE stamp?', a: 'Most PE stamp projects on PPF are completed within 2–5 business days. Rush turnaround (24–48 hours) is available from many engineers for an additional fee.' },
      { q: 'How much does a PE stamp cost?', a: 'PE stamp packages start around $300–$600 for simple residential projects (solar, structural elements). More complex commercial projects run $800–$2,500.' },
      { q: 'What states are covered?', a: 'PPF has licensed PEs in all 50 states. When you post your project, you\'ll be matched with engineers licensed in your specific state.' },
    ],
  },

  'consulting-services': {
    slug: 'consulting-services',
    dbCategory: 'Consulting Services',
    title: 'Engineering Consulting Services',
    headline: 'Hire an Engineering Consultant for Your Project',
    subheadline: 'Expert engineering consulting across all disciplines. From feasibility studies to technical due diligence — get matched with the right consultant fast.',
    seoTitle: 'Engineering Consulting Services Online | Expert Consultants | PPF',
    seoDescription: 'Hire engineering consultants for feasibility studies, technical due diligence, expert witness, and project management. Post your project and get quotes.',
    heroKeyword: 'Engineering Consultant',
    stats: [
      { value: '48h', label: 'Avg. first quote' },
      { value: 'All', label: 'Engineering disciplines' },
      { value: '$150+', label: 'Starting hourly' },
      { value: 'Remote', label: 'Consulting available' },
    ],
    benefits: [
      { icon: '🔭', title: 'Feasibility Studies', desc: 'Technical and economic feasibility analysis for new projects, products, and developments.' },
      { icon: '🤝', title: 'Technical Due Diligence', desc: 'Engineering assessments for M&A transactions, real estate acquisitions, and project financing.' },
      { icon: '⚖️', title: 'Expert Witness', desc: 'Licensed engineers available for litigation support, depositions, and expert witness testimony.' },
      { icon: '📊', title: 'Project Management', desc: 'Engineering PM support for construction, product development, and infrastructure projects.' },
    ],
    faqs: [
      { q: 'What types of engineering consulting are available?', a: 'PPF consulting engineers offer feasibility studies, technical due diligence, failure analysis, expert witness services, construction management, and general engineering advisory services.' },
      { q: 'How do I hire an engineering consultant?', a: 'Post your project as an RFQ, browse available consultants in the marketplace, or DM an engineer directly. Most consultants respond within 24–48 hours.' },
      { q: 'How much do engineering consultants charge?', a: 'Engineering consultants on PPF typically charge $150–$350/hour. Fixed-fee project pricing is also available for defined scope work.' },
      { q: 'Can I hire a consultant for a short-term project?', a: 'Yes. Many engineers on PPF are available for single-day reviews, short-term consulting engagements, and project-based work with no long-term commitment.' },
    ],
  },
}

export const categorySlugToLabel: Record<string, string> = {
  'structural-engineering': 'Structural Engineering',
  'mechanical-engineering': 'Mechanical Engineering',
  'civil-engineering': 'Civil Engineering',
  'electrical-engineering': 'Electrical Engineering',
  'pe-stamps': 'PE Stamps',
  'consulting-services': 'Consulting Services',
}
