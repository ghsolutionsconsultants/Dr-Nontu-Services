'use client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import type { EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';

const when = (d: Date | null) => d ? d.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '';

export function AdminCalendar() {
  const router = useRouter();
  const save = async (i: EventDropArg | EventResizeDoneArg) => {
    const { event } = i, minutes = event.end && event.start ? Math.round((event.end.getTime() - event.start.getTime()) / 60_000) : 0;
    const what = 'oldEvent' in i && +(i.oldEvent.start ?? 0) !== +(event.start ?? 0) ? `Move to ${when(event.start)}` : `Change length to ${minutes} minutes`;
    if (!confirm(`${event.title}\n${what}?\n\nThe patient is not emailed; use “Re-send confirmation” on the booking if they should know.`)) { i.revert(); return; }
    const r = await fetch(`/api/admin/bookings/${event.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: event.start, end: event.end }) });
    if (!r.ok) { i.revert(); alert((await r.json().catch(() => ({}))).error ?? 'That change could not be saved.'); }
  };
  return (
    <div className="fc card" style={{ padding: 18 }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, luxonPlugin]}
        initialView={typeof window !== 'undefined' && innerWidth < 760 ? 'timeGridDay' : 'timeGridWeek'}
        headerToolbar={{ left: 'title', right: 'today prev,next timeGridDay,timeGridWeek,dayGridMonth' }}
        titleFormat={{ day: 'numeric', month: 'short', year: 'numeric' }}
        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
        buttonText={{ today: 'Today', day: 'Day', week: 'Week', month: 'Month' }}
        timeZone="Africa/Johannesburg" locale="en-ZA" firstDay={1}
        slotMinTime="06:00:00" slotMaxTime="22:00:00" scrollTime="08:30:00" slotDuration="00:15:00" slotLabelInterval="01:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }} eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        nowIndicator allDaySlot={false} height="auto" expandRows
        businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '16:00' }}
        events="/api/admin/events"
        eventClick={(i) => { i.jsEvent.preventDefault(); if (i.event.url) router.push(i.event.url); }}
        // drag to move, stretch the bottom edge to change the length; nothing is saved without a yes
        editable eventDrop={save} eventResize={save} snapDuration="00:05:00"
        // click an empty time to book from there; drag across times to book exactly that stretch
        selectable selectMirror unselectAuto select={(i) => {
          const date = i.startStr.slice(0, 10), time = i.allDay ? '09:00' : i.startStr.slice(11, 16);
          const minutes = i.allDay ? 0 : Math.round((i.end.getTime() - i.start.getTime()) / 60_000);
          router.push(`/admin/bookings/new?date=${date}&time=${time}${minutes > 15 ? `&duration=${minutes}` : ''}`);
        }}
      />
    </div>
  );
}
