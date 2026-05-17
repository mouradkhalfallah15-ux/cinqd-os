import React, { useState } from 'react';
import { FiFileText, FiChevronDown, FiChevronUp, FiShield } from 'react-icons/fi';

// Tunisian Code des Obligations et des Contrats (COC) — key articles referenced
const COC_SECTIONS = [
  {
    id: 'formation',
    title: 'Art. 2–23 COC — Formation du Contrat',
    summary: 'Tout contrat B2B CINQD est formé par offre et acceptation expresse. Le silence ne vaut pas acceptation.',
    clauses: [
      'L\'offre commerciale est valable 30 jours calendaires à compter de sa date d\'émission.',
      'Toute acceptation partielle ou assortie de réserves constitue un contre-projet et non une acceptation.',
      'La capacité juridique des parties et l\'absence de vice du consentement (erreur, dol, violence) sont des conditions de validité absolues.',
    ],
  },
  {
    id: 'obligations',
    title: 'Art. 256–372 COC — Obligations Contractuelles',
    summary: 'Les obligations des parties sont strictement définies. Toute inexécution engage la responsabilité contractuelle.',
    clauses: [
      'Le vendeur (CINQD) s\'engage à livrer les marchandises conformes au bon de commande signé dans le délai convenu.',
      'L\'acheteur s\'engage à réceptionner et à payer dans les délais contractuels (délai de paiement maximum: 60 jours fin de mois selon la loi tunisienne).',
      'La clause pénale est fixée à 1% du montant TTC par semaine de retard, plafonnée à 15% du montant total.',
    ],
  },
  {
    id: 'livraison',
    title: 'Conditions de Livraison (Incoterms adaptés)',
    summary: 'Les modalités de livraison et le transfert des risques.',
    clauses: [
      'Livraison Ex-Works (EXW) par défaut. Tout autre Incoterm doit être explicitement stipulé dans le bon de commande.',
      'Le transfert de propriété s\'opère au moment de la remise physique des marchandises contre signature du bon de livraison.',
      'Toute réserve doit être émise par écrit (email ou courrier recommandé) dans les 48h suivant la réception.',
    ],
  },
  {
    id: 'paiement',
    title: 'Modalités de Paiement & RS',
    summary: 'Conditions financières et retenue à la source (RS) conformément au Code de l\'IRPP et de l\'IS.',
    clauses: [
      'La Retenue à la Source (RS) de 1,5% s\'applique sur les montants supérieurs à 1 000 TND (conformément au CGI tunisien).',
      'La TVA applicable est de 19% (taux standard), 7% (taux réduit) ou 0% (exonération) selon la nature des biens/services.',
      'Le paiement par virement bancaire est préféré. Les chèques certifiés sont acceptés. Aucun règlement en espèces au-delà de 3 000 TND (loi anti-blanchiment).',
      'En cas de litige sur facture, l\'acheteur notifie par écrit dans les 10 jours. Le solde non contesté reste exigible.',
    ],
  },
  {
    id: 'confidentialite',
    title: 'Confidentialité & Propriété Intellectuelle',
    summary: 'Protection des informations commerciales et industrielles.',
    clauses: [
      'Toutes les informations techniques, tarifaires et commerciales échangées sont strictement confidentielles pendant 3 ans après la fin du contrat.',
      'Les recettes, formules et procédés industriels de CINQD restent la propriété exclusive de CINQD. Toute reproduction est interdite.',
      'La violation de la clause de confidentialité engage une indemnité forfaitaire de 50 000 TND sans préjudice de tout recours judiciaire.',
    ],
  },
  {
    id: 'litiges',
    title: 'Juridiction & Règlement des Litiges',
    summary: 'Compétence des tribunaux tunisiens conformément au COC.',
    clauses: [
      'Tout litige est soumis à une tentative de médiation amiable de 30 jours avant tout recours judiciaire.',
      'À défaut d\'accord amiable, compétence exclusive est attribuée au Tribunal de Première Instance de Sfax.',
      'Le droit applicable est exclusivement le droit tunisien (COC, CGI, Code de Commerce).',
      'La clause compromissoire (arbitrage CATO) peut être activée par accord mutuel des parties.',
    ],
  },
];

const Section = ({ section }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/40 transition-colors text-left"
      >
        <div>
          <p className="text-white font-semibold text-sm">{section.title}</p>
          <p className="text-slate-400 text-xs mt-0.5">{section.summary}</p>
        </div>
        {open ? <FiChevronUp className="text-slate-400 flex-shrink-0" /> : <FiChevronDown className="text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-slate-700 bg-slate-900/30">
          <ul className="mt-3 space-y-2">
            {section.clauses.map((clause, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="text-cyan-500 font-bold flex-shrink-0 mt-0.5">§{i + 1}</span>
                {clause}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const EnterpriseTerms = ({ onAccept }) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-3">
        <FiShield className="text-blue-400 text-xl flex-shrink-0" />
        <div>
          <p className="text-white font-semibold text-sm">Conformité Légale — Code des Obligations et des Contrats (COC)</p>
          <p className="text-slate-400 text-xs">Toutes les transactions B2B CINQD sont encadrées par le droit tunisien.</p>
        </div>
      </div>

      <div className="space-y-2">
        {COC_SECTIONS.map((s) => <Section key={s.id} section={s} />)}
      </div>

      {onAccept && (
        <div className="bg-slate-800 rounded-xl px-5 py-4 flex items-start gap-3">
          <input
            id="accept-terms"
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-cyan-400"
          />
          <label htmlFor="accept-terms" className="text-slate-300 text-sm cursor-pointer">
            J'ai lu et j'accepte l'intégralité des Conditions Générales de Vente CINQD conformément aux dispositions du Code des Obligations et des Contrats tunisien.
          </label>
        </div>
      )}

      {onAccept && (
        <button
          onClick={() => accepted && onAccept()}
          disabled={!accepted}
          className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          <FiFileText /> Valider et accéder au portail B2B
        </button>
      )}
    </div>
  );
};

export default EnterpriseTerms;
