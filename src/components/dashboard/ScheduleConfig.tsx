import { useMemo, useState } from 'react';
import { Save, Check, Lock, Unlock, Plus, X } from 'lucide-react';
import { ArtistProfile } from '../../types';
import { DAY_NAMES_FULL, generateTimeSlots } from '../../data/mockData';

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
    const customSlots = artist.customSlots?.[String(day)];
    slots[String(day)] =
      customSlots ??
      (artist.availableDays.includes(day)
        ? generateTimeSlots(artist.workStart, artist.workEnd, artist.lunchStart, artist.lunchEnd, 60)
        : []);
  }

  return slots;
}

export default function ScheduleConfig({ artist, onUpdate }: ScheduleConfigProps) {
  const [form, setForm] = useState({
    customSlots: getInitialSlots(artist),
    blockedDates: artist.blockedDates,
  });
  const [slotDrafts, setSlotDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState('');

  const activeDays = useMemo(
    () =>
      Object.entries(form.customSlots)
        .filter(([, slots]) => slots.length > 0)
        .map(([day]) => Number(day))
        .sort(),
    [form.customSlots]
  );

  const totalSlots = useMemo(
    () => Object.values(form.customSlots).reduce((total, slots) => total + slots.length, 0),
    [form.customSlots]
  );

  const addSlot = (day: number) => {
    const dayKey = String(day);
    const nextSlot = slotDrafts[dayKey] || '10:00';
    const currentSlots = form.customSlots[dayKey] ?? [];
    if (currentSlots.includes(nextSlot)) return;

    setForm((f) => ({
      ...f,
      customSlots: {
        ...f.customSlots,
        [dayKey]: [...currentSlots, nextSlot].sort(),
      },
    }));
  };

  const removeSlot = (day: number, slot: string) => {
    const dayKey = String(day);
    setForm((f) => ({
      ...f,
      customSlots: {
        ...f.customSlots,
        [dayKey]: (f.customSlots[dayKey] ?? []).filter((item) => item !== slot),
      },
    }));
  };

  const clearDay = (day: number) => {
    const dayKey = String(day);
    setForm((f) => ({
      ...f,
      customSlots: {
        ...f.customSlots,
        [dayKey]: [],
      },
    }));
  };

  const addBlockedDate = () => {
    if (!newBlockedDate || form.blockedDates.includes(newBlockedDate)) return;
    setForm((f) => ({
      ...f,
      blockedDates: [...f.blockedDates, newBlockedDate].sort(),
    }));
    setNewBlockedDate('');
  };

  const removeBlockedDate = (date: string) => {
    setForm((f) => ({
      ...f,
      blockedDates: f.blockedDates.filter((d) => d !== date),
    }));
  };

  const handleSave = () => {
    onUpdate({
      ...artist,
      customSlots: form.customSlots,
      availableDays: activeDays,
      blockedDates: form.blockedDates,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Configurar Agenda</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Defina os horários exatos que seus clientes podem reservar
        </p>
      </div>

      {/* Custom slots */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h2 className="font-bold text-sm mb-2">Horários de agendamento</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Cadastre horários livres por dia. Ex: Segunda 10:00 e 15:00. O cliente verá apenas esses horários.
        </p>

        <div className="space-y-4">
          {DAY_NAMES_FULL.map((dayName, day) => {
            const dayKey = String(day);
            const slots = form.customSlots[dayKey] ?? [];

            return (
              <div
                key={dayName}
                className="bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-sm">{dayName}</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {slots.length > 0
                        ? `${slots.length} horário${slots.length > 1 ? 's' : ''} disponível${slots.length > 1 ? 'is' : ''}`
                        : 'Sem horários para agendamento'}
                    </p>
                  </div>
                  {slots.length > 0 && (
                    <button
                      onClick={() => clearDay(day)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                      aria-label={`Limpar horários de ${dayName}`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {slots.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => removeSlot(day, slot)}
                        className="flex items-center gap-1.5 bg-purple-600 border border-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
                      >
                        {slot}
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={slotDrafts[dayKey] || '10:00'}
                    onChange={(e) =>
                      setSlotDrafts((drafts) => ({ ...drafts, [dayKey]: e.target.value }))
                    }
                    className="app-select flex-1 bg-white/10 border border-white/10 rounded-xl py-2.5 pl-3 pr-11 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time} className="bg-zinc-800">
                        {time}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => addSlot(day)}
                    className="px-4 py-2.5 bg-purple-600 rounded-xl text-white text-sm font-medium hover:bg-purple-500 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked dates */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h2 className="font-bold text-sm mb-2">Datas bloqueadas</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Feriados, férias, eventos. Clientes não poderão agendar nesses dias.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={addBlockedDate}
            className="px-4 py-2.5 bg-purple-600 rounded-xl text-white text-sm font-medium hover:bg-purple-500 transition-colors flex items-center gap-1"
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
                className="flex items-center justify-between bg-red-950/30 border border-red-900/30 rounded-xl px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-red-400" />
                  <span className="text-sm text-red-300">
                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <button
                  onClick={() => removeBlockedDate(date)}
                  className="text-red-600 hover:text-red-400 transition-colors"
                >
                  <Unlock size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm text-center py-4">
            Nenhuma data bloqueada
          </p>
        )}
      </div>

      {/* Preview */}
      <div className="bg-purple-950/20 border border-purple-900/30 rounded-2xl p-4">
        <h3 className="font-semibold text-purple-300 text-sm mb-2">📋 Resumo da agenda</h3>
        <div className="space-y-1.5">
          <p className="text-zinc-400 text-xs">
            <span className="text-zinc-200 font-medium">Dias ativos: </span>
            {activeDays.length > 0
              ? activeDays.map((d) => DAY_NAMES_FULL[d]).join(', ')
              : 'Nenhum dia com horário cadastrado'}
          </p>
          <p className="text-zinc-400 text-xs">
            <span className="text-zinc-200 font-medium">Horários disponíveis: </span>
            {totalSlots} horário(s) por semana
          </p>
          <p className="text-zinc-400 text-xs">
            <span className="text-zinc-200 font-medium">Datas bloqueadas: </span>
            {form.blockedDates.length} data(s)
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl transition-all text-sm ${
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
    </div>
  );
}
