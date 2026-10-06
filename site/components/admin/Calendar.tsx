'use client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import { useRouter } from 'next/navigation';

export function AdminCalendar() {
  const router = useRouter();
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
        dateClick={(i) => router.push(`/admin/bookings/new?date=${i.dateStr.slice(0, 10)}&time=${i.dateStr.slice(11, 16) || '09:00'}`)}
      />
    </div>
  );
}
