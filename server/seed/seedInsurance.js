import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InsuranceProduct from '../src/models/InsuranceProduct.js';

dotenv.config();

const products = [
  {
    name: 'Family Health Optima Insurance',
    insurer: 'Star Health',
    category: 'health',
    shortDescription: 'Super premium family floater health plan covering hospitalization expenses, daycare procedures, and newborn baby cover.',
    coverTiers: [
      { coverAmount: 500000, indicativeAnnualPremium: 12500 },
      { coverAmount: 1000000, indicativeAnnualPremium: 18400 },
      { coverAmount: 1500000, indicativeAnnualPremium: 23200 },
    ],
    keyFeatures: [
      'Single private A/C room coverage.',
      'Cashless treatment in over 14,000+ network hospitals.',
      'Automatic restoration of sum insured by 100% upon exhaustion.',
      'Covers newborn baby from day 16 of birth.',
    ],
    inclusions: [
      'In-patient hospitalization charges (room rent, boarding, nursing).',
      'Pre-hospitalization expenses up to 60 days.',
      'Post-hospitalization medical bills up to 90 days.',
      'All daycare treatments and procedures.',
      'Emergency road ambulance fees.',
    ],
    exclusions: [
      'Cosmetic or plastic surgeries unless necessitated by accident.',
      'Admission for diagnostic, evaluation, or monitoring purposes only.',
      'Intentional self-injury or suicide attempts.',
      'Expenses arising from war, nuclear hazards, or riots.',
    ],
    claimSettlementRatio: 89.9,
    claimProcess: [
      'Intimate Star Health within 24 hours of emergency admission, or 48 hours prior to planned hospitalization.',
      'Provide your Star Health ID card or policy number at the hospital insurance desk.',
      'The hospital will submit pre-authorization request directly to Star Health.',
      ' Star Health approves pre-auth, allowing cashless discharge.',
      'For reimbursement claims: submit all original bills, prescriptions, and discharge summaries within 30 days of discharge.',
    ],
    officialLink: 'https://www.starhealth.in',
  },
  {
    name: 'Optima Secure',
    insurer: 'HDFC Ergo',
    category: 'health',
    shortDescription: 'High-end health plan with 4x coverage benefits and zero deductible limits for comprehensive family health.',
    coverTiers: [
      { coverAmount: 500000, indicativeAnnualPremium: 14200 },
      { coverAmount: 1000000, indicativeAnnualPremium: 20500 },
      { coverAmount: 1500000, indicativeAnnualPremium: 26800 },
    ],
    keyFeatures: [
      'Secure Benefit: Instantly doubles your sum insured from day 1.',
      'Plus Benefit: Increases your base cover by 50% per year for non-claim years up to 100%.',
      'Restore Benefit: Unlimited automatic restoration of cover amount.',
      'Zero non-medical deduction: Pays full amount of consumables like gloves, masks, etc.',
    ],
    inclusions: [
      'In-patient treatment, boarding, operation theatre, and ICU fees.',
      'Pre-hospitalization up to 60 days, post-hospitalization up to 180 days.',
      'Home healthcare and organ donor expenses covered.',
      'Emergency air ambulance fees.',
    ],
    exclusions: [
      'Addiction treatments (alcoholism, drug abuse).',
      'Obesity control treatments or surgeries.',
      'Pregnancy and maternity charges (unless specified in add-on riders).',
      'Gender reassignment therapies.',
    ],
    claimSettlementRatio: 97.2,
    claimProcess: [
      'Locate an empaneled HDFC Ergo network hospital.',
      'Show your digital health card at the TPA desk during admission.',
      'The TPA coordinator will verify and submit the cashless pre-authorization form.',
      'Verification is processed and cashless clearance is issued within 2 hours.',
    ],
    officialLink: 'https://www.hdfcergo.com',
  },
  {
    name: 'Smart Secure Plus',
    insurer: 'Max Life',
    category: 'term_life',
    shortDescription: 'Highly flexible term life cover with optional critical illness riders and premium return options.',
    coverTiers: [
      { coverAmount: 5000000, indicativeAnnualPremium: 8200 },
      { coverAmount: 10000000, indicativeAnnualPremium: 12500 },
      { coverAmount: 20000000, indicativeAnnualPremium: 20800 },
    ],
    keyFeatures: [
      'Flexible payout options: Lump sum, monthly income, or combination.',
      'Return of Premium option: Collect all premiums back if you survive the policy term.',
      'Special discounted rates for non-smokers and female applicants.',
      'Increase coverage at key life milestones (marriage, child birth).',
    ],
    inclusions: [
      'Death benefit paid to nominees in case of natural or accidental death.',
      'Terminal Illness benefit: Full sum insured paid early upon diagnosis of terminal illness.',
      'Premium waiver in case of permanent total disability.',
    ],
    exclusions: [
      'Suicide within the first 12 months from policy start date (only 80% premiums returned).',
      'Death arising from participation in criminal or unlawful activities.',
      'Death due to self-inflicted injuries or abuse of substances.',
    ],
    claimSettlementRatio: 99.5,
    claimProcess: [
      'Inform Max Life about the death claim via their portal, email, or physical branch.',
      'Nominee submits original policy document, death certificate, claim form, and KYC.',
      'For accidental death, submit FIR and post-mortem reports.',
      'Max Life processes and disburses the payout within 3 working days under InstaClaim guidelines.',
    ],
    officialLink: 'https://www.maxlifeinsurance.com',
  },
  {
    name: 'e-Term Policy',
    insurer: 'LIC',
    category: 'term_life',
    shortDescription: 'Pure protection term insurance plan available online from LIC, offering high security and trust.',
    coverTiers: [
      { coverAmount: 5000000, indicativeAnnualPremium: 9800 },
      { coverAmount: 10000000, indicativeAnnualPremium: 14600 },
      { coverAmount: 20000000, indicativeAnnualPremium: 24500 },
    ],
    keyFeatures: [
      'Online application with simple medical examinations.',
      'Backed by India\'s largest public sector life insurer with sovereign guarantee.',
      'Flexible policy terms ranging from 10 to 35 years.',
    ],
    inclusions: [
      'Death benefit paid as a lump sum to the nominee.',
      'Worldwide coverage: Death occurring anywhere globally is covered.',
    ],
    exclusions: [
      'Suicide within 1 year from policy commencement date (only 80% of premiums paid will be refunded).',
    ],
    claimSettlementRatio: 98.6,
    claimProcess: [
      'Nominee intimates the home branch of LIC with death certificate.',
      'Fill up Claim Form 3783 and submit with KYC and bank account details.',
      'LIC verifies the documents and credits the claim amount directly via NEFT.',
    ],
    officialLink: 'https://licindia.in',
  },
  {
    name: 'iProtect Smart',
    insurer: 'ICICI Prudential',
    category: 'term_life',
    shortDescription: 'Comprehensive term cover guarding against death, terminal illness, and 34 critical illnesses.',
    coverTiers: [
      { coverAmount: 5000000, indicativeAnnualPremium: 8900 },
      { coverAmount: 10000000, indicativeAnnualPremium: 13200 },
      { coverAmount: 20000000, indicativeAnnualPremium: 21900 },
    ],
    keyFeatures: [
      'Covers 34 critical illnesses (optional rider) with lump-sum payouts.',
      'Special premium rates for women and non-tobacco users.',
      'Tax benefits under Section 80C and 10(10D) of Income Tax Act.',
    ],
    inclusions: [
      'Death benefit paid to nominee on death of life assured.',
      'Full payout upon terminal illness diagnosis.',
      'Accidental Death Rider (optional) offers double payout.',
    ],
    exclusions: [
      'Suicide within one year of policy start date.',
      'Injuries arising from professional adventure sports or aviation stunts.',
    ],
    claimSettlementRatio: 97.9,
    claimProcess: [
      'Report the claim online or at an ICICI Prudential life branch.',
      'Provide claimant statement, death certificate, and medical logs.',
      'ICICI Pru processes the claim, aiming for completion in 1 day for eligible claims.',
    ],
    officialLink: 'https://www.iciciprulife.com',
  },
  {
    name: 'eShield Next',
    insurer: 'SBI Life',
    category: 'term_life',
    shortDescription: 'New age term protection plan that adapts to your changing life needs and goals.',
    coverTiers: [
      { coverAmount: 5000000, indicativeAnnualPremium: 8400 },
      { coverAmount: 10000000, indicativeAnnualPremium: 12800 },
      { coverAmount: 20000000, indicativeAnnualPremium: 21200 },
    ],
    keyFeatures: [
      'Life Stage Upgrade: Boost cover on marriage and birth of children.',
      'Better Half Benefit: Option to cover spouse under the same policy.',
      'Premium waiver benefit on accidental total permanent disability.',
    ],
    inclusions: [
      'Lump-sum death benefit payout.',
      'Critical illness and accident riders options.',
    ],
    exclusions: [
      'Suicide within 12 months from policy inception.',
      'Self-inflicted injuries or illegal activities.',
    ],
    claimSettlementRatio: 96.8,
    claimProcess: [
      'Submit the claim online through the SBI Life portal.',
      'Upload nominee ID, death certificate, and policy papers.',
      'Receive verification updates via SMS and email.',
    ],
    officialLink: 'https://www.sbilife.co.in',
  },
  {
    name: 'Auto Secure Vehicle Insurance',
    insurer: 'Tata AIG',
    category: 'vehicle',
    shortDescription: 'Comprehensive car insurance with roadside assistance, zero depreciation, and engine secure riders.',
    coverTiers: [
      { coverAmount: 300000, indicativeAnnualPremium: 5800 },
      { coverAmount: 500000, indicativeAnnualPremium: 8800 },
      { coverAmount: 1000000, indicativeAnnualPremium: 14500 },
    ],
    keyFeatures: [
      'Zero Depreciation Rider: Full cover for fiber, glass, and plastic parts.',
      'Cashless garage repair at over 7,500+ network garages.',
      '24x7 Roadside Assistance: Free towing, flat tyre fix, and fuel delivery.',
      'Engine Secure Rider: Protects engine from water logging or hydrostatic locks.',
    ],
    inclusions: [
      'Loss or damage to the vehicle due to accidents, fire, explosion, or theft.',
      'Third-party liability cover for injury or property damage.',
      'Personal Accident cover of ₹15 Lakhs for owner-driver.',
      'Losses caused due to natural disasters (earthquake, flood, storm).',
    ],
    exclusions: [
      'Normal wear and tear and general aging of the vehicle.',
      'Driving without a valid driving license.',
      'Driving under the influence of alcohol, drugs, or liquors.',
      'Mechanical or electrical breakdown of vehicle components.',
    ],
    claimSettlementRatio: 95.4,
    claimProcess: [
      'File an FIR and take photos of vehicle damages in case of accident or theft.',
      'Register your claim on Tata AIG website or contact customer helpline.',
      'Towing service will move the car to the nearest network garage.',
      'Tata AIG surveyor visits the garage to approve the repair work.',
      'Cashless release is issued post repairs, you pay only file charges.',
    ],
    officialLink: 'https://www.tataaig.com',
  },
  {
    name: 'Car Insurance policy',
    insurer: 'ICICI Lombard',
    category: 'vehicle',
    shortDescription: 'Online comprehensive vehicle insurance featuring instant policy copy, cashless claims, and high support.',
    coverTiers: [
      { coverAmount: 300000, indicativeAnnualPremium: 5400 },
      { coverAmount: 500000, indicativeAnnualPremium: 8200 },
      { coverAmount: 1000000, indicativeAnnualPremium: 13800 },
    ],
    keyFeatures: [
      'Insta-renewal: Renew policy online in 2 minutes without inspection.',
      'Mobile App claim settlement: Upload vehicle video to settle claims in 30 minutes.',
      'No Claim Bonus (NCB) protection rider.',
    ],
    inclusions: [
      'Physical damage from accidents, fires, theft, vandalism.',
      'Mandatory third-party injury and property damages.',
    ],
    exclusions: [
      'Consequential losses (loss not directly arising from accident).',
      'Depreciation of parts (unless zero-dep rider is active).',
      'Driving outside geographical limits specified in policy.',
    ],
    claimSettlementRatio: 94.1,
    claimProcess: [
      'Take video/photos of damage using the ICICI Lombard app.',
      'Apply for self-survey through the app for minor claims.',
      'For major damages, take the car to a network garage.',
      'Surveyor inspects and approves repairs online within a few hours.',
    ],
    officialLink: 'https://www.icicilombard.com',
  },
  {
    name: 'Personal Accident Insurance',
    insurer: 'HDFC Ergo',
    category: 'accident',
    shortDescription: '24/7 global protection against accidental death, total and partial permanent disability, and weekly payouts.',
    coverTiers: [
      { coverAmount: 1000000, indicativeAnnualPremium: 1450 },
      { coverAmount: 2000000, indicativeAnnualPremium: 2700 },
      { coverAmount: 5000000, indicativeAnnualPremium: 5800 },
    ],
    keyFeatures: [
      'Worldwide cover: Active 24/7 across any geographical borders.',
      'Weekly benefit payout: Replaces lost income during temporary total disability.',
      'Children\'s education grant: Lumpsum paid to secure children\'s school fees.',
      'Fracture bone benefit: Cash payouts for bone fractures.',
    ],
    inclusions: [
      'Accidental Death: 100% of sum insured paid to nominee.',
      'Permanent Total Disability (loss of both limbs, eyes): 100% payout.',
      'Permanent Partial Disability (loss of fingers, single limb): 50-70% payout.',
      'Accidental hospitalization inpatient expenses covered.',
    ],
    exclusions: [
      'Accidents caused under the influence of alcohol, narcotics, or hallucinogens.',
      'Participation in hazardous sports (racing, skydiving, mountaineering).',
      'Accidents arising from active service in army, navy, or air force.',
      'Suicidal intents or intentional self-harms.',
    ],
    claimSettlementRatio: 97.2,
    claimProcess: [
      'Notify HDFC Ergo within 7 days of the accident.',
      'For disability claims: submit disability certificate from a government medical board.',
      'For death claims: submit FIR, post-mortem report, death certificate, and claim papers.',
      'Funds are credited to the nominee\'s bank account upon verification.',
    ],
    officialLink: 'https://www.hdfcergo.com',
  },
  {
    name: 'Personal Accident Policy',
    insurer: 'Star Health',
    category: 'accident',
    shortDescription: 'Affordable personal accident cover protecting against death and permanent disability with education grants.',
    coverTiers: [
      { coverAmount: 1000000, indicativeAnnualPremium: 1150 },
      { coverAmount: 2000000, indicativeAnnualPremium: 2100 },
      { coverAmount: 5000000, indicativeAnnualPremium: 4800 },
    ],
    keyFeatures: [
      'Simple cover focusing on disability and accidental death.',
      'Education grant for dependent children up to ₹20,000 per child.',
      'Optional cover for medical expenses resulting from accident.',
    ],
    inclusions: [
      '100% payout for accidental death or permanent total disability.',
      'Partial disability payouts based on medical scales.',
    ],
    exclusions: [
      'Self-injury, suicide attempts, or psychiatric illnesses.',
      'Accidents during aviation activities (except as a commercial passenger).',
    ],
    claimSettlementRatio: 89.9,
    claimProcess: [
      'Report the incident to Star Health claims team.',
      'Submit the medical certificates and hospital discharge summaries.',
      'Star Health audits the injury reports and releases payouts.',
    ],
    officialLink: 'https://www.starhealth.in',
  },
  {
    name: 'MediPrime Personal Accident',
    insurer: 'Tata AIG',
    category: 'accident',
    shortDescription: 'Accident protection focusing on medical expenses and ambulance supports during critical trauma events.',
    coverTiers: [
      { coverAmount: 1000000, indicativeAnnualPremium: 1350 },
      { coverAmount: 2000000, indicativeAnnualPremium: 2450 },
      { coverAmount: 5000000, indicativeAnnualPremium: 5400 },
    ],
    keyFeatures: [
      'Enhanced accidental medical expense coverage.',
      'Covers road ambulance and emergency air lift charges.',
      'Premium waiver benefit on permanent disability.',
    ],
    inclusions: [
      'Death and total/partial disability benefits.',
      'Inpatient medical cost arising directly out of accidental injuries.',
    ],
    exclusions: [
      'Intentional self-harm, suicide, or mental illnesses.',
      'Adventure sports or illegal acts.',
    ],
    claimSettlementRatio: 95.4,
    claimProcess: [
      'Intimate Tata AIG via call or web.',
      'Send digital copies of bills, medical reports, and KYC papers.',
      'Verification is reviewed and settlement is completed via NEFT.',
    ],
    officialLink: 'https://www.tataaig.com',
  },
  {
    name: 'Care Advantage',
    insurer: 'Care Health',
    category: 'health',
    shortDescription: 'Comprehensive health cover with no capping on room rent and global coverage for emergencies.',
    coverTiers: [
      { coverAmount: 500000, indicativeAnnualPremium: 11900 },
      { coverAmount: 1000000, indicativeAnnualPremium: 17600 },
      { coverAmount: 1500000, indicativeAnnualPremium: 22100 },
    ],
    keyFeatures: [
      'No restriction on room rent, ICU, or doctor fees.',
      'Annual health check-up for all insured members.',
      'Cover for mental illness and modern treatments.',
      'Restore benefit to reinstate sum insured.',
    ],
    inclusions: [
      'In-patient hospitalization and daycare procedures.',
      'Pre and post-hospitalization expenses.',
      'Ambulance charges and organ donor expenses.',
    ],
    exclusions: [
      'Cosmetic and aesthetic treatments.',
      'Treatment for alcohol or substance abuse.',
      'Investigative procedures without admission.',
    ],
    claimSettlementRatio: 95.2,
    claimProcess: [
      'Inform Care Health within 24 hours of admission.',
      'Submit pre-authorization at the network hospital.',
      'For reimbursement, upload bills within 30 days of discharge.',
    ],
    officialLink: 'https://www.carehealthinsurance.com',
  },
  {
    name: 'ReAssure 2.0',
    insurer: 'Niva Bupa',
    category: 'health',
    shortDescription: 'Modern health plan with 100% reinstatement and unlimited claims for the year.',
    coverTiers: [
      { coverAmount: 500000, indicativeAnnualPremium: 13100 },
      { coverAmount: 1000000, indicativeAnnualPremium: 19800 },
      { coverAmount: 1500000, indicativeAnnualPremium: 25400 },
    ],
    keyFeatures: [
      'Unlimited reinstatement of sum insured.',
      'No sub-limits on hospital room and consumables.',
      'Wellness rewards that reduce renewal premium.',
      'Cover for teleconsultations and OPD.',
    ],
    inclusions: [
      'Cashless and reimbursement hospitalization.',
      'Pre and post-hospitalization coverage.',
      'Mental healthcare and preventive health check-ups.',
    ],
    exclusions: [
      'Non-allopathic treatments (unless add-on).',
      'Treatments within first 30 days of waiting period.',
      'Injuries from hazardous activities.',
    ],
    claimSettlementRatio: 91.8,
    claimProcess: [
      'Raise a claim through the Niva Bupa app or helpline.',
      'Upload discharge summary and bills.',
      'Approval and settlement processed digitally.',
    ],
    officialLink: 'https://www.nivabupa.com',
  },
  {
    name: 'eTouch Term Plan',
    insurer: 'Bajaj Allianz',
    category: 'term_life',
    shortDescription: 'Affordable online term cover with increasing cover option and spouse protection.',
    coverTiers: [
      { coverAmount: 5000000, indicativeAnnualPremium: 7900 },
      { coverAmount: 10000000, indicativeAnnualPremium: 11900 },
      { coverAmount: 20000000, indicativeAnnualPremium: 19900 },
    ],
    keyFeatures: [
      'Option to increase cover at life milestones.',
      'Spouse cover add-on under the same plan.',
      'Flexible payout: lump sum or monthly income.',
    ],
    inclusions: [
      'Death benefit paid to the nominee.',
      'Accidental death benefit rider option.',
      'Terminal illness advance payout.',
    ],
    exclusions: [
      'Death by suicide within first year.',
      'Death due to criminal activity.',
    ],
    claimSettlementRatio: 98.0,
    claimProcess: [
      'Intimate Bajaj Allianz via portal or branch.',
      'Submit claim form, death certificate, and KYC.',
      'Payout released to nominee after verification.',
    ],
    officialLink: 'https://www.bajajallianz.com',
  },
  {
    name: 'eTerm Plan',
    insurer: 'Kotak Life',
    category: 'term_life',
    shortDescription: 'Pure protection term plan with return-of-premium and critical illness options.',
    coverTiers: [
      { coverAmount: 5000000, indicativeAnnualPremium: 8600 },
      { coverAmount: 10000000, indicativeAnnualPremium: 13100 },
      { coverAmount: 20000000, indicativeAnnualPremium: 21700 },
    ],
    keyFeatures: [
      'Return of premium on survival to maturity.',
      'Critical illness cover rider (optional).',
      'Lower premiums for non-smokers.',
    ],
    inclusions: [
      'Lump-sum death benefit.',
      'Critical illness diagnosis payout (rider).',
      'Waiver of premium on disability (rider).',
    ],
    exclusions: [
      'Suicide within first 12 months.',
      'Self-inflicted injury.',
    ],
    claimSettlementRatio: 97.4,
    claimProcess: [
      'Register the claim on Kotak Life portal.',
      'Provide nominee documents and cause of death.',
      'Settlement credited after due verification.',
    ],
    officialLink: 'https://www.kotaklife.com',
  },
  {
    name: 'GoDigit Car Insurance',
    insurer: 'Go Digit',
    category: 'vehicle',
    shortDescription: 'Tech-first comprehensive car insurance with instant claims and doorstep survey.',
    coverTiers: [
      { coverAmount: 300000, indicativeAnnualPremium: 5200 },
      { coverAmount: 500000, indicativeAnnualPremium: 8100 },
      { coverAmount: 1000000, indicativeAnnualPremium: 13900 },
    ],
    keyFeatures: [
      'Self-inspection video claims in minutes.',
      'Cashless repairs at 10,000+ garages.',
      'Zero depreciation and engine protection riders.',
    ],
    inclusions: [
      'Own-damage and third-party liability.',
      'Natural calamity and theft cover.',
      'Personal accident cover for owner-driver.',
    ],
    exclusions: [
      'Wear and tear and ageing.',
      'Driving without valid licence.',
      'Loss outside geographical area.',
    ],
    claimSettlementRatio: 96.2,
    claimProcess: [
      'Tap “Claim” on the GoDigit app and upload a video.',
      'For accidents, schedule a doorstep survey.',
      'Cashless repair approved at network garage.',
    ],
    officialLink: 'https://www.godigit.com',
  },
  {
    name: 'Acko Car Insurance',
    insurer: 'Acko',
    category: 'vehicle',
    shortDescription: 'Low-cost digital car insurance with instant policy issuance and quick settlements.',
    coverTiers: [
      { coverAmount: 300000, indicativeAnnualPremium: 4900 },
      { coverAmount: 500000, indicativeAnnualPremium: 7900 },
      { coverAmount: 1000000, indicativeAnnualPremium: 13400 },
    ],
    keyFeatures: [
      'Fully digital onboarding with instant policy.',
      'Hyperlocal cashless garage network.',
      'Free roadside assistance add-on.',
    ],
    inclusions: [
      'Accidental damage and theft.',
      'Third-party liability as per law.',
      'Personal accident cover.',
    ],
    exclusions: [
      'Consequential damage not from accident.',
      'Depreciation unless zero-dep rider.',
      'Drunken driving exclusions.',
    ],
    claimSettlementRatio: 92.7,
    claimProcess: [
      'Raise claim on the Acko app with photos.',
      'Self-survey for minor damage.',
      'Garage repair approved and settled online.',
    ],
    officialLink: 'https://www.acko.com',
  },
  {
    name: 'Accident Shield',
    insurer: 'Bajaj Allianz',
    category: 'accident',
    shortDescription: 'Broad accident cover with education grant for children and temporary disability income.',
    coverTiers: [
      { coverAmount: 1000000, indicativeAnnualPremium: 1390 },
      { coverAmount: 2000000, indicativeAnnualPremium: 2560 },
      { coverAmount: 5000000, indicativeAnnualPremium: 5500 },
    ],
    keyFeatures: [
      'Worldwide 24x7 coverage.',
      'Weekly compensation for temporary disability.',
      'Children education grant on death.',
    ],
    inclusions: [
      'Accidental death and permanent disability.',
      'Hospital cash and ambulance cover.',
      'Fracture and burns benefits.',
    ],
    exclusions: [
      'Self-harm or intoxication related accidents.',
      'Hazardous sports and aviation stunts.',
    ],
    claimSettlementRatio: 98.0,
    claimProcess: [
      'Notify Bajaj Allianz within 7 days.',
      'Submit disability certificate or FIR for death.',
      'Payout to nominee after verification.',
    ],
    officialLink: 'https://www.bajajallianz.com',
  },
  {
    name: 'Personal Accident Cover',
    insurer: 'Reliance General',
    category: 'accident',
    shortDescription: 'Budget-friendly accident plan covering death, disability, and medical costs.',
    coverTiers: [
      { coverAmount: 1000000, indicativeAnnualPremium: 1090 },
      { coverAmount: 2000000, indicativeAnnualPremium: 1990 },
      { coverAmount: 5000000, indicativeAnnualPremium: 4500 },
    ],
    keyFeatures: [
      'Modest premium with high sum insured.',
      'Optional medical expense extension.',
      'Education benefit for dependent children.',
    ],
    inclusions: [
      'Death and permanent disability payouts.',
      'Partial disability on a scaled basis.',
      'Accidental hospitalization cover.',
    ],
    exclusions: [
      'Suicide and self-injury.',
      'Accidents under intoxication.',
    ],
    claimSettlementRatio: 94.7,
    claimProcess: [
      'Inform Reliance General claims team.',
      'Provide medical reports and bills.',
      'Verification and NEFT settlement.',
    ],
    officialLink: 'https://www.reliancegeneral.co.in',
  },
];

async function seed() {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finnova';
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB to seed Insurance');

    await InsuranceProduct.deleteMany();
    console.log('🗑️ Cleared existing insurance products');

    await InsuranceProduct.insertMany(products);
    console.log(`🎉 Seeded ${products.length} insurance products successfully`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding insurance:', error);
    process.exit(1);
  }
}

seed();
