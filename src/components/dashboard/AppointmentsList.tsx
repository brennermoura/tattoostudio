import { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit3,
  Filter,
  Mail,
  MessageSquare,
  Phone,
  Save,
  X,
  XCircle,
} from 'lucide-react';
import { ArtistProfile, Appointment } from '../../types';
import { updateAppointmentSchedule, updateAppointmentStatus } from '../../services/artistService';
import { openPrivateAppointmentFile } from '../../services/uploadService';
import { useModalHistory } from '../../hooks/useModalHistory';

interface AppointmentsListProps {
  artist: ArtistProfile;
  onUpdate: (artist: ArtistProfile) => void;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

function formatAppointmentDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
}

function formatCreatedAt(value: string) {
  if (!value) return 'Data nao registrada';

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function csvCell(value: string | number | boolean | undefined) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function canEditAppointment(appointment: Appointment) {
  return new Date(`${appointment.date}T${appointment.time}:00`).getTime() > Date.now();
}

function StatusBadge({ status }: { status: Appointment['status'] }) {
  if (status === 'approved') {
    return (
      <span className="flex items-center gap-1 rounded-full border border-green-900/50 bg-green-950/50 px-2.5 py-1 text-xs font-medium text-green-400">
        <CheckCircle size={12} /> Aprovado
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span className="flex items-center gap-1 rounded-full border border-yellow-900/50 bg-yellow-950/50 px-2.5 py-1 text-xs font-medium text-yellow-400">
        <Clock size={12} /> Pendente
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400">
      <XCircle size={12} /> Recusado
    </span>
  );
}

function AppointmentCard({
  appt,
  onApprove,
  onReject,
  onReschedule,
  artistSlug,
  savingStatus,
}: {
  appt: Appointment;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onReschedule: (id: string, date: string, time: string) => Promise<void>;
  artistSlug: string;
  savingStatus: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState(appt.date);
  const [editTime, setEditTime] = useState(appt.time);
  const [savingEdit, setSavingEdit] = useState(false);

  useModalHistory(editOpen, () => setEditOpen(false), `appointment-edit-${appt.id}`);

  const dateFormatted = formatAppointmentDate(appt.date);
  const editable = canEditAppointment(appt);
  const publicProfileUrl = `https://tatu.app/${artistSlug}`;
  const cleanPhone = appt.clientPhone.replace(/\D/g, '');
  const clientWhatsapp = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const approvalMsg = encodeURIComponent(
    `Olá ${appt.clientName}! Seu horário foi confirmado para ${dateFormatted} às ${appt.time}. Link do perfil: ${publicProfileUrl}`
  );
  const reminderMsg = encodeURIComponent(
    `Olá ${appt.clientName}! Lembrete do seu horário: ${dateFormatted} às ${appt.time}. Qualquer imprevisto, me chama por aqui.`
  );
  const rejectionMsg = encodeURIComponent(
    appt.depositRequired === false
      ? `Olá ${appt.clientName}! Não vou conseguir confirmar esse horário (${dateFormatted} às ${appt.time}). Me chama para ajustarmos outra opção: ${publicProfileUrl}`
      : `Olá ${appt.clientName}! Não vou conseguir confirmar esse horário (${dateFormatted} às ${appt.time}). Seu sinal fica como crédito para escolher outro horário sem pagar novamente: ${publicProfileUrl}`
  );

  const openWhatsapp = (message: string) => {
    window.open(`https://wa.me/${clientWhatsapp}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const openProof = async () => {
    if (!appt.pixProof) return;

    try {
      if (appt.pixProof.startsWith('/api/appointment-files/')) {
        await openPrivateAppointmentFile(appt.pixProof);
        return;
      }

      window.open(appt.pixProof, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Erro ao abrir comprovante:', error);
      alert(error instanceof Error ? error.message : 'Nao foi possivel abrir o comprovante.');
    }
  };

  const approveAndNotify = async () => {
    try {
      await onApprove(appt.id);
      openWhatsapp(approvalMsg);
    } catch {
      // Error message is handled by the parent.
    }
  };

  const rejectAndNotify = async () => {
    try {
      await onReject(appt.id);
      openWhatsapp(rejectionMsg);
    } catch {
      // Error message is handled by the parent.
    }
  };

  const submitEdit = async () => {
    if (!editDate || !editTime) return;

    setSavingEdit(true);
    try {
      await onReschedule(appt.id, editDate, editTime);
      setEditOpen(false);
    } catch (error) {
      console.error('Erro ao editar horario:', error);
      alert(error instanceof Error ? error.message : 'Nao foi possivel editar o horario.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white/5 transition-all ${
        appt.status === 'pending'
          ? 'border-yellow-900/40'
          : appt.status === 'approved'
          ? 'border-green-900/30'
          : 'border-white/10'
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold text-zinc-300">
          {appt.clientName[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{appt.clientName}</p>
            <StatusBadge status={appt.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
            <Calendar size={12} />
            <span className="capitalize">{dateFormatted}</span>
            <span className="text-zinc-600">·</span>
            <Clock size={12} />
            <span>{appt.time}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="flex-shrink-0 text-zinc-500" />
        ) : (
          <ChevronDown size={18} className="flex-shrink-0 text-zinc-500" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-zinc-500">Data</p>
              <p className="text-sm font-bold text-zinc-200 capitalize">{formatShortDate(appt.date)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-zinc-500">Dia</p>
              <p className="text-sm font-bold text-zinc-200 capitalize">{dateFormatted.split(',')[0]}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-zinc-500">Hora</p>
              <p className="text-sm font-bold text-zinc-200">{appt.time}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={`tel:${appt.clientPhone}`}
              className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10"
            >
              <Phone size={14} className="text-zinc-400" />
              {appt.clientPhone}
            </a>
            <a
              href={`mailto:${appt.clientEmail}`}
              className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10"
            >
              <Mail size={14} className="text-zinc-400" />
              {appt.clientEmail}
            </a>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Descrição da tattoo
            </p>
            <p className="rounded-xl bg-white/5 p-3 text-sm leading-relaxed text-zinc-300">
              {appt.description}
            </p>
          </div>

          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
              appt.depositRequired === false || appt.depositPaid
                ? 'border border-green-900/30 bg-green-950/30 text-green-300'
                : 'border border-red-900/30 bg-red-950/30 text-red-300'
            }`}
          >
            {appt.depositRequired === false || appt.depositPaid ? (
              <CheckCircle size={14} />
            ) : (
              <XCircle size={14} />
            )}
            {appt.depositRequired === false
              ? 'Reserva sem sinal obrigatório'
              : appt.depositCreditUsed
              ? 'Sinal anterior usado como crédito'
              : appt.pixProof
              ? 'Comprovante enviado, aguardando conferência'
              : 'Aguardando pagamento do sinal'}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {appt.pixProof && (
              <button
                type="button"
                onClick={openProof}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10"
              >
                <MessageSquare size={16} />
                Abrir comprovante
              </button>
            )}

            {editable ? (
              <button
                type="button"
                onClick={() => {
                  setEditDate(appt.date);
                  setEditTime(appt.time);
                  setEditOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10"
              >
                <Edit3 size={16} />
                Editar horário
              </button>
            ) : (
              <span className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-semibold text-zinc-500">
                <Clock size={16} />
                Horário encerrado
              </span>
            )}
          </div>

          {appt.status === 'pending' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={approveAndNotify}
                disabled={savingStatus}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle size={16} />
                {savingStatus ? 'Salvando...' : 'Aprovar e avisar'}
              </button>
              <button
                type="button"
                onClick={rejectAndNotify}
                disabled={savingStatus}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-red-500/40 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={16} />
                {savingStatus ? 'Salvando...' : 'Recusar e avisar'}
              </button>
            </div>
          )}

          {appt.status === 'approved' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={`https://wa.me/${clientWhatsapp}?text=${approvalMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600"
              >
                <MessageSquare size={16} />
                Reenviar confirmação
              </a>
              <a
                href={`https://wa.me/${clientWhatsapp}?text=${reminderMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10"
              >
                <Clock size={16} />
                Enviar lembrete
              </a>
            </div>
          )}

          {appt.status === 'rejected' && (
            <a
              href={`https://wa.me/${clientWhatsapp}?text=${rejectionMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-red-500/40 hover:text-red-200"
            >
              <MessageSquare size={16} />
              Reenviar recusa via WhatsApp
            </a>
          )}

          <p className="text-xs text-zinc-600">Solicitado em {formatCreatedAt(appt.createdAt)}</p>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">Editar horário</h3>
                <p className="text-xs text-zinc-500">{appt.clientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Data</span>
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Hora</span>
                <select
                  value={editTime}
                  onChange={(event) => setEditTime(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500"
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
                onClick={() => setEditOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={savingEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {savingEdit ? 'Salvando...' : 'Salvar horário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsList({ artist, onUpdate }: AppointmentsListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [filterDate, setFilterDate] = useState('');
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  const sortedAppointments = [...artist.appointments].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  });

  const filtered =
    filter === 'all'
      ? sortedAppointments.filter((appointment) => !filterDate || appointment.date === filterDate)
      : sortedAppointments.filter(
          (appointment) => appointment.status === filter && (!filterDate || appointment.date === filterDate)
        );

  const counts = {
    all: artist.appointments.length,
    pending: artist.appointments.filter((appointment) => appointment.status === 'pending').length,
    approved: artist.appointments.filter((appointment) => appointment.status === 'approved').length,
    rejected: artist.appointments.filter((appointment) => appointment.status === 'rejected').length,
  };

  const filterOptions: { id: FilterStatus; label: string; color: string }[] = [
    { id: 'all', label: 'Todos', color: 'text-zinc-300' },
    { id: 'pending', label: 'Pendentes', color: 'text-yellow-400' },
    { id: 'approved', label: 'Aprovados', color: 'text-green-400' },
    { id: 'rejected', label: 'Recusados', color: 'text-zinc-400' },
  ];

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    setStatusSavingId(id);
    try {
      await updateAppointmentStatus(artist.id, id, status);
      const updated = artist.appointments.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment
      );
      onUpdate({ ...artist, appointments: updated });
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await handleStatusChange(id, 'approved');
    } catch (error) {
      console.error('Erro ao aprovar agendamento:', error);
      alert('Nao foi possivel aprovar no banco. Tente novamente.');
      throw error;
    }
  };

  const handleReject = async (id: string) => {
    try {
      await handleStatusChange(id, 'rejected');
    } catch (error) {
      console.error('Erro ao recusar agendamento:', error);
      alert('Nao foi possivel recusar no banco. Tente novamente.');
      throw error;
    }
  };

  const handleReschedule = async (id: string, date: string, time: string) => {
    await updateAppointmentSchedule(artist.id, id, date, time);

    const updated = artist.appointments.map((appointment) =>
      appointment.id === id ? { ...appointment, date, time } : appointment
    );
    onUpdate({ ...artist, appointments: updated });
  };

  const exportReport = () => {
    const rows = [
      [
        'cliente',
        'telefone',
        'email',
        'status',
        'data',
        'dia_da_semana',
        'hora',
        'sinal_obrigatorio',
        'sinal_pago',
        'credito_usado',
        'solicitado_em',
        'descricao',
      ],
      ...sortedAppointments.map((appointment) => [
        appointment.clientName,
        appointment.clientPhone,
        appointment.clientEmail,
        appointment.status,
        formatShortDate(appointment.date),
        formatAppointmentDate(appointment.date).split(',')[0],
        appointment.time,
        appointment.depositRequired !== false,
        appointment.depositPaid,
        appointment.depositCreditUsed ?? false,
        formatCreatedAt(appointment.createdAt),
        appointment.description,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agendamentos-${artist.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Agendamentos</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Controle de reservas, comprovantes, data e comunicação com cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={exportReport}
          disabled={artist.appointments.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Exportar relatório
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all ${
              filter === option.id
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/5 bg-white/[0.03] text-zinc-500 hover:border-white/10 hover:text-zinc-300'
            }`}
          >
            <Filter size={12} />
            {option.label}
            <span className={`ml-0.5 text-xs font-bold ${filter === option.id ? option.color : 'text-zinc-600'}`}>
              {counts[option.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Filtrar por data</span>
          <input
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-purple-500"
          />
        </label>
        {filterDate && (
          <button
            type="button"
            onClick={() => setFilterDate('')}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10"
          >
            Limpar data
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appt={appointment}
              onApprove={handleApprove}
              onReject={handleReject}
              onReschedule={handleReschedule}
              artistSlug={artist.slug}
              savingStatus={statusSavingId === appointment.id}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-14 text-center">
          <Calendar size={34} className="mx-auto mb-3 text-zinc-600" />
          <p className="font-medium text-zinc-400">Nenhum agendamento encontrado</p>
          <p className="mt-1 text-sm text-zinc-600">
            {filterDate ? 'Nenhum agendamento nessa data.' : 'Nenhum agendamento com esse filtro.'}
          </p>
        </div>
      )}
    </div>
  );
}
