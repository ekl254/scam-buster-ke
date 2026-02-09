-- ScamBusterKE Seed Data: Real documented scam cases from credible Kenyan sources
-- All entries sourced from DCI Kenya, Communications Authority of Kenya,
-- Kenya Ministry of Labour, news outlets, and court records.
--
-- IMPORTANT: Run migration 004_source_url.sql FIRST before running this script.
-- Run this in your Supabase SQL Editor.

INSERT INTO reports (identifier, identifier_type, scam_type, description, amount_lost, is_anonymous, upvotes, verification_tier, evidence_score, reporter_verified, is_expired, source_url)
VALUES

-- ============================================
-- INVESTMENT / PONZI SCHEMES
-- ============================================

('CBEX', 'company', 'investment',
 'CBEX (CryptoBridge Exchange) was a Ponzi scheme promising 100% monthly returns via AI-powered crypto trading. Collapsed April 2025 leaving investors across Kenya and Nigeria with massive losses. Nigeria EFCC arrested suspects and issued warrants for four Kenyans. Kenya Capital Markets Authority issued investor alert. Interpol and FBI joined investigation.',
 0, true, 0, 3, 30, false, false,
 'https://beincrypto.com/cbex-collapse-nigeria-kenya/'),

('BTCM', 'company', 'investment',
 'BTCM was a fake Bitcoin mining Ponzi scheme in Kenya. Subscribers invested KES 600 to KES 266,000 to purchase mining equipment with promises of 188% to 350% ROI within days. Most victims recruited by friends and family. Platform collapsed June 2024 after demanding a final one-time deposit.',
 266000, true, 0, 3, 30, false, false,
 'https://www.mariblock.com/btcm-kenyas-latest-crypto-mining-ponzi-scheme-collapses-leaving-investors-empty-handed/'),

('AG Bitcoin Miners', 'company', 'investment',
 'AG Bitcoin Miners was a crypto Ponzi scheme offering investments from KES 1,000 to KES 60,000 with promised returns of 188% to 249%. Used a hidden website not indexable by Google, international WhatsApp numbers, and fraudulent registration documents. Testimonial photos stolen from Argo Blockchain Texas facility.',
 60000, true, 0, 3, 30, false, false,
 'https://techweez.com/2023/09/15/ag-bitcoin-miner-the-latest-crypto-scam-to-watch-out-for/'),

('Spring Mark Investment', 'company', 'investment',
 'Pyramid scheme operated by Ambrose Makech Abuti from Meadows building in Eldoret CBD. Promised 18% monthly compound interest over five months. Victims included traders, university lecturers, doctors, gospel artists, civil servants, and churches. Abuti vanished with hundreds of millions. DCI investigated.',
 1200000, true, 0, 3, 30, false, false,
 'https://nation.africa/kenya/counties/uasin-gishu/eldoret-investors-lose-millions-of-shillings-in-fake-pyramid-scheme-4706594'),

('Kileleshwa Crypto Exchange Scam', 'company', 'investment',
 'DCI arrested two men in Kileleshwa on 28 February 2025 for allegedly swindling a Chinese national of KES 6.5 million after posing as cryptocurrency exchange experts. Part of a growing trend where Kenya cybercrime losses exceeded KES 30 billion per the 2024/2025 Cybercrime Report.',
 6500000, true, 0, 3, 30, false, false,
 'https://nation.africa/kenya/business/kenya-s-crypto-empires-dci-moves-to-curb-growing-fraud-5288624'),

-- ============================================
-- FAKE GOLD SCAMS
-- ============================================

('DARDESSA Logistics Limited', 'company', 'other',
 'Front company used in a gold scam. Sent a fraudulent invoice for an alleged confiscated gold consignment and directed victim to send USD 100,000 as release fee. Suspects arraigned by DCI. All documentation was forged.',
 12900000, true, 0, 3, 30, false, false,
 'https://www.dci.go.ke/fraudsters-usd-100000-gold-scam-arraigned'),

('Patvad Trading Co. Ltd', 'company', 'other',
 'Used in a gold scam defrauding foreign investors of approximately KES 341 million (2,168,258 Euros). Company was not licensed to trade in minerals by the Ministry of Mining. All documents were forged and supposed customs officials were impostors. Three suspects arrested by DCI in September 2024.',
 341000000, true, 0, 3, 30, false, false,
 'https://www.capitalfm.co.ke/news/2024/09/dci-agents-arrest-3-gold-scammers-after-foreigners-lost-sh340mn/'),

('AERO Logistics', 'company', 'other',
 'Entered into a fake Sales and Purchase Agreement with a victim for 2,820kg of gold. Victim paid USD 1,271,200 between March and May 2024. No gold was ever delivered. Part of a larger syndicate where 14 suspects were arrested by DCI in January 2025. Total victim losses exceeded USD 5 million.',
 164000000, true, 0, 3, 30, false, false,
 'https://www.capitalfm.co.ke/news/2025/01/dci-cracks-down-on-nairobi-gold-scam-ring-arrests-14-in-1-35m-fraud/'),

