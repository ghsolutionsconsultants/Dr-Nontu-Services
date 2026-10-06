import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Effects } from '@/components/site/Effects';
import { MobileBar } from '@/components/site/MobileBar';
import { Tracker } from '@/components/site/Tracker';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <MobileBar />
      <Effects />
      <Tracker />
    </>
  );
}
