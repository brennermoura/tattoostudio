import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  CheckCircle,
  Copy,
  Upload,
} from 'lucide-react';
import { ArtistProfile, Appointment } from '../types';
import { generateTimeSlots, DAY_NAMES } from '../data/mockData';
import QRCode from 'qrcode';
import { buildStaticPixPayload } from '../utils/pix';

interface BookingFlowProps {
  artist: ArtistProfile;
  onBack: () => void;
  onComplete: (
    appointment: Appointment,
    proofFile?: File
  ) => Promise<Appointment | null> | Appointment | null;
}

type Step = 'date' | 'time' | 'info' | 'pix' | 'success';

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function BookingFlow({ artist, onBack, onComplete }: BookingFlowProps) {
  const [step, setStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    description: '',
  });
  const [pixProof, setPixProof] = useState<string>('');
  const [pixProofFile, setPixProofFile] = useState<File | undefined>();
  const [useExistingDeposit, setUseExistingDeposit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const isDateAvailable = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
    const dayOfWeek = date.getDay();
    const daySlots =
      artist.customSlots?.[String(dayOfWeek)] ??
      (artist.availableDays.includes(dayOfWeek)
        ? generateTimeSlots(artist.workStart, artist.workEnd, artist.lunchStart, artist.lunchEnd, 60)
        : []);
    if (daySlots.length === 0) return false;
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (artist.blockedDates.includes(dateStr)) return false;
    return true;
  };

  const handleDateSelect = (day: number) => {
    if (!isDateAvailable(day)) return;
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setStep('time');
  };

  const selectedWeekday = selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() : null;
  const timeSlots =
    selectedWeekday === null
      ? []
      : artist.customSlots?.[String(selectedWeekday)] ??
        (artist.availableDays.includes(selectedWeekday)
          ? generateTimeSlots(
              artist.workStart,
              artist.workEnd,
              artist.lunchStart,
              artist.lunchEnd,
              60
            )
          : []);

  const bookedSlots = artist.appointments
    .filter((a) => a.date === selectedDate && a.status === 'approved')
    .map((a) => a.time);

  const pixPayload = buildStaticPixPayload({
    pixKey: artist.pixKey,
    merchantName: artist.artisticName,
    merchantCity: artist.city,
    amount: artist.depositValue,
    txid: `SINAL${selectedDate.replace(/-/g, '')}${selectedTime.replace(':', '')}`,
    description: 'Sinal de agendamento',
  });

  useEffect(() => {
    if (step === 'pix' && canvasRef.current && pixPayload) {
      QRCode.toCanvas(canvasRef.current, pixPayload, {
        width: 180,
        margin: 2,
        color: { dark: '#ffffff', light: '#1a1a1a' },
      }).catch(console.error);
    }
  }, [step, pixPayload]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const appt: Appointment = {
        id: `appt_${Date.now()}`,
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail,
        date: selectedDate,
        time: selectedTime,
        description: form.description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        depositPaid: artist.depositRequired !== false,
        depositRequired: artist.depositRequired !== false,
        depositCreditUsed: useExistingDeposit,
        pixProof: useExistingDeposit || artist.depositRequired === false ? undefined : pixProof,
      };

      const savedAppointment = await onComplete(appt, pixProofFile);
      if (!savedAppointment) {
        setSubmitError('Não foi possível enviar a solicitação. Confira os dados e tente novamente.');
        return;
      }

      setStep('success');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar a solicitação. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const calDays = getCalendarDays(calYear, calMonth);

  const stepInfo = {
    date: { title: 'Escolha a data', subtitle: 'Selecione um dia disponível', num: 1 },
    time: { title: 'Escolha o horário', subtitle: `${selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : ''}`, num: 2 },
    info: { title: 'Seus dados', subtitle: 'Para finalizar o agendamento', num: 3 },
    pix: {
      title: artist.depositRequired === false ? 'Confirmar solicitação' : 'Pagar sinal',
      subtitle:
        artist.depositRequired === false
          ? 'Sem sinal obrigatório'
          : `R$ ${artist.depositValue},00 via Pix`,
      num: 4,
    },
    success: { title: 'Pronto!', subtitle: 'Aguarde a confirmação', num: 5 },
  };

  const currentInfo = stepInfo[step];
  const accent = artist.accentColor;

  const handlePixProofUpload = (file: File | undefined) => {
    if (!file) return;
    setPixProofFile(file);
    setPixProof(file.name);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {step !== 'success' && (
            <button
              onClick={step === 'date' ? onBack : () => {
                const steps: Step[] = ['date', 'time', 'info', 'pix'];
                const idx = steps.indexOf(step);
                if (idx > 0) setStep(steps[idx - 1]);
                else onBack();
              }}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{currentInfo.title}</p>
            <p className="text-zinc-500 text-xs truncate capitalize">{currentInfo.subtitle}</p>
          </div>
          {step !== 'success' && (
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {currentInfo.num}/4
            </span>
          )}
        </div>

        {/* Progress bar */}
        {step !== 'success' && (
          <div className="max-w-lg mx-auto mt-3">
            <div className="h-1 bg-white/10 rounded-full">
              <div
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: `${(currentInfo.num / 4) * 100}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step: Date */}
        {step === 'date' && (
          <div className="space-y-4">
            {/* Calendar nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                  else setCalMonth(m => m - 1);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold">
                {MONTHS[calMonth]} {calYear}
              </span>
              <button
                onClick={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                  else setCalMonth(m => m + 1);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs text-zinc-600 font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const available = isDateAvailable(day);
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const isPast = new Date(calYear, calMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <button
                    key={day}
                    onClick={() => handleDateSelect(day)}
                    disabled={!available}
                    className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'text-white font-bold scale-105'
                        : available
                        ? 'bg-white/5 text-zinc-200 hover:bg-white/10'
                        : isPast
                        ? 'text-zinc-800 cursor-not-allowed'
                        : 'text-zinc-700 cursor-not-allowed bg-white/2'
                    }`}
                    style={isSelected ? { backgroundColor: accent } : {}}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-white/10" />
                <span className="text-xs text-zinc-500">Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: accent }} />
                <span className="text-xs text-zinc-500">Selecionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-zinc-800" />
                <span className="text-xs text-zinc-500">Indisponível</span>
              </div>
            </div>
          </div>
        )}

        {/* Step: Time */}
        {step === 'time' && (
          <div className="space-y-3">
            <p className="text-zinc-500 text-sm mb-4">
              Selecione um horário disponível para a sua sessão
            </p>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => {
                const isBooked = bookedSlots.includes(time);
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => {
                      if (isBooked) return;
                      setSelectedTime(time);
                      setStep('info');
                    }}
                    disabled={isBooked}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all ${
                      isSelected
                        ? 'text-white border-transparent'
                        : isBooked
                        ? 'bg-white/2 border-white/5 text-zinc-700 cursor-not-allowed'
                        : 'bg-white/5 border-white/10 text-zinc-200 hover:border-purple-500/40 hover:bg-white/10'
                    }`}
                    style={isSelected ? { backgroundColor: accent, borderColor: accent } : {}}
                  >
                    <Clock size={14} />
                    {time}
                    {isBooked && <span className="text-xs text-zinc-700">—</span>}
                  </button>
                );
              })}
            </div>
            {timeSlots.length === 0 && (
              <div className="text-center py-10 text-zinc-600">
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p>Nenhum horário disponível</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Info */}
        {step === 'info' && (
          <div className="space-y-4">
            {submitError && (
              <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-4">
                <p className="text-red-300 text-sm font-semibold">Não foi possível agendar</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{submitError}</p>
              </div>
            )}

            {/* Summary */}
            <div
              className="rounded-2xl p-4 mb-2"
              style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}
            >
              <div className="flex items-center gap-3">
                <Calendar size={18} style={{ color: accent }} />
                <div>
                  <p className="font-bold text-sm">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}
                  </p>
                  <p className="text-zinc-400 text-xs">às {selectedTime}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                Seu nome completo
              </label>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="João da Silva"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-1.5">WhatsApp</label>
              <input
                type="tel"
                value={form.clientPhone}
                onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                placeholder="(11) 99999-9999"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={form.clientEmail}
                onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                placeholder="seu@email.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                Descreva sua tattoo
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Descreva o tamanho, estilo, local do corpo e referências da sua tattoo..."
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
              />
            </div>

            <button
              onClick={() => {
                if (!form.clientName || !form.clientPhone || !form.clientEmail || !form.description) {
                  alert('Por favor, preencha todos os campos.');
                  return;
                }
                if (artist.depositRequired === false) {
                  handleSubmit();
                  return;
                }
                setStep('pix');
              }}
              className="w-full font-bold py-4 rounded-xl text-white transition-all hover:opacity-90 text-sm"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
            >
              {artist.depositRequired === false ? 'Enviar solicitação' : 'Continuar para pagamento'}
            </button>
          </div>
        )}

        {/* Step: Pix */}
        {step === 'pix' && (
          <div className="space-y-5">
            {submitError && (
              <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-4">
                <p className="text-red-300 text-sm font-semibold">Não foi possível agendar</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{submitError}</p>
              </div>
            )}

            {useExistingDeposit && (
              <div className="bg-green-950/30 border border-green-900/30 rounded-2xl p-4">
                <p className="text-green-300 text-sm font-semibold mb-1">
                  Sinal anterior como crédito
                </p>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Use esta opção quando o tatuador recusou um horário anterior e combinou o
                  reaproveitamento do sinal para uma nova data.
                </p>
              </div>
            )}

            <div className="bg-yellow-950/30 border border-yellow-900/30 rounded-2xl p-4">
              <p className="text-yellow-300 text-sm font-semibold mb-1">⚠️ Atenção</p>
              <p className="text-zinc-400 text-xs leading-relaxed">
                O sinal <strong className="text-zinc-200">não é reembolsável</strong> em caso de
                cancelamento sem aviso prévio de 48h. Após o pagamento, anexe o comprovante e
                aguarde a conferência do tatuador.
              </p>
            </div>

            {/* QR Code */}
            {!useExistingDeposit && (
              <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-zinc-400 mb-4">
                Pague R$ <span className="text-white font-bold">{artist.depositValue},00</span> de
                sinal via Pix
              </p>
              <div className="bg-[#1a1a1a] rounded-2xl p-3 mb-4">
                <canvas ref={canvasRef} className="rounded-xl" />
              </div>
              <p className="text-xs text-zinc-500 mb-2">ou copie o Pix</p>
              <div className="flex w-full gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono truncate">
                  {pixPayload || artist.pixKey}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(pixPayload || artist.pixKey)}
                  className="px-3 py-2.5 bg-white/10 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            )}

            <button
              type="button"
              onClick={() => setUseExistingDeposit((value) => !value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 text-sm font-semibold text-zinc-300 hover:bg-white/10 transition-colors"
            >
              {useExistingDeposit
                ? 'Vou pagar um novo sinal'
                : 'Já paguei sinal de uma reserva recusada'}
            </button>

            {!useExistingDeposit && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Upload size={16} className="text-zinc-400" />
                  Comprovante
                </p>
                <label className="block bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer">
                  {pixProof ? 'Comprovante anexado' : 'Anexar PDF ou imagem do comprovante'}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => handlePixProofUpload(e.target.files?.[0])}
                  />
                </label>
                <p className="text-zinc-500 text-xs mt-2">
                  O tatuador vai conferir esse comprovante no app do banco antes de aprovar.
                </p>
              </div>
            )}

            {/* After payment */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Upload size={16} className="text-zinc-400" />
                Após pagar
              </p>
              <div className="space-y-2 text-xs text-zinc-400">
                <p>1. Faça o pagamento via Pix no valor acima</p>
                <p>2. Anexe o comprovante em PDF ou imagem</p>
                <p>3. Clique em "Enviar comprovante" abaixo</p>
                <p>4. Aguarde a aprovação do tatuador via WhatsApp</p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || (!useExistingDeposit && !pixProof)}
              className="w-full font-bold py-4 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50 text-sm"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : (
                useExistingDeposit ? 'Enviar usando sinal anterior' : 'Enviar comprovante'
              )}
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-10 space-y-5">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: `${accent}20`, border: `2px solid ${accent}` }}
            >
              <CheckCircle size={48} style={{ color: accent }} />
            </div>

            <div>
              <h2 className="text-2xl font-black mb-2">Solicitação enviada!</h2>
              <p className="text-zinc-400 leading-relaxed">
                Seu agendamento está aguardando confirmação. O tatuador irá revisar e entrar em
                contato via WhatsApp em breve.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-zinc-400" />
                <span className="text-sm text-zinc-200">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-zinc-400" />
                <span className="text-sm text-zinc-200">{selectedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-zinc-400" />
                <span className="text-sm text-zinc-200">{form.clientName}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-zinc-500 text-xs">
                Fique de olho no seu WhatsApp ({form.clientPhone})
              </p>
              <button
                onClick={onBack}
                className="w-full py-3.5 bg-white/10 border border-white/10 rounded-xl font-semibold text-sm hover:bg-white/15 transition-colors"
              >
                Voltar ao perfil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