-- ============================================
-- FAKE RECRUITMENT AGENCIES (BLACKLISTED BY MINISTRY OF LABOUR)
-- ============================================

('First Choice Recruitment and Consultancy Ltd', 'company', 'jobs',
 'Blacklisted by the Ministry of Labour. Directors Judy Jepchirchir and Faith Wariga Gichuhi promised over 1,000 Kenyans overseas jobs that never materialized. Over 200 youths in Uasin Gishu accused the agency of promising Qatar World Cup jobs. Directors barred from registering or running any recruiting firm in Kenya.',
 214000, true, 0, 3, 30, false, false,
 'https://nation.africa/kenya/news/-names-of-32-banned-jobs-recruitment-agencies-5030772'),

('Gulfway Recruitment Company Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency operating without proper authorization. Part of 32 agencies banned by Labour CS Alfred Mutua for defrauding Kenyans seeking overseas employment. DCI investigating 153 additional firms for similar fraud.',
 0, true, 0, 3, 30, false, false,
 'https://www.mwakilishi.com/article/diaspora-news/2025-05-07/kenya-blacklists-32-recruitment-firms-in-crackdown-on-fraudulent'),

('Talent Getaway Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Part of 32 firms banned by the Ministry of Labour for operating without registration or with expired licenses while promising overseas jobs.',
 0, true, 0, 3, 30, false, false,
 'https://biznakenya.com/kenya-blacklists-over-30-recruiters-agencies/'),

('Gratify Solutions International Ltd', 'company', 'jobs',
 'Fake recruitment agency that trafficked Haron Nyakang''o to Myanmar in December 2024. Directors Virginia Wacheke Muriithi and Ann Njeri Kihara found liable by court. Company registered just two months before facilitating travel. Victim promised customer care job in Bangkok at KES 180,000/month, paid KES 200,000, but was forced into online fraud in Myanmar. Court awarded KES 5 million in damages.',
 200000, true, 0, 3, 30, false, false,
 'https://nation.africa/kenya/news/kenyan-trafficked-to-myanmar-wins-case-against-fake-recruitment-agency-5272204'),

('Daawo Holdings Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for fraudulently recruiting Kenyans for non-existent overseas jobs.',
 0, true, 0, 3, 30, false, false,
 'https://www.bana.co.ke/2025/05/list-government-blacklisted-32-recruitment-agencies.html'),

('Makungu International Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for operating without proper registration while promising overseas employment.',
 0, true, 0, 3, 30, false, false,
 'https://www.bana.co.ke/2025/05/list-government-blacklisted-32-recruitment-agencies.html'),

('Jakarta Ventures Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for defrauding Kenyans seeking jobs abroad.',
 0, true, 0, 3, 30, false, false,
 'https://kenyainsights.com/beware-govt-blacklists-32-fake-recruitment-agencies/'),

('Skill Dove Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for illegally operating and defrauding jobseekers.',
 0, true, 0, 3, 30, false, false,
 'https://kenyainsights.com/beware-govt-blacklists-32-fake-recruitment-agencies/'),

('Flexturch Recruitment Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for fraudulent recruitment operations targeting Kenyans seeking overseas employment.',
 0, true, 0, 3, 30, false, false,
 'https://kenyainsights.com/beware-govt-blacklists-32-fake-recruitment-agencies/'),

('Skyward Global Dimensions Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for operating without authorization and defrauding Kenyans seeking overseas employment.',
 0, true, 0, 3, 30, false, false,
 'https://kenyainsights.com/beware-govt-blacklists-32-fake-recruitment-agencies/'),

('Alemtyaz Travel Agent Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for fraudulently recruiting Kenyans for overseas jobs without proper licensing.',
 0, true, 0, 3, 30, false, false,
 'https://www.bana.co.ke/2025/05/list-government-blacklisted-32-recruitment-agencies.html'),

('Royal Capital Placement Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by Labour CS Alfred Mutua for operating without authorization while promising Kenyans overseas employment.',
 0, true, 0, 3, 30, false, false,
 'https://www.mwakilishi.com/article/diaspora-news/2025-05-07/kenya-blacklists-32-recruitment-firms-in-crackdown-on-fraudulent'),

('Geoverah Agency Ltd', 'company', 'jobs',
 'Government-blacklisted recruitment agency. Among 32 firms banned by the Ministry of Labour for fraudulently recruiting Kenyans for overseas jobs. Also associated with Geoverah Africa Safaris Ltd.',
 0, true, 0, 3, 30, false, false,
 'https://www.mwakilishi.com/article/diaspora-news/2025-05-07/kenya-blacklists-32-recruitment-firms-in-crackdown-on-fraudulent'),

-- ============================================
-- LAND / PROPERTY FRAUD
-- ============================================

('Willstone Homes Limited', 'company', 'land',
 'Ensnared US-based investor in KES 57 million fraud involving White Park Gardens development. Property was not located where the sales agreement claimed (listed as Ruai East, Nairobi but actually in Mavoko, Machakos County). Land registration number Block 3/90489 was fabricated. Under investigation for tax evasion and money laundering of KES 417 million.',
 57000000, true, 0, 3, 30, false, false,
 'https://nation.africa/kenya/news/off-plan-scams-from-dream-homes-to-dust--5347430'),

