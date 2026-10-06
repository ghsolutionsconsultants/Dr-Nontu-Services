import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import { practice, locations } from '@/lib/content';
import './site.css';

const fraunces = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], axes: ['SOFT', 'WONK', 'opsz'], variable: '--font-fraunces', display: 'swap' });
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-hanken', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(practice.url),
  title: { default: 'Dr Nontu Medical Practice | GP in Esther Park & Fourways', template: '%s | Dr Nontu Medical Practice' },
  description: 'Warm, personal GP care in Kempton Park and Fourways: in person, at home, or online 24/7.',
  openGraph: { siteName: practice.name, locale: 'en_ZA', type: 'website' },
};
export const viewport: Viewport = { themeColor: '#FDFAF5' };

// schema.org: a medical clinic with two locations and its physician
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Physician', '@id': `${practice.url}/#doctor`, name: practice.doctor, medicalSpecialty: 'PrimaryCare', telephone: practice.phones[0], email: practice.email, url: practice.url },
    ...locations.map((l) => ({
      '@type': 'MedicalClinic', '@id': `${practice.url}/#${l.id}`, name: `${practice.name} · ${l.name}`, url: `${practice.url}/contact`,
      telephone: practice.phones[0], email: practice.email, medicalSpecialty: 'PrimaryCare', employee: { '@id': `${practice.url}/#doctor` },
      address: { '@type': 'PostalAddress', streetAddress: l.address[0], addressLocality: l.region, addressRegion: 'Gauteng', addressCountry: 'ZA' },
      openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '16:00' }],
    })),
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        {children}
      </body>
    </html>
  );
}
