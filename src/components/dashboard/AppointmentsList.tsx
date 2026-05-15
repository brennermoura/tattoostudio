import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { ArtistProfile, Appointment } from '../../types';
import { updateAppointmentStatus } from '../../services/artistService';
import { openPrivateAppointmentFile } from '../../services/uploadService';

interface AppointmentsListProps {
  artist: ArtistProfile;
  onUpdate: (artist: ArtistProfile) => void;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: Appointment['status'] }) {
  if (status === 'approved')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-950/50 border border-green-900/50 px-2.5 py-1 rounded-full">
        <CheckCircle size={12} /> Aprovado
      </span>
    );
  if (status === 'pending')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-950/50 border border-yellow-900/50 px-2.5 py-1 rounded-full">
        <Clock size={12} /> Pendente
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-950/50 border border-red-900/50 px-2.5 py-1 rounded-full">
      <XCircle size={12} /> Recusado
    </span>
  );
}

function AppointmentCard({
  appt,
  onApprove,
  onReject,
  artistSlug,
}: {
  appt: Appointment;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  artistSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const dateFormatted = new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const publicProfileUrl = `https://tatu.app/${artistSlug}`;
  const clientWhatsapp = `55${appt.clientPhone.replace(/\D/g, '')}`;
  const approvalMsg = encodeURIComponent(
    `Olá ${appt.clientName}! Seu horário foi confirmado para ${dateFormatted} às ${appt.time}. Te vejo lá! Link do perfil: ${publicProfileUrl}`
  );
  const rejectionMsg = encodeURIComponent(
    appt.depositRequired === false
      ? `Olá ${appt.clientName}! Obrigado pela solicitação, mas não vou conseguir confirmar esse horário (${dateFormatted} às ${appt.time}). Me chama por aqui para ajustarmos outra opção: ${publicProfileUrl}`
      : `Olá ${appt.clientName}! Obrigado pela solicitação, mas não vou conseguir confirmar esse horário (${dateFormatted} às ${appt.time}). Seu sinal fica como crédito para escolher outro horário sem pagar novamente. Acesse o perfil e selecione uma nova data: ${publicProfileUrl}`
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

  const approveAndNotify = () => {
    onApprove(appt.id);
    openWhatsapp(approvalMsg);
  };

  const rejectAndNotify = () => {
    onReject(appt.id);
    openWhatsapp(rejectionMsg);
  };

  return (
    <div
      className={`bg-white/5 border rounded-2xl overflow-hidden transition-all ${
        appt.status === 'pending'
          ? 'border-yellow-900/40'
          : appt.status === 'approved'
          ? 'border-green-900/30'
          : 'border-white/5'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-lg font-bold text-zinc-300">
          {appt.clientName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm">{appt.clientName}</p>
            <StatusBadge status={appt.status} />
          </div>
          <div className="flex items-center gap-1 text-zinc-500 text-xs mt-0.5">
            <Calendar size={11} />
            <span className="capitalize">{dateFormatted}</span>
            <span>·</span>
            <Clock size={11} />
            <span>{appt.time}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-zinc-500 flex-shrink-0" />
        )}
      </div>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={`tel:${appt.clientPhone}`}
              className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 transition-colors"
            >
              <Phone size={14} className="text-zinc-400" />
              {appt.clientPhone}
            </a>
            <a
              href={`mailto:${appt.clientEmail}`}
              className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 transition-colors"
            >
              <Mail size={14} className="text-zinc-400" />
              {appt.clientEmail}
            </a>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wider font-medium">
              Descrição da tattoo
            </p>
            <p className="text-sm text-zinc-300 bg-white/5 rounded-xl p-3 leading-relaxed">
              {appt.description}
            </p>
          </div>

          {/* Deposit */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
              appt.depositRequired === false || appt.depositPaid
                ? 'bg-green-950/30 border border-green-900/30 text-green-300'
                : 'bg-red-950/30 border border-red-900/30 text-red-300'
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
              ? 'Comprovante enviado — aguardando conferência'
              : 'Aguardando pagamento do sinal'}
          </div>

          {appt.pixProof && (
            <button
              type="button"
              onClick={openProof}
              className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-zinc-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors w-full"
            >
              <MessageSquare size={16} />
              Abrir comprovante
            </button>
          )}

          {/* Actions */}
          {appt.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={approveAndNotify}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <CheckCircle size={16} />
                Conferi e aprovar
              </button>
              <button
                onClick={rejectAndNotify}
                className="flex-1 flex items-center justify-center gap-2 bg-red-950/50 hover:bg-red-950 border border-red-900/50 text-red-400 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <XCircle size={16} />
                Recusar e avisar
              </button>
            </div>
          )}

          {appt.status === 'approved' && (
            <a
              href={`https://wa.me/${clientWhatsapp}?text=${approvalMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors w-full"
            >
              <MessageSquare size={16} />
              Reenviar confirmação via WhatsApp
            </a>
          )}

          {appt.status === 'rejected' && (
            <a
              href={`https://wa.me/${clientWhatsapp}?text=${rejectionMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-red-950/50 hover:bg-red-950 border border-red-900/50 text-red-400 font-semibold py-2.5 rounded-xl text-sm transition-colors w-full"
            >
              <MessageSquare size={16} />
              Reenviar recusa via WhatsApp
            </a>
          )}

          <p className="text-zinc-600 text-xs">
            Solicitado em{' '}
            {new Date(appt.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsList({ artist, onUpdate }: AppointmentsListProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const handleApprove = (id: string) => {
    const updated = artist.appointments.map((a) =>
      a.id === id ? { ...a, status: 'approved' as const } : a
    );
    onUpdate({ ...artist, appointments: updated });

    void updateAppointmentStatus(artist.id, id, 'approved').catch((error) => {
      console.error('Erro ao aprovar agendamento:', error);
      alert('Não foi possível aprovar no banco. Tente novamente.');
    });
  };

  const handleReject = (id: string) => {
    const updated = artist.appointments.map((a) =>
      a.id === id ? { ...a, status: 'rejected' as const } : a
    );
    onUpdate({ ...artist, appointments: updated });

    void updateAppointmentStatus(artist.id, id, 'rejected').catch((error) => {
      console.error('Erro ao recusar agendamento:', error);
      alert('Não foi possível recusar no banco. Tente novamente.');
    });
  };

  const filtered =
    filter === 'all'
      ? artist.appointments
      : artist.appointments.filter((a) => a.status === filter);

  const counts = {
    all: artist.appointments.length,
    pending: artist.appointments.filter((a) => a.status === 'pending').length,
    approved: artist.appointments.filter((a) => a.status === 'approved').length,
    rejected: artist.appointments.filter((a) => a.status === 'rejected').length,
  };

  const filterOptions: { id: FilterStatus; label: string; color: string }[] = [
    { id: 'all', label: 'Todos', color: 'text-zinc-300' },
    { id: 'pending', label: 'Pendentes', color: 'text-yellow-400' },
    { id: 'approved', label: 'Aprovados', color: 'text-green-400' },
    { id: 'rejected', label: 'Recusados', color: 'text-red-400' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Agendamentos</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Gerencie as solicitações dos seus clientes
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
              filter === f.id
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/3 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10'
            }`}
          >
            <Filter size={12} />
            {f.label}
            <span
              className={`ml-0.5 text-xs font-bold ${
                filter === f.id ? f.color : 'text-zinc-600'
              }`}
            >
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => {
              // Pending first, then by date
              if (a.status === 'pending' && b.status !== 'pending') return -1;
              if (b.status === 'pending' && a.status !== 'pending') return 1;
              return a.date.localeCompare(b.date);
            })
            .map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onApprove={handleApprove}
                onReject={handleReject}
                artistSlug={artist.slug}
              />
            ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-zinc-400 font-medium">Nenhum agendamento encontrado</p>
          <p className="text-zinc-600 text-sm mt-1">
            {filter === 'all'
              ? 'Compartilhe seu link para receber agendamentos'
              : `Nenhum agendamento com status "${filter}"`}
          </p>
        </div>
      )}
    </div>
  );
}
