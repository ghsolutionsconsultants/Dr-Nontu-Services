import { PageHero, SecHead } from '@/components/site/Sections';
import { Icon } from '@/components/site/Icon';
import { img, photos, practice } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

export const generateMetadata = () => pageMeta('/about');

const VALUES = [
  { icon: 'ear', h: 'Personalised care', p: 'We take the time to understand you, not just your symptoms.' },
  { icon: 'shield', h: 'Professional expertise', p: 'Evidence-based medical care grounded in clinical knowledge and experience.' },
  { icon: 'cal', h: 'Convenient healthcare', p: 'In person, at home or online, with flexible ways to book and pay.' },
  { icon: 'leaf', h: 'A welcoming environment', p: 'Healthcare that feels comfortable, respectful and human.' },
];

export default function About() {
  return (
    <>
      <PageHero eyebrow="About the practice" title={<>Healthcare that feels <em>personal.</em></>} photo={photos.handsHold} photoAlt="Two hands resting together on a table" scene="mark"
        lede="Meet Dr Nontu: a warm, kind and compassionate doctor who believes that every patient matters." />

      <section className="section section--rule">
        <div className="wrap g12">
          <div className="c1-4">
            <div className="ph arch mask-in" data-tilt="8" style={{ aspectRatio: '3/4' }}>
              
              <img src={img(photos.stethTable, 800)} alt="A stethoscope resting on a desk" loading="lazy" data-par=".08" />
            </div>
          </div>
          <div className="c5-12 prose rv">
            <span className="eyebrow">{practice.doctor}</span>
            <p className="quote display" style={{ marginTop: 18 }}>Good healthcare starts with <em>listening.</em></p>
            <p>Because sometimes you don&rsquo;t just need a doctor to treat what&rsquo;s wrong. You need someone who listens. Someone who reassures you. Someone who makes you feel that you&rsquo;re going to be okay.</p>
            <p>At Dr Nontu Medical Practice we provide comprehensive primary healthcare with a focus on prevention, early intervention and personalised treatment, in a warm, welcoming environment where every patient is treated as an individual, with kindness, dignity and genuine care from the moment you walk through the door.</p>
            <p><b>{practice.credentials}</b><br />{practice.role}</p>
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="wrap">
          <SecHead eyebrow="Why Dr Nontu?" title={<>Four promises, <em>every visit.</em></>} />
          <div className="values">
            {VALUES.map((v, i) => (
              <div className="value rv" key={v.h} style={{ transitionDelay: `${i * .08}s` }}><Icon name={v.icon} /><h3>{v.h}</h3><p>{v.p}</p></div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
