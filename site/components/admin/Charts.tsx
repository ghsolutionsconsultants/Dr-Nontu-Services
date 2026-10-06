'use client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Palette from the logo: olive, gold, light olive, silver, gilded earth
export const PAL = ['#31310F', '#C69036', '#6A6528', '#AEB3B8', '#7A5A22', '#DDB46A'];
const R = (c: number) => 'R' + Math.round(c / 100).toLocaleString('en-ZA').replace(/,/g, ' ');
const axis = { fontSize: 12, fill: '#7A5A22' };
const tip = { contentStyle: { borderRadius: 8, border: '1px solid rgba(49,49,15,.14)', fontSize: 13, boxShadow: '0 12px 24px -16px rgba(49,49,15,.4)' } };
const monthLabel = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleString('en-ZA', { month: 'short', timeZone: 'UTC' });

export function RevenueChart({ data }: { data: { m: string; online: number; visit: number; refunded: number }[] }) {
  if (!data.length) return <p className="empty-s">Revenue will appear here once payments come in.</p>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(49,49,15,.08)" />
        <XAxis dataKey="m" tickFormatter={monthLabel} tick={axis} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={R} tick={axis} axisLine={false} tickLine={false} width={72} />
        <Tooltip {...tip} formatter={(v) => R(Number(v))} labelFormatter={(m) => monthLabel(String(m))} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="online" name="Paid online" stackId="a" fill={PAL[0]} radius={[0, 0, 0, 0]} />
        <Bar dataKey="visit" name="Paid at visit" stackId="a" fill={PAL[1]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, money = true }: { data: { k: string; s: number }[]; money?: boolean }) {
  if (!data.length) return <p className="empty-s">No data yet.</p>;
  const total = data.reduce((a, b) => a + b.s, 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 18, alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart><Pie data={data} dataKey="s" nameKey="k" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}
        </Pie><Tooltip {...tip} formatter={(v) => (money ? R(Number(v)) : v)} /></PieChart>
      </ResponsiveContainer>
      <div className="rank">{data.map((d, i) => (
        <div className="rank-row" key={d.k}><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><i style={{ width: 10, height: 10, borderRadius: 3, background: PAL[i % PAL.length] }} />{d.k.replace('_', ' ')}</span><b>{money ? R(d.s) : d.s} <small className="muted">{Math.round(d.s / total * 100)}%</small></b></div>
      ))}</div>
    </div>
  );
}

export function TrafficChart({ data }: { data: { day: string; views: number; visitors: number }[] }) {
  if (!data.length) return <p className="empty-s">Visits will appear here as people browse the site.</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PAL[1]} stopOpacity={.35} /><stop offset="1" stopColor={PAL[1]} stopOpacity={0} /></linearGradient>
          <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PAL[0]} stopOpacity={.25} /><stop offset="1" stopColor={PAL[0]} stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(49,49,15,.08)" />
        <XAxis dataKey="day" tickFormatter={(d) => d.slice(8) + '/' + d.slice(5, 7)} tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={36} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Area type="monotone" dataKey="views" name="Page views" stroke={PAL[1]} strokeWidth={2} fill="url(#gv)" />
        <Area type="monotone" dataKey="visitors" name="Visitors" stroke={PAL[0]} strokeWidth={2} fill="url(#gu)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
