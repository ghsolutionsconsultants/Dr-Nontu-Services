import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Effects } from '@/components/site/Effects';
import { MobileBar } from '@/components/site/MobileBar';
import { Tracker } from '@/components/site/Tracker';
import { Intro } from '@/components/site/Intro';

// runs before first paint: returning visitors (this session) or reduced data never see the intro flash
const introGate = `try{if(sessionStorage.getItem('dn-intro'))document.documentElement.classList.add('intro-seen');else document.documentElement.classList.add('intro-running')}catch(e){document.documentElement.classList.add('intro-seen')}`;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: introGate }} />
      <Intro />
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
