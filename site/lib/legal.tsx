import { practice } from './content';

// TODO(client): legal copy is a starting draft. Have it reviewed before launch.
export const legal: Record<'privacy' | 'popia' | 'terms', { title: string; body: React.ReactNode }> = {
  privacy: { title: 'Privacy Policy', body: (<>
    <p>{practice.name} (Practice No. {practice.practiceNo}) respects your privacy. This policy explains what personal information we collect through this website and how we use it.</p>
    <h2>What we collect</h2>
    <p>When you book: your name, email address, phone number, optional date of birth and medical aid details, the reason for your visit, and, for house calls, your address. We also record the details of your appointment and payment status.</p>
    <p>Our website analytics are first-party and cookie-free: we record which pages are visited, using a daily-rotating anonymous identifier. We do not store IP addresses.</p>
    <h2>How we use it</h2>
    <p>To arrange and manage your appointment, contact you about it, process payment, and meet our legal and clinical record-keeping duties. We never sell your information.</p>
    <h2>Who we share it with</h2>
    <p>Only service providers needed to run the booking system: our payment processor (Paystack), our email provider and our hosting providers, each bound to keep it confidential.</p>
    <h2>Your rights</h2>
    <p>You may ask to see, correct or delete your personal information, subject to medical record-keeping laws. Contact <a href={`mailto:${practice.email}`}>{practice.email}</a>.</p>
  </>) },
  popia: { title: 'POPIA notice', body: (<>
    <p>We process personal information in line with the Protection of Personal Information Act 4 of 2013 (POPIA).</p>
    <h2>Responsible party</h2><p>{practice.name}, {practice.email}, {practice.phones[0]}.</p>
    <h2>Purpose and lawful basis</h2><p>We process your information to provide healthcare services you request, with your consent given when you book, and to comply with health record obligations.</p>
    <h2>Special personal information</h2><p>Health information you share (such as the reason for your visit) is treated as special personal information and is only accessible to the practice.</p>
    <h2>Security</h2><p>Information is encrypted in transit, stored with access controls, and only accessible to authorised practice staff.</p>
    <h2>Complaints</h2><p>If you are unhappy with how we handle your information, contact us first. You may also contact the Information Regulator of South Africa.</p>
  </>) },
  terms: { title: 'Terms & Conditions', body: (<>
    <h2>Bookings</h2><p>A booking is confirmed when you receive a confirmation email. Online payments hold your slot for 15 minutes while you pay.</p>
    <h2>Cancellations and changes</h2><p>You can cancel or move a booking online up to 24 hours before it starts, using the link in your confirmation email. After that, please WhatsApp or call us. Refunds for cancelled prepaid bookings go back to the original payment method.</p>
    <h2>Virtual consultations</h2><p>Virtual consultations are paid when booked. Not every condition can be assessed remotely; Dr Nontu may recommend an in-person visit.</p>
    <h2>House calls</h2><p>House calls are subject to availability and service area. We will contact you if your address is outside our area.</p>
    <h2>Emergencies</h2><p>This website is not for emergencies. In an emergency, call 112 from a cellphone or 10177, or go to your nearest emergency unit.</p>
  </>) },
};
