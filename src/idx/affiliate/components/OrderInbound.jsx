import React from 'react';
import { useOrders } from '../hooks/useOrders';
import { useWallet } from '../hooks/useWallet';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAffiliate } from '../hooks/useAffiliate';
import { DEFAULT_TIERS, SPONSORING_FEE_PCT } from '../config/defaults';
import { FiInbox, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';

const STATUS_STYLES = {
  pending:   'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  confirmed: 'bg-blue-900/40  text-blue-300  border-blue-700',
  delivered: 'bg-green-900/40 text-green-300 border-green-700',
  failed:    'bg-red-900/40   text-red-300   border-red-700',
};
const STATUS_LABELS = { pending: 'En attente', confirmed: 'Confirmée', delivered: 'Livrée', failed: 'Échouée' };

const OrderInbound = ({ uid }) => {
  const { inbound, updateOrderStatus } = useOrders(uid);
  const { affiliate } = useAffiliate(uid);
  const { debit } = useWallet(uid);

  const tier = DEFAULT_TIERS[affiliate?.tier ?? 'NO_COMMITMENT'];
  const pendingCount = inbound.filter((o) => o.status === 'pending').length;

  const handleDeliver = async (order) => {
    await updateOrderStatus(order.id, 'delivered');
    // Deduct sponsoring/ads fee from wallet on successful delivery
    if (tier.sponsoringFeePct > 0 && order.total > 0) {
      const fee = +(order.total * tier.sponsoringFeePct / 100).toFixed(3);
      await debit(fee, 'sponsoring', { ref: order.id });
      toast.success(`Livraison confirmée. Frais sponsoring de ${fee} TND déduits.`);
    } else {
      toast.success('Livraison confirmée.');
    }
  };

  const handleFail = async (order) => {
    await updateOrderStatus(order.id, 'failed');
    // Apply penalty
    const penalty = tier.penaltyPerFailedOrder ?? 0;
    if (penalty > 0) {
      await debit(penalty, 'penalty', { ref: order.id });
      await addDoc(collection(db, 'affiliates', uid, 'penalties'), {
        orderId: order.id,
        reason: 'failed_delivery',
        amount: penalty,
        createdAt: serverTimestamp(),
      });
      toast.error(`Échec enregistré. Pénalité de ${penalty} TND déduite.`);
    } else {
      toast.error('Échec de livraison enregistré.');
    }
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      <div className="flex items-center gap-3">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <FiInbox className="text-cyan-400" /> Commandes Entrantes (Assignées)
        </h3>
        {pendingCount > 0 && (
          <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800 px-2 py-0.5 rounded-full">
            {pendingCount} en attente
          </span>
        )}
      </div>

      {tier.sponsoringFeePct > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-slate-400">
          <FiInfo className="text-cyan-400 mt-0.5 flex-shrink-0" />
          <p>Pour chaque livraison réussie, <span className="text-cyan-300 font-semibold">{SPONSORING_FEE_PCT}%</span> du montant est automatiquement déduit de votre Wallet comme frais de sponsoring/publicité.</p>
        </div>
      )}

      {inbound.length === 0 && (
        <div className="bg-slate-800 rounded-2xl py-12 text-center text-slate-500">
          <FiInbox className="mx-auto text-3xl mb-2 opacity-40" />
          <p>Aucune commande assignée par la société.</p>
        </div>
      )}

      <div className="space-y-3">
        {inbound.map((o) => (
          <div key={o.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm">{o.description ?? `Commande #${o.id.slice(0, 8)}`}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Assignée par: <span className="text-slate-400">{o.assignedBy ?? 'CINQD'}</span>
                  {o.notes && ` · ${o.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">{Number(o.total ?? 0).toFixed(3)} TND</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pending}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
            </div>

            {o.status === 'confirmed' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleDeliver(o)}
                  className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <FiCheckCircle /> Marquer livré
                </button>
                <button
                  onClick={() => handleFail(o)}
                  className="flex items-center gap-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <FiXCircle /> Échec livraison
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderInbound;
