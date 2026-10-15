// Practice content from the website brief. Pages and the database seed both read from here.

export const practice = {
  name: 'Dr Nontu Medical Practice',
  doctor: 'Dr Nontuthuko Ndlovu',
  credentials: 'MBChB (UP) · BCMP (WSU) · DipPEC (CMSA)',
  role: 'General Practitioner · Primary & Emergency Care',
  tagline: 'Every patient. Expertly cared for.',
  practiceNo: '1344625',
  // Bookings & Enquiries (supplied by Dr Nontu, Oct 2026)
  phones: ['+27 68 982 0921'],
  email: 'info@drnontu.co.za',
  // the practice email has occasional hiccups, so the Gmail address is shown too and gets booking alerts
  emails: ['info@drnontu.co.za', 'drnontumedicalpractice@gmail.com'],
  // TODO(client): WhatsApp number to follow (the bookings number is not on WhatsApp).
  // While this is empty, WhatsApp buttons become "Send a message" links to the contact form.
  whatsapp: '',
  social: { instagram: '', facebook: '', tiktok: '' },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};

export const tel = (p: string) => 'tel:' + p.replace(/\s/g, '');
export const hasWhatsApp = Boolean(practice.whatsapp);
export const waLink = (text?: string) => `https://wa.me/${practice.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;

// Photos are either the practice's own files in /public/photos ("/photos/reception.jpg") or stock placeholders (Unsplash ids).
export const img = (id: string, w = 1200) => (id.startsWith('/') ? id : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`);

// Stock placeholders until the practice's own photographs arrive: replace a value with "/photos/<file>".
// See public/photos/README.md for the list of shots.
export const photos = {
  tea: '1633945984522-a19268cc75ad',
  handsSteth: '1666887364752-29dcc75d6aee',
  stethTable: '1666886573206-e31fe221db88',
  oliveLight: '1623624728973-d613d34dfc86',
  oliveJug: '1690994065552-6a35a0455ea2',
  oliveVase: '1596679223294-80bcca0f47d5',
  oliveClose: '1758641283518-59ade23743ae',
  hallway: '1787496994867-939269b4d323',
  door: '1559871753-75a00941f6b2',
  laptop: '1618826908215-bf5c44ca24af',
  bp: '1631815587646-b85a1bb027e1',
  pregnancy: '1493894473891-10fc1e5dbd22',
  babyFeet: '1555252333-9f8e92e65df9',
  plaster: '1609840534277-88833ef3ddeb',
  hands: '1604881991720-f91add269bed',
  handsHold: '1604881991575-dfb1003d8811',
  armchairs: '1787496994323-59ac5cff09f9',
};

export type Mode = 'clinic' | 'house' | 'screen';

export const services: {
  slug: string; name: string; summary: string; body: string[]; modes: Mode[]; image: string;
}[] = [
  { slug: 'in-person-consultations', name: 'In-person consultations', summary: 'Assessment, diagnosis and treatment in a comfortable, private setting.',
    body: ['A full consultation at Esther Park or Fourways: time to talk, a careful examination, and a clear plan you understand before you leave.', 'Bring your questions, your medication and anything that worries you. Nothing is too small to mention.'],
    modes: ['clinic'], image: photos.handsSteth },
  { slug: 'house-calls', name: 'House calls', summary: 'Quality medical care in the comfort of your home.',
    body: ['When getting to the practice is hard (you are unwell, caring for someone, or simply more comfortable at home), Dr Nontu comes to you.', 'House calls run daily from 09:00 to 16:00, subject to availability and service area.'],
    modes: ['house'], image: photos.door },
  { slug: 'virtual-consultations', name: 'Virtual consultations', summary: 'Convenient medical care from wherever you are.',
    body: ['Consult by secure video, day or night. Ideal for follow-ups, repeat scripts, results and questions that cannot wait until morning.', 'Virtual consultations are paid when you book.'],
    modes: ['screen'], image: photos.laptop },
  { slug: 'preventative-healthcare', name: 'Preventative healthcare', summary: 'Health assessments, screening and guidance to help you stay well.',
    body: ['Blood pressure, blood sugar, cholesterol and age-appropriate screening, with practical advice that fits your life.', 'Catching things early is the kindest thing we can do for your future self.'],
    modes: ['clinic', 'house'], image: photos.bp },
  { slug: 'chronic-care', name: 'Chronic care', summary: 'Ongoing management and monitoring of chronic conditions.',
    body: ['Diabetes, hypertension, asthma, thyroid conditions and more: regular reviews, script management and a doctor who knows your history.', 'Follow-ups can be in person, at home or online.'],
    modes: ['clinic', 'house', 'screen'], image: photos.stethTable },
  { slug: 'womens-health', name: "Women's health", summary: "Compassionate healthcare tailored to women's needs.",
    body: ['Contraception, pap smears, menstrual and menopausal care, pregnancy questions and general wellbeing, in a private, unhurried space.'],
    modes: ['clinic', 'screen'], image: photos.pregnancy },
  { slug: 'family-and-childrens-healthcare', name: "Family & children's healthcare", summary: 'Care for the whole family, including the little ones.',
    body: ['From newborn checks to teenage questions to grandparents’ reviews, one doctor who knows the whole family.'],
    modes: ['clinic', 'house'], image: photos.babyFeet },
  { slug: 'minor-procedures-and-wound-care', name: 'Minor procedures & wound care', summary: 'Minor procedures, wound care and in-practice interventions.',
    body: ['Wound cleaning and dressing, suturing, removal of stitches, abscess drainage and other appropriate in-practice procedures.'],
    modes: ['clinic'], image: photos.plaster },
  { slug: 'wellness-and-health-guidance', name: 'Wellness & health guidance', summary: 'Practical support for your overall health and wellbeing.',
    body: ['Sleep, stress, weight, nutrition and energy: honest guidance and small, doable changes.'],
    modes: ['clinic', 'screen'], image: photos.oliveJug },
  { slug: 'referrals', name: 'Referrals', summary: "When you need a specialist, we'll guide you to the right one.",
    body: ['If you need specialist care, we explain why, refer you to the right service and stay involved in your care.'],
    modes: ['clinic', 'screen'], image: photos.hands },
];

