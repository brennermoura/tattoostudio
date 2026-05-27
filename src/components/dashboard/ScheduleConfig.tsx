import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  Lock,
  Save,
  Unlock,
  X,
} from 'lucide-react';
import { ArtistProfile, Appointment } from '../../types';
import { DAY_NAMES_FULL } from '../../data/mockData';
import { updateAppointmentSchedule } from '../../services/artistService';
import { useModalHistory } from '../../hooks/useModalHistory';

interface ScheduleConfigProps {
  artist: ArtistProfile;
  onUpdate: (artist: ArtistProfile) => void;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

function getInitialSlots(artist: ArtistProfile) {
  const slots: Record<string, string[]> = {};

  for (let day = 0; day <= 6; day++) {
    slots[String(day)] = [...(artist.customSlots?.[String(day)] ?? [])].sort();
  }

  return slots;
}

function getInitialDateSlots(artist: ArtistProfile) {
  return Object.entries(artist.dateSlots ?? {}).reduce<Record<string, string[]>>((slots, [date, daySlots]) => {
    slots[date] = [...daySlots].sort();
    return slots;
  }, {});
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekDates(date: string) {
  const base = parseLocalDate(date);
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return localDateKey(next);
  });
}

function monthLabel(monthDate: Date) {
  return monthDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function getMonthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: Array<{ date: string; inMonth: boolean }> = [];

  for (let index = 0; index < first.getDay(); index++) {
    const day = new Date(year, month, 1 - (first.getDay() - index));
    cells.push({ date: localDateKey(day), inMonth: false });
  }

  for (let day = 1; day <= last.getDate(); day++) {
    cells.push({ date: localDateKey(new Date(year, month, day)), inMonth: true });
  }

  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: localDateKey(new Date(year, month + 1, trailingDay)), inMonth: false });
    trailingDay++;
  }

  return cells;
}

function formatLongDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function canEditAppointment(appointment: Appointment) {
  return new Date(`${appointment.date}T${appointment.time}:00`).getTime() > Date.now();
}

