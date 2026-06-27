'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';
import ReservationModal from './ReservationModal';
import ReservationDetail from './ReservationDetail';

export default function Calendar() {
    const { groups } = useAuth();
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

        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('*, groups(name, color), profiles(username)')
                .gte('date', formatDate(currentWeekStart))
                .lte('date', formatDate(weekEnd))
                .order('start_time');

            if (error) {
                setFetchError(error.message);
                console.error('Error fetching reservations:', error);
            } else {
                setFetchError(null);
                setReservations(data || []);
            }
        } catch (err) {
            console.error('Exception in fetchReservations:', err);
            setFetchError('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [currentWeekStart]);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    function getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
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
        return reservations.filter((r) => {
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
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    const weekLabel = (() => {
        const start = days[0];
        const end = days[6];
        if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} – ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
        }
        return `${start.getDate()} ${monthNames[start.getMonth()]} – ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    })();

    return (
        <div>
            {/* En-tête : transport */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-cream">Salle de répét</h1>
                    <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">{weekLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" onClick={() => navigateWeek(-1)} aria-label="Semaine précédente">
                        <ChevronLeft />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>Aujourd&apos;hui</Button>
                    <Button variant="outline" size="icon-sm" onClick={() => navigateWeek(1)} aria-label="Semaine suivante">
                        <ChevronRight />
                    </Button>
                    <Button size="sm" className="ml-1" onClick={() => { setSelectedSlot(null); setShowModal(true); }}>
                        <Plus />Réserver
                    </Button>
                </div>
            </div>

            {fetchError && (
                <div className="mb-4 rounded-md border border-vu/40 bg-vu/10 px-4 py-2 text-sm text-vu">
                    {fetchError}
                </div>
            )}

            {/* Arrangement multipiste */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
                    {/* Coin */}
                    <div className="border-b border-r border-border bg-panel" />
                    {days.map((day, i) => (
                        <div key={i} className={cn('border-b border-border px-1 py-2 text-center', isToday(day) && 'bg-signal/5')}>
                            <div className={cn('font-mono text-[10px] uppercase tracking-[0.12em]', isToday(day) ? 'text-signal' : 'text-muted-foreground')}>
                                {dayNames[i]}
                            </div>
                            <div className={cn('mt-0.5 flex items-center justify-center gap-1 font-display text-lg font-bold leading-none', isToday(day) ? 'text-signal' : 'text-cream')}>
                                {day.getDate()}
                                {isToday(day) && <span className="h-1.5 w-1.5 rounded-full bg-vu shadow-[0_0_6px_var(--vu)]" />}
                            </div>
                        </div>
                    ))}

                    {/* Lignes horaires */}
                    {hours.map((hour) => (
                        <Fragment key={hour}>
                            <div className="flex min-h-[60px] items-start justify-end border-b border-r border-border px-2 pt-1 font-mono text-[11px] text-muted-foreground">
                                {String(hour).padStart(2, '0')}:00
                            </div>
                            {days.map((day, dayIdx) => {
                                const cellReservations = getReservationsForCell(day, hour);
                                const past = isPast(day, hour);

                                return (
                                    <div
                                        key={`${dayIdx}-${hour}`}
                                        onClick={() => !past && handleCellClick(day, hour)}
                                        className={cn(
                                            'relative min-h-[60px] border-b border-r border-border p-0.5 transition-colors last:border-r-0',
                                            isToday(day) && 'bg-signal/[0.03]',
                                            past ? 'opacity-40' : 'cursor-pointer hover:bg-signal/[0.06]'
                                        )}
                                    >
                                        {isToday(day) && hour === new Date().getHours() && (
                                            <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: `${new Date().getMinutes()}px` }}>
                                                <div className="relative h-[2px] bg-vu shadow-[0_0_6px_rgba(232,67,31,0.7)]">
                                                    <span className="absolute -left-px -top-1 h-0 w-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-vu" />
                                                </div>
                                            </div>
                                        )}
                                        {cellReservations.map((r) => (
                                            isReservationStart(r, hour) && (
                                                <button
                                                    key={r.id}
                                                    onClick={(e) => handleReservationClick(e, r)}
                                                    className="absolute inset-x-0.5 z-10 flex flex-col overflow-hidden rounded-sm border-l-[3px] px-1.5 py-1 text-left transition-all hover:z-30 hover:brightness-110 hover:ring-1 hover:ring-cream/20"
                                                    style={{
                                                        top: `${parseInt(r.start_time.split(':')[1]) + 2}px`,
                                                        height: `${(r.duration / 60) * 60 - 4}px`,
                                                        borderLeftColor: r.groups?.color || '#FFAA2B',
                                                        backgroundColor: `color-mix(in srgb, ${r.groups?.color || '#FFAA2B'} 22%, #16130F)`,
                                                    }}
                                                >
                                                    <span className="truncate text-[11px] font-semibold leading-tight text-cream">{r.title}</span>
                                                    <span className="truncate text-[10px] leading-tight text-cream/60">{r.groups?.name}</span>
                                                    <span className="mt-auto font-mono text-[10px] text-cream/70">
                                                        {r.start_time.slice(0, 5)}–{getEndTime(r.start_time, r.duration)}
                                                    </span>
                                                </button>
                                            )
                                        ))}
                                    </div>
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
            </div>

            {/* Légende : pistes (groupes) */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Pistes</span>
                {groups.map((g) => (
                    <span key={g.id} className="flex items-center gap-2 text-xs text-cream">
                        <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: g.color }} />
                        {g.name}
                    </span>
                ))}
            </div>

            {/* Modales */}
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
