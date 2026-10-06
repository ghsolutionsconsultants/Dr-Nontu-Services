import Link from 'next/link';
import { q } from '@/lib/db';
import { saveSeo } from '../../actions';
import { Flash, Head } from '@/components/admin/ui';
import { practice, services } from '@/lib/content';

export const metadata = { title: 'SEO' };
type Row = { path: string; title: string; description: string; og_image: string | null; keyword: string | null };

const checks = (r: Row) => {
  const kw = (r.keyword ?? '').toLowerCase();
  return [
    { ok: r.title.length >= 30 && r.title.length <= 60, label: `Title is ${r.title.length} characters (aim for 30–60)` },
    { ok: r.description.length >= 70 && r.description.length <= 160, label: `Description is ${r.description.length} characters (aim for 70–160)` },
    { ok: !!kw && r.title.toLowerCase().includes(kw), label: kw ? `Focus phrase “${r.keyword}” ${r.title.toLowerCase().includes(kw) ? 'is' : 'is not'} in the title` : 'Set a focus phrase (what people type into Google)' },
    { ok: !!kw && r.description.toLowerCase().includes(kw), label: kw ? `Focus phrase ${r.description.toLowerCase().includes(kw) ? 'is' : 'is not'} in the description` : 'Use the focus phrase in the description' },
  ];
};
const score = (r: Row) => checks(r).filter((c) => c.ok).length;

export default async function Seo(props: PageProps<'/admin/seo'>) {
  const sp = await props.searchParams;
  const rows = await q<Row>(`select * from seo_pages order by path`);
  // service pages can be tuned too: add a row the first time they are edited
  const all: Row[] = [...rows, ...services.filter((s) => !rows.some((r) => r.path === `/services/${s.slug}`)).map((s) => ({ path: `/services/${s.slug}`, title: `${s.name} | Dr Nontu Medical Practice`, description: s.summary, og_image: null, keyword: null }))];
  const sel = all.find((r) => r.path === sp.page) ?? all[0];
  const avg = Math.round(all.reduce((a, r) => a + score(r), 0) / all.length / 4 * 100);
  return (
    <>
      <Head eyebrow="SEO" title="How the site appears in search"><a className="b b--ghost" href="/sitemap.xml" target="_blank">Sitemap ↗</a></Head>
      <Flash sp={sp} />
      <div className="grid grid-4">
        <div className="card kpi"><small>SEO health</small><b>{avg}%</b><span>of page checks passing</span></div>
        <div className="card kpi"><small>Pages</small><b>{all.length}</b><span>in the sitemap</span></div>
        <div className="card kpi"><small>Structured data</small><b>3</b><span>schema types: clinic, doctor, FAQ</span></div>
        <div className="card kpi"><small>Locations</small><b>2</b><span>marked up for Google Maps</span></div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>Pages</h2>
          <table className="tbl"><tbody>{all.map((r) => (
            <tr key={r.path} style={r.path === sel.path ? { background: 'var(--linen)' } : undefined}>
              <td><Link href={`/admin/seo?page=${encodeURIComponent(r.path)}`}>{r.path}</Link><br /><small className="muted">{r.title}</small></td>
              <td className="num"><span className={`badge-s ${score(r) === 4 ? 's-paid' : score(r) >= 2 ? 's-pending_payment' : 's-cancelled'}`}>{score(r)}/4</span></td>
            </tr>
          ))}</tbody></table>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <h2>Editing {sel.path}</h2>
            <div className="serp" style={{ marginBottom: 18 }}>
              <div className="u">{practice.url.replace(/^https?:\/\//, '')}{sel.path === '/' ? '' : sel.path.replace(/\//g, ' › ')}</div>
              <div className="t">{sel.title.slice(0, 62)}{sel.title.length > 62 ? '…' : ''}</div>
              <div className="d">{sel.description.slice(0, 160)}{sel.description.length > 160 ? '…' : ''}</div>
            </div>
            <form action={saveSeo.bind(null, sel.path)} className="frm" key={sel.path}>
              <label>Title <small>shown as the blue link in Google</small><input className="inp" name="title" defaultValue={sel.title} maxLength={90} required /></label>
              <label>Description <small>the grey text under the link</small><textarea className="ta" name="description" defaultValue={sel.description} maxLength={300} required /></label>
              <label>Focus phrase <small>e.g. “GP Kempton Park”</small><input className="inp" name="keyword" defaultValue={sel.keyword ?? ''} /></label>
              <label>Share image URL <small>optional, 1200×630</small><input className="inp" name="og_image" defaultValue={sel.og_image ?? ''} placeholder="https://…" /></label>
              <div><button className="b">Save</button></div>
            </form>
          </div>
          <div className="card"><h2>Checks for this page</h2><ul className="chk">{checks(sel).map((c) => <li key={c.label} className={c.ok ? '' : 'no'}>{c.label}</li>)}</ul></div>
          <div className="card">
            <h2>Site-wide</h2>
            <ul className="chk">
              <li>Sitemap published at /sitemap.xml</li>
              <li>robots.txt keeps admin, payment and booking-management pages out of search</li>
              <li>MedicalClinic + Physician structured data on every page; FAQPage on /faq</li>
              <li>Mobile-first, fast pages with descriptive alt text on photographs</li>
              <li className="no">Connect Google Search Console and submit the sitemap after launch</li>
              <li className="no">Create or claim the Google Business Profile for both locations</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