('Mizizi Africa Homes Limited', 'company', 'land',
 'CEO George Mburu ran housing fraud targeting diaspora buyers. US-based Kenyan paid KES 4.25 million for unit in Asali Estate along Kangundo road, Malaa. Two years later the site showed only dilapidated foundations with no infrastructure. Used YouTube videos and artistic impressions to lure overseas investors into buying non-existent properties.',
 4250000, true, 0, 3, 30, false, false,
 'https://kenyainsights.com/how-rogue-kenyan-developers-scam-unsuspecting-diaspora-homebuyers-out-of-millions/'),

-- ============================================
-- WANGIRI / CALLBACK SCAMS (CA KENYA ADVISORIES)
-- ============================================

('+51', 'phone', 'other',
 'Wangiri scam prefix from Peru identified by the Communications Authority of Kenya. Scammers use illegally purchased numbers to place one-ring calls to Kenyan mobile users. When victims call back they are connected to premium-rate numbers that drain airtime. CA advised the public not to return calls from unrecognized international numbers.',
 0, true, 0, 3, 30, false, false,
 'https://www.ca.go.ke/beware-resurgent-wangiri-scam-warns-ca'),

('+64', 'phone', 'other',
 'Wangiri scam prefix from New Zealand identified by the Communications Authority of Kenya. Part of a resurgent wave of international callback scams targeting Kenyan mobile users. Victims redirected to premium numbers and made to listen to recorded messages.',
 0, true, 0, 3, 30, false, false,
 'https://www.ca.go.ke/beware-resurgent-wangiri-scam-warns-ca'),

('+963', 'phone', 'other',
 'Wangiri scam prefix from Syria identified by the Communications Authority of Kenya. International scammers use these prefixes to place missed calls and trick Kenyans into calling back premium-rate numbers.',
 0, true, 0, 3, 30, false, false,
 'https://www.citizen.digital/article/wangiri-scam-kenyans-warned-against-returning-unknown-international-calls-n320042'),

('+252', 'phone', 'other',
 'Wangiri scam prefix from Somalia identified by the Communications Authority of Kenya. Part of international callback scam pattern where one-ring calls lure victims into calling premium-rate numbers that charge exorbitant per-minute rates.',
 0, true, 0, 3, 30, false, false,
 'https://www.citizen.digital/article/wangiri-scam-kenyans-warned-against-returning-unknown-international-calls-n320042'),

('+37', 'phone', 'other',
 'Wangiri scam prefix from Latvia identified by the Communications Authority of Kenya. Calls from this prefix linked to international callback scams targeting East African mobile subscribers.',
 0, true, 0, 3, 30, false, false,
 'https://www.citizen.digital/article/wangiri-scam-kenyans-warned-against-returning-unknown-international-calls-n320042'),

-- ============================================
-- ONLINE / IMPERSONATION SCAMS
-- ============================================

('Simba Cement Impersonation Scam', 'company', 'online',
 'DCI apprehended three suspects (Kelvin Kiplangat, Cyprian Bowen, Betty Cherop Kosgei) operating from Baruti, Nakuru County, who impersonated Simba Cement employees. Enticed customers with promises of cement at low prices. SIM cards, desktop computer, and mobile phones recovered. DCI used mobile phone triangulation to track suspects.',
 0, true, 0, 3, 30, false, false,
 'https://www.dci.go.ke/arrest-online-fraudsters'),

-- ============================================
-- TENDER / GOVERNMENT FRAUD
-- ============================================

('Kenya Prisons Tender Scam', 'company', 'tender',
 'DCI arrested four suspects who defrauded a businessman of KES 105,000 posing as senior Kenya Prisons Service officers promising a lucrative contract. Search uncovered 37 forged Kenya Prisons tender approval forms, two fake staff ID cards, eight mobile phones, and six national ID cards.',
 105000, true, 0, 3, 30, false, false,
 'https://www.kenyans.co.ke/news/118800-four-suspects-arrested-after-swindling-man-ksh105000-fake-kenya-prisons-tender'),

('Sh182M Tender Fraud (Advocate Michael Otieno Owano)', 'company', 'tender',
 'Nairobi-based advocate Michael Otieno Owano arrested by DCI in connection with a fraudulent tender scam that defrauded an American company of over KES 182 million.',
 182000000, true, 0, 3, 30, false, false,
 'https://nairobinews.co.ke/nairobi-lawyer-arrested-in-connection-with-sh-182-million-fake-tender-scam/'),

-- ============================================
-- ROMANCE SCAMS
-- ============================================

('Florence Mwende Musau Romance Scam', 'company', 'romance',
 'Kenyan woman sentenced to 44 months in US federal prison in Boston for running a romance scam targeting Americans. Created fictitious profiles on dating and social media websites. Her group collectively swindled victims of over $4 million. Ordered to pay $957,000 (approximately KES 119 million) in restitution.',
 119000000, true, 0, 3, 30, false, false,
 'https://www.justice.gov/usao-ma/pr/kenyan-national-pleads-guilty-fraud-conspiracy-involving-romance-scams');