export default function ScheduleConfig({ artist, onUpdate }: ScheduleConfigProps) {
  const initialSlots = getInitialSlots(artist);
  const initialDateSlots = getInitialDateSlots(artist);

  const [form, setForm] = useState({
    customSlots: initialSlots,
    dateSlots: initialDateSlots,
    blockedDates: artist.blockedDates,
  });
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [blockedDatesModalOpen, setBlockedDatesModalOpen] = useState(false);
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(localDateKey());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = parseLocalDate(localDateKey());
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState('');

  useModalHistory(scheduleModalOpen, () => setScheduleModalOpen(false), 'schedule-availability');
  useModalHistory(blockedDatesModalOpen, () => setBlockedDatesModalOpen(false), 'schedule-blocked-dates');
  useModalHistory(Boolean(editingAppointment), () => setEditingAppointment(null), 'schedule-appointment');

  const activeDates = useMemo(
    () =>
      Object.entries(form.dateSlots)
        .filter(([, slots]) => slots.length > 0)
        .map(([date]) => date)
        .sort(),
    [form.dateSlots]
  );

  const totalSlots = useMemo(
    () => Object.values(form.dateSlots).reduce((total, slots) => total + slots.length, 0),
    [form.dateSlots]
  );

  const selectedSlots = form.dateSlots[selectedAppointmentDate] ?? [];
  const weekDates = useMemo(() => getWeekDates(selectedAppointmentDate), [selectedAppointmentDate]);
  const visibleMonthCells = useMemo(() => getMonthCells(calendarMonth), [calendarMonth]);
  const selectedDateAppointments = useMemo(
    () =>
      artist.appointments
        .filter((appointment) => appointment.date === selectedAppointmentDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [artist.appointments, selectedAppointmentDate]
  );

  const selectDate = (date: string) => {
    const parsedDate = parseLocalDate(date);
    setSelectedAppointmentDate(date);
    setCalendarMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
  };

  const changeCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const toggleSlot = (date: string, time: string) => {
    const slots = form.dateSlots[date] ?? [];
    const nextSlots = slots.includes(time)
      ? slots.filter((slot) => slot !== time)
      : [...slots, time].sort();

    setForm((current) => ({
      ...current,
      dateSlots: {
        ...current.dateSlots,
        [date]: nextSlots,
      },
    }));
  };

  const clearDate = (date: string) => {
    setForm((current) => ({
      ...current,
      dateSlots: {
        ...current.dateSlots,
        [date]: [],
      },
    }));
  };

  const addBlockedDate = () => {
    if (!newBlockedDate || form.blockedDates.includes(newBlockedDate)) return;
    setForm((current) => ({
      ...current,
      blockedDates: [...current.blockedDates, newBlockedDate].sort(),
    }));
    setNewBlockedDate('');
  };

  const removeBlockedDate = (date: string) => {
    setForm((current) => ({
      ...current,
      blockedDates: current.blockedDates.filter((item) => item !== date),
    }));
  };

  const discardAvailabilityDraft = () => {
    setForm({
      customSlots: getInitialSlots(artist),
      dateSlots: getInitialDateSlots(artist),
      blockedDates: [...artist.blockedDates],
    });
    setScheduleModalOpen(false);
  };

  const handleSave = () => {
    onUpdate({
      ...artist,
      customSlots: {},
      dateSlots: Object.fromEntries(Object.entries(form.dateSlots).filter(([, slots]) => slots.length > 0)),
      availableDays: [],
      blockedDates: form.blockedDates,
    });
    setScheduleModalOpen(false);
    setBlockedDatesModalOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openAppointmentModal = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditDate(appointment.date);
    setEditTime(appointment.time);
  };

  const saveAppointmentSchedule = async () => {
    if (!editingAppointment || !editDate || !editTime || !canEditAppointment(editingAppointment)) return;

    setSavingAppointment(true);
    try {
      await updateAppointmentSchedule(artist.id, editingAppointment.id, editDate, editTime);
      onUpdate({
        ...artist,
        appointments: artist.appointments.map((appointment) =>
          appointment.id === editingAppointment.id
            ? { ...appointment, date: editDate, time: editTime }
            : appointment
        ),
      });
      selectDate(editDate);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Erro ao editar agendamento:', error);
      alert(error instanceof Error ? error.message : 'Nao foi possivel editar o agendamento.');
    } finally {
      setSavingAppointment(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Configurar Agenda</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Defina a disponibilidade que aparece para o cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setScheduleModalOpen(true)}
          className="hidden items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-purple-500 sm:inline-flex"
        >
          <CalendarDays size={18} />
          Editar dias e horários
        </button>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.035] p-2 sm:hidden">
        <p className="px-2 pb-2 pt-1 text-[10px] font-black uppercase text-zinc-500">
          Configurações da agenda
        </p>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.07]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-200">
              <Clock size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">Disponibilidade</span>
              <span className="block truncate text-xs text-zinc-500">
                Configure vários dias e salve tudo junto
              </span>
            </span>
            <ChevronRight size={16} className="text-zinc-600" />
          </button>

          {activeDates.length > 0 && (
            <div className="pb-1 pt-3">
              <p className="px-2 pb-2 text-[10px] font-black uppercase text-zinc-500">
                Dias disponíveis
              </p>
              <div className="space-y-1.5">
                {activeDates.map((date) => {
                  const slots = form.dateSlots[date] ?? [];

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        selectDate(date);
                        setScheduleModalOpen(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.07]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-200">
                        <CalendarDays size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold capitalize text-white">
                          {formatLongDate(date)}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {slots.length} {slots.length === 1 ? 'horário disponível' : 'horários disponíveis'}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-zinc-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setBlockedDatesModalOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.07]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-200">
              <Lock size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">Datas bloqueadas</span>
              <span className="block truncate text-xs text-zinc-500">
                {form.blockedDates.length > 0
                  ? `${form.blockedDates.length} bloqueio${form.blockedDates.length > 1 ? 's' : ''} configurado${form.blockedDates.length > 1 ? 's' : ''}`
                  : 'Feriados, férias e indisponibilidades'}
              </span>
            </span>
            <ChevronRight size={16} className="text-zinc-600" />
          </button>
        </div>
      </section>

      <section className="hidden rounded-2xl border border-white/10 bg-white/5 p-5 sm:block">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-bold text-sm">Semana</h2>
          <label className="block sm:w-auto">
            <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Data de referência</span>
            <input
              type="date"
              value={selectedAppointmentDate}
              onChange={(event) => selectDate(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-purple-500 sm:w-auto"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          {DAY_NAMES_FULL.map((dayName, day) => {
            const date = weekDates[day];
            const slots = form.dateSlots[date] ?? [];
            const appointmentsForDate = artist.appointments
              .filter((appointment) => appointment.date === date)
              .sort((a, b) => a.time.localeCompare(b.time));

            return (
              <div
                key={dayName}
                className={`grid gap-3 border-b border-white/10 p-3 last:border-b-0 sm:grid-cols-[130px_minmax(0,1fr)] ${
                  selectedAppointmentDate === date ? 'bg-purple-500/10' : 'bg-black/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectDate(date)}
                  className="text-left"
                >
                  <p className="text-sm font-black text-white">{dayName}</p>
                  <p className="text-xs font-bold text-zinc-300">{formatShortDate(date)}</p>
                  <p className={slots.length > 0 ? 'text-xs text-green-300' : 'text-xs text-zinc-500'}>
                    {slots.length > 0 ? `${slots.length} horário${slots.length > 1 ? 's' : ''}` : 'Fechado'}
                  </p>
                </button>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        selectDate(date);
                        setScheduleModalOpen(true);
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-purple-500/35 bg-purple-500/10 px-2.5 text-xs font-bold text-purple-100 transition-colors hover:bg-purple-500/20"
                    >
                      <Edit3 size={13} />
                      Editar
                    </button>
                    {slots.length > 0 ? (
                      slots.map((slot) => (
                        <span
                          key={slot}
                          className="inline-flex h-8 items-center rounded-lg border border-green-500/25 bg-green-500/10 px-2.5 text-xs font-bold text-green-100"
                        >
                          {slot}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs font-bold text-zinc-500">
                        Sem horários
                      </span>
                    )}
                  </div>

                  {appointmentsForDate.length > 0 && (
                    <div className="space-y-2">
                      {appointmentsForDate.map((appointment) => {
                        const editable = canEditAppointment(appointment);

                        return (
                          <div
                            key={appointment.id}
                            className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-2 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
                          >
                            <div>
                              <p className="text-sm font-black text-white">{appointment.time}</p>
                              <p className="text-[11px] text-zinc-500 capitalize">{appointment.status}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-zinc-100">{appointment.clientName}</p>
                              <p className="truncate text-xs text-zinc-500">{appointment.clientPhone}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openAppointmentModal(appointment)}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                                editable
                                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20'
                                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07]'
                              }`}
                            >
                              {editable ? <Edit3 size={14} /> : <Eye size={14} />}
                              {editable ? 'Editar' : 'Visualizar'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="hidden bg-white/5 border border-white/10 rounded-2xl p-5 sm:block">
        <h2 className="font-bold text-sm mb-2">Datas bloqueadas</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Feriados, férias e eventos. Clientes não poderão agendar nesses dias.
        </p>

        <div className="flex flex-col gap-2 mb-4 sm:flex-row">
          <input
            type="date"
            value={newBlockedDate}
            onChange={(event) => setNewBlockedDate(event.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="button"
            onClick={addBlockedDate}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500"
          >
            <Lock size={14} />
            Bloquear
          </button>
        </div>

        {form.blockedDates.length > 0 ? (
          <div className="space-y-2">
            {form.blockedDates.map((date) => (
              <div
                key={date}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-zinc-400" />
                  <span className="text-sm text-zinc-300 capitalize">{formatLongDate(date)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeBlockedDate(date)}
                  className="text-zinc-500 hover:text-red-300 transition-colors"
                  aria-label="Remover data bloqueada"
                >
                  <Unlock size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm text-center py-4">Nenhuma data bloqueada</p>
        )}
      </section>

      <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:block">
        <h3 className="font-semibold text-zinc-200 text-sm mb-2">Status da agenda</h3>
        <div className="space-y-1.5">
          <p className="text-zinc-400 text-xs">
            <span className="text-zinc-200 font-medium">Dias ativos: </span>
            {activeDates.length > 0
              ? `${activeDates.length} data(s) com horário cadastrado`
              : 'Nenhuma data com horário cadastrado'}
          </p>
          <p className="text-zinc-400 text-xs">
            <span className="text-zinc-200 font-medium">Horários disponíveis: </span>
            {totalSlots} horário(s) cadastrados
          </p>
          <p className="text-zinc-400 text-xs">
            <span className="text-zinc-200 font-medium">Datas bloqueadas: </span>
            {form.blockedDates.length} data(s)
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className={`hidden w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all sm:flex ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
        }`}
      >
        {saved ? (
          <>
            <Check size={18} /> Salvo!
          </>
        ) : (
          <>
            <Save size={18} /> Salvar agenda
          </>
        )}
      </button>

      {blockedDatesModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#110f17] sm:hidden">
          <div className="flex h-full flex-col">
            <header className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
              <button
                type="button"
                onClick={() => setBlockedDatesModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300"
                aria-label="Voltar para agenda"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 className="text-lg font-black text-white">Datas bloqueadas</h2>
                <p className="text-xs text-zinc-500">Dias indisponíveis para reservas.</p>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <label className="mb-2 block text-[11px] font-bold uppercase text-zinc-500">
                  Nova data bloqueada
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newBlockedDate}
                    onChange={(event) => setNewBlockedDate(event.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={addBlockedDate}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/15 px-3 text-sm font-bold text-purple-100"
                  >
                    <Lock size={14} />
                    Bloquear
                  </button>
                </div>
              </div>

              {form.blockedDates.length > 0 ? (
                <div className="space-y-2">
                  {form.blockedDates.map((date) => (
                    <div
                      key={date}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Lock size={15} className="shrink-0 text-purple-200" />
                        <span className="truncate text-sm font-medium capitalize text-zinc-200">
                          {formatLongDate(date)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlockedDate(date)}
                        className="ml-2 rounded-lg border border-white/10 p-2 text-zinc-400"
                        aria-label="Remover data bloqueada"
                      >
                        <Unlock size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">
                  Nenhuma data bloqueada.
                </p>
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              <button
                type="button"
                onClick={handleSave}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-3.5 text-sm font-bold text-white"
              >
                <Save size={16} />
                Salvar datas bloqueadas
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 sm:p-4">
          <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-zinc-950 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl sm:border sm:border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <h2 className="text-lg font-black">Editar disponibilidade</h2>
                <p className="text-xs text-zinc-500">
                  Selecione quantas datas precisar e salve uma vez ao final.
                </p>
              </div>
              <button
                type="button"
                onClick={discardAvailabilityDraft}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid min-h-0 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(-1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <h3 className="text-base font-black capitalize text-white">{monthLabel(calendarMonth)}</h3>

                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Proximo mes"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-zinc-500">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((dayLabel) => (
                    <span key={dayLabel}>{dayLabel}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {visibleMonthCells.map((cell) => {
                    const date = parseLocalDate(cell.date);
                    const slots = form.dateSlots[cell.date] ?? [];
                    const selected = selectedAppointmentDate === cell.date;

                    return (
                      <button
                        key={cell.date}
                        type="button"
                        onClick={() => selectDate(cell.date)}
                        className={`relative flex h-10 items-center justify-center rounded-lg border text-center transition-colors ${
                          selected
                            ? 'border-purple-400 bg-purple-500/20'
                            : slots.length > 0
                            ? 'border-green-500/25 bg-green-500/10 hover:bg-green-500/15'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        } ${cell.inMonth ? 'opacity-100' : 'opacity-35'}`}
                      >
                        <span className="block text-sm font-black text-white">{date.getDate()}</span>
                        {slots.length > 0 && (
                          <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-green-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-400">
                  Rascunho: {activeDates.length} data{activeDates.length === 1 ? '' : 's'} com {totalSlots}{' '}
                  horário{totalSlots === 1 ? '' : 's'}
                </p>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black">{formatShortDate(selectedAppointmentDate)}</h3>
                    <p className="text-xs text-zinc-500 capitalize">
                      {formatLongDate(selectedAppointmentDate)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {selectedSlots.length > 0
                        ? `${selectedSlots.length} horários`
                        : 'Fechado'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => clearDate(selectedAppointmentDate)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-200"
                    >
                      Limpar dia
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8">
                  {TIME_OPTIONS.map((time) => {
                    const selected = selectedSlots.includes(time);

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => toggleSlot(selectedAppointmentDate, time)}
                        aria-pressed={selected}
                        className={`h-9 rounded-lg border text-xs font-black transition-all ${
                          selected
                            ? 'border-green-400/50 bg-green-500/20 text-green-100 shadow-[0_0_0_1px_rgba(74,222,128,0.12)]'
                            : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.07] hover:text-white'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>

                {selectedDateAppointments.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                      Agendamentos da data
                    </h4>
                    <div className="space-y-2">
                      {selectedDateAppointments.map((appointment) => {
                        const editable = canEditAppointment(appointment);

                        return (
                          <div
                            key={appointment.id}
                            className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center"
                          >
                            <span className="text-sm font-black text-white">{appointment.time}</span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-zinc-100">{appointment.clientName}</p>
                              <p className="truncate text-xs text-zinc-500">{appointment.clientPhone}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openAppointmentModal(appointment)}
                              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
                                editable
                                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20'
                                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07]'
                              }`}
                            >
                              {editable ? <Edit3 size={13} /> : <Eye size={13} />}
                              {editable ? 'Editar' : 'Ver'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={discardAvailabilityDraft}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-green-500"
              >
                <Save size={16} />
                Salvar agenda inteira
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">
                  {canEditAppointment(editingAppointment) ? 'Editar agendamento' : 'Visualizar agendamento'}
                </h3>
                <p className="text-xs text-zinc-500 capitalize">
                  {formatLongDate(editingAppointment.date)} as {editingAppointment.time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm font-bold text-zinc-100">{editingAppointment.clientName}</p>
              <p className="text-xs text-zinc-500">{editingAppointment.clientPhone}</p>
              <p className="mt-2 text-sm text-zinc-300">{editingAppointment.description}</p>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Data</span>
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  disabled={!canEditAppointment(editingAppointment)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500 disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Hora</span>
                <select
                  value={editTime}
                  onChange={(event) => setEditTime(event.target.value)}
                  disabled={!canEditAppointment(editingAppointment)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500 disabled:opacity-60"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10"
              >
                Fechar
              </button>
              {canEditAppointment(editingAppointment) && (
                <button
                  type="button"
                  onClick={saveAppointmentSchedule}
                  disabled={savingAppointment}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {savingAppointment ? 'Salvando...' : 'Salvar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
