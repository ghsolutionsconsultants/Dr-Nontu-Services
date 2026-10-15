import Link from 'next/link';
import { img, type services as S } from '@/lib/content';
import { Icon } from './Icon';

/** A plain, scannable list of services. */
export function ServicesIndex({ items }: { items: typeof S }) {
  return (
    <ul className="svc-list">
      {items.map((s) => (
        <li className="svc rv" key={s.slug}>
          <Link href={`/services/${s.slug}`}>
            <span className="svc-thumb ph round"><img src={img(s.image, 200)} alt="" loading="lazy" /></span>
            <h3>{s.name}</h3>
            <p>{s.summary}</p>
            <span className="modes">{s.modes.map((m) => <Icon key={m} name={m} />)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
