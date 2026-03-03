'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import ReservationModal from './ReservationModal';
import ReservationDetail from './ReservationDetail';

export default function Calendar() {
    const { user, profile, groups } = useAuth();
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
    const [reservations, setReservations] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const hours = [];
    for (let h = 8; h <= 22; h++) {
        hours.push(h);
    }

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);
        days.push(d);
    }

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const { data, error } = await supabase
            .from('reservations')
            .select('*, groups(name, color)')
            .gte('date', formatDate(currentWeekStart))
            .lte('date', formatDate(weekEnd))
            .order('start_time');

        if (error) {
            setFetchError(error.message);
        } else {
            setFetchError(null);
            setReservations(data || []);
        }
        setLoading(false);
    }, [currentWeekStart]);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    function getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
        // JavaScript getDay() returns 0 for Sunday. 
        // We want Monday (1) to be the start.
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function formatDate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function navigateWeek(direction) {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + direction * 7);
        setCurrentWeekStart(newStart);
    }

    function goToToday() {
        setCurrentWeekStart(getMonday(new Date()));
    }

    function handleCellClick(day, hour) {
        // Check if slot is in the past
        const now = new Date();
        const slotDate = new Date(day);
        slotDate.setHours(hour, 0, 0, 0);
        if (slotDate < now) return;

        setSelectedSlot({
            date: formatDate(day),
            startTime: `${String(hour).padStart(2, '0')}:00`,
            hour,
        });
        setShowModal(true);
    }

    function handleReservationClick(e, reservation) {
        e.stopPropagation();
        setShowDetail(reservation);
    }

    function getReservationsForCell(day, hour) {
        const dateStr = formatDate(day);
        return reservations.filter(r => {
            if (r.date !== dateStr) return false;
            const startHour = parseInt(r.start_time.split(':')[0]);
            const startMin = parseInt(r.start_time.split(':')[1]);
            const startInMinutes = startHour * 60 + startMin;
            const endInMinutes = startInMinutes + r.duration;
            const cellStart = hour * 60;
            const cellEnd = cellStart + 60;
            return startInMinutes < cellEnd && endInMinutes > cellStart;
        });
    }

    function isReservationStart(reservation, hour) {
        const startHour = parseInt(reservation.start_time.split(':')[0]);
        return startHour === hour;
    }

    function getReservationSpan(reservation) {
        return Math.ceil(reservation.duration / 60);
    }

    function isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    function isPast(day, hour) {
        const now = new Date();
        const slotDate = new Date(day);
        slotDate.setHours(hour, 0, 0, 0);
        return slotDate < now;
    }

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    const weekLabel = (() => {
        const start = days[0];
        const end = days[6];
        if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
        }
        return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    })();

    return (
        <div>
            <div className="calendar-header">
                <h2>📅 {weekLabel}</h2>
                <div className="calendar-nav">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigateWeek(-1)}>
                        ← Précédent
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={goToToday}>
                        Aujourd'hui
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigateWeek(1)}>
                        Suivant →
                    </button>
                    <button className="btn btn-primary btn-sm ml-md" onClick={() => { setSelectedSlot(null); setShowModal(true); }} style={{ marginLeft: '1rem' }}>
                        + Nouvelle réservation
                    </button>
                </div>
            </div>

            <div className="calendar-grid">
                {/* Header row */}
                <div className="calendar-time-header"></div>
                {days.map((day, i) => (
                    <div
                        key={i}
                        className={`calendar-day-header ${isToday(day) ? 'today' : ''}`}
                    >
                        <span className="calendar-day-name">{dayNames[i]}</span>
                        <span className="calendar-day-number">{day.getDate()}</span>
                    </div>
                ))}

                {/* Time rows */}
                {hours.map((hour) => (
                    <>
                        <div key={`time-${hour}`} className="calendar-time-label">
                            {String(hour).padStart(2, '0')}:00
                        </div>
                        {days.map((day, dayIdx) => {
                            const cellReservations = getReservationsForCell(day, hour);
                            const past = isPast(day, hour);

                            return (
                                <div
                                    key={`${dayIdx}-${hour}`}
                                    className={`calendar-cell ${isToday(day) ? 'today-column' : ''}`}
                                    onClick={() => !past && handleCellClick(day, hour)}
                                    style={{
                                        opacity: past ? 0.4 : 1,
                                        cursor: past ? 'default' : 'pointer',
                                    }}
                                >
                                    {cellReservations.map((r) => (
                                        isReservationStart(r, hour) && (
                                            <div
                                                key={r.id}
                                                className="reservation-block"
                                                style={{
                                                    backgroundColor: r.groups?.color || '#8B5CF6',
                                                    height: `${(r.duration / 60) * 60 - 4}px`,
                                                    position: 'absolute',
                                                    top: `${parseInt(r.start_time.split(':')[1]) + 2}px`,
                                                    left: '2px',
                                                    right: '2px',
                                                    zIndex: 2,
                                                }}
                                                onClick={(e) => handleReservationClick(e, r)}
                                            >
                                                <span className="reservation-block-title">{r.title}</span>
                                                <span className="reservation-block-group">{r.groups?.name}</span>
                                                <span className="reservation-block-time">
                                                    {r.start_time.slice(0, 5)} - {getEndTime(r.start_time, r.duration)}
                                                </span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            );
                        })}
                    </>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-md mt-lg" style={{ flexWrap: 'wrap' }}>
                {groups.map((g) => (
                    <div key={g.id} className="badge badge-group" style={{ backgroundColor: g.color }}>
                        {g.name}
                    </div>
                ))}
            </div>

            {/* Modals */}
            {showModal && (
                <ReservationModal
                    slot={selectedSlot}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedSlot(null);
                    }}
                    onCreated={() => {
                        setShowModal(false);
                        setSelectedSlot(null);
                        fetchReservations();
                    }}
                />
            )}

            {showDetail && (
                <ReservationDetail
                    reservation={showDetail}
                    onClose={() => setShowDetail(null)}
                    onDeleted={() => {
                        setShowDetail(null);
                        fetchReservations();
                    }}
                />
            )}
        </div>
    );
}

function getEndTime(startTime, duration) {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}