export const locations = [
  { id: 'esther-park', name: 'Esther Park', kind: 'clinic' as const, region: 'Kempton Park',
    address: ['95 Parkland Drive, Office 78', 'Esther Park, Kempton Park, 1619'],
    map: 'https://maps.google.com/?q=95+Parkland+Dr+Esther+Park+Kempton+Park',
    embed: 'https://maps.google.com/maps?q=95%20Parkland%20Dr%2C%20Esther%20Park%2C%20Kempton%20Park&z=15&output=embed',
    parking: 'On-site parking available. Confirm directions with reception.' },
  { id: 'fourways', name: 'Fourways', kind: 'clinic' as const, region: 'Fourways',
    address: ['22 Century Boulevard', 'Fourways, 1684'],
    map: 'https://maps.google.com/?q=22+Century+Boulevard+Fourways',
    embed: 'https://maps.google.com/maps?q=22%20Century%20Boulevard%2C%20Fourways&z=15&output=embed',
    parking: 'Visitor parking available. Confirm access with reception.' },
];

export const hours = [
  { label: 'In-person consultations', when: 'Monday – Friday', time: '09:00 – 16:00' },
  { label: 'House calls', when: 'Daily', time: '09:00 – 16:00' },
  { label: 'Virtual consultations', when: 'Every day', time: 'Available 24/7' },
];

// TODO(client): answers drafted from the brief; confirm medical aids, fees and walk-in policy.
export const faq: { q: string; a: string }[] = [
  { q: 'Do I need an appointment?', a: 'We recommend booking so that we can give you unhurried time. You can book online in under a minute, or call us or send a message.' },
  { q: 'Do you accept walk-ins?', a: 'Booked patients are seen first. If you are unwell and cannot find a time, call us or send a message and we will do our best to see you the same day.' },
  { q: 'What medical aids do you accept?', a: 'Please contact the practice to confirm your medical aid before your visit. You can also pay at the visit and claim back from your scheme.' },
  { q: 'How much is a consultation?', a: 'Fees depend on the type and length of consultation you choose. You will see the exact fee before you confirm your booking, and on our Fees page.' },
  { q: 'Do you offer house calls?', a: 'Yes. House calls are available daily from 09:00 to 16:00, subject to availability and service area.' },
  { q: 'Where do you provide house calls?', a: 'We visit homes around Kempton Park and Fourways. Enter your address when booking and we will confirm that it is within our service area.' },
  { q: 'Do you offer virtual consultations?', a: 'Yes, 24/7. Book a time, pay securely online, and you will receive a link to join the video consultation.' },
  { q: 'What minor surgical procedures do you perform?', a: 'Wound care and dressing, suturing and stitch removal, abscess drainage and other appropriate in-practice procedures. Ask us if you are unsure.' },
  { q: 'Do you treat children?', a: 'Yes. We care for the whole family, from babies to grandparents.' },
  { q: 'What should I bring to my appointment?', a: 'Your ID, medical aid card (if you have one), a list of your current medication and any recent results or letters.' },
  { q: 'How do I cancel an appointment?', a: 'Use the "Manage booking" link in your confirmation email, or call us or send a message.' },
  { q: 'How do I reschedule an appointment?', a: 'Open the "Manage booking" link in your confirmation email and pick a new time, or contact us and we will move it for you.' },
  { q: 'What payment methods do you accept?', a: 'Card, Instant EFT and Apple Pay online via Paystack, or cash, card and medical aid at your visit. Virtual consultations are paid online when you book.' },
];

// Membership (care plans), as supplied by Dr Nontu
export const membershipNote = 'Membership benefits are for non-urgent healthcare support and continuity of care.';
// queries = brief medical queries included per month
export const memberships: { id: 'silver' | 'gold'; name: string; label: string; priceCents: number; queries: number; benefits: string[] }[] = [
  { id: 'silver', name: 'Silver', label: 'Essential Care', priceCents: 14900, queries: 2, benefits: [
    'Up to 2 brief, non-urgent medical queries per month',
    '50% off one prescription service per month',
    'Monthly health & wellness newsletter',
  ] },
  { id: 'gold', name: 'Gold', label: 'Enhanced Care', priceCents: 39900, queries: 2, benefits: [
    'Up to 2 brief, non-urgent medical queries per month',
    '50% off one prescription service per month',
    'Priority access to available appointments',
    'One scheduled 5–10 minute telephonic consultation per month',
    'Monthly health & wellness newsletter',
  ] },
];

// What the contact form can be about. Members' brief medical queries are counted against their monthly allowance.
export const messageTopics = [
  { id: 'general', label: 'General enquiry' },
  { id: 'booking', label: 'About a booking' },
  { id: 'member', label: 'Member query (brief, non-urgent)' },
] as const;
export type MessageTopic = (typeof messageTopics)[number]['id'];

export const nav = [
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/house-calls', label: 'House calls' },
  { href: '/care-plans', label: 'Membership' },
  { href: '/fees', label: 'Fees' },
  { href: '/contact', label: 'Contact' },
];
