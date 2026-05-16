import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, where, getDocs, doc, writeBatch
} from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import {
  FiUsers, FiUserPlus, FiClock, FiDollarSign,
  FiPrinter, FiX, FiAlertCircle
} from 'react-icons/fi';

// ─── Legal Constants (Tunisia 2024) ──────────────────────────────────────────
const CNSS_EMPLOYEE_RATE  = 0.0918;  // 9.18% employee social security
const CNSS_EMPLOYER_RATE  = 0.1657;  // 16.57% employer social security
const OVERTIME_MULTIPLIER = 1.25;    // 25% premium on overtime hours
const WORK_HOURS_MONTHLY  = 208;     // 26 working days × 8 hours
const SMIG_MONTHLY        = 450;     // Tunisian minimum wage (TND)
const MAX_OVERTIME_HOURS  = 80;      // legal monthly overtime cap

// ─── IRPP — Progressive Income Tax (Tunisia) ─────────────────────────────────
// Brackets applied on annual taxable income (gross - CNSS employee)
function calcAnnualIRPP(annualTaxable) {
  if (annualTaxable <= 5000)  return 0;
  if (annualTaxable <= 20000) return (annualTaxable - 5000)  * 0.26;
  if (annualTaxable <= 30000) return 3900 + (annualTaxable - 20000) * 0.28;
  if (annualTaxable <= 50000) return 3900 + 2800 + (annualTaxable - 30000) * 0.32;
  return 3900 + 2800 + 6400  + (annualTaxable - 50000) * 0.35;
}

function calcPayroll({ baseSalary, overtimeHours = 0, bonuses = 0, advances = 0 }) {
  const hourlyRate    = baseSalary / WORK_HOURS_MONTHLY;
  const overtimePay   = overtimeHours * hourlyRate * OVERTIME_MULTIPLIER;
  const grossSalary   = baseSalary + overtimePay + bonuses;

  const cnssEmployee  = grossSalary * CNSS_EMPLOYEE_RATE;
  const cnssEmployer  = grossSalary * CNSS_EMPLOYER_RATE;
  const taxableMonthly = grossSalary - cnssEmployee;
  const irpp          = calcAnnualIRPP(taxableMonthly * 12) / 12;

  const netSalary     = Math.max(0, taxableMonthly - irpp - advances);

  return {
    baseSalary,
    overtimePay,
    bonuses,
    grossSalary,
    cnssEmployee,
    cnssEmployer,
    taxableIncome: taxableMonthly,
    irpp,
    advances,
    netSalary,
    totalEmployerCost: grossSalary + cnssEmployer,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateEmployee({ name, position, baseSalary, startDate }) {
  if (!name || name.trim().length < 2)
    return 'الاسم مطلوب (حرفان على الأقل).';
  if (!position || position.trim().length < 2)
    return 'المنصب مطلوب.';
  const salary = parseFloat(baseSalary);
  if (isNaN(salary) || salary < SMIG_MONTHLY)
    return `الراتب يجب أن يكون ${SMIG_MONTHLY} TND على الأقل (الحد الأدنى للأجور).`;
  if (salary > 50000)
    return 'الراتب الشهري يتجاوز الحد المعقول. تحقق من القيمة.';
  if (!startDate)
    return 'تاريخ الانتداب مطلوب.';
  return null;
}

function validateAdjustment({ employeeId, amount }) {
  if (!employeeId) return 'اختر الموظف.';
  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) return 'المبلغ يجب أن يكون أكبر من صفر.';
  return null;
}

// ─── Payslip Modal ────────────────────────────────────────────────────────────
const PayslipModal = ({ employee, payroll, onClose }) => {
  const month = new Date().toLocaleString('fr-TN', { month: 'long', year: 'numeric' });
  const fmt   = n => (typeof n === 'number' ? n.toFixed(3) : '—');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
      <div className="bg-white text-black rounded-2xl w-full max-w-lg shadow-2xl print:rounded-none print:shadow-none print:max-w-full" id="payslip">
        {/* Close button — hidden on print */}
        <div className="flex justify-between items-center p-6 border-b print:hidden">
          <h3 className="font-black text-lg uppercase">Fiche de Paie — Aperçu</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-black"><FiX size={20} /></button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-black">
            <h1 className="text-xl font-black uppercase">CINQD Industrial OS</h1>
            <p className="font-bold">Fiche de Paie — {month}</p>
          </div>

          {/* Employee info */}
          <div className="grid grid-cols-2 gap-2 text-xs pb-4 border-b border-gray-300">
            <div><span className="text-gray-500">Employé:</span> <strong>{employee.name}</strong></div>
            <div><span className="text-gray-500">Poste:</span> <strong>{employee.position || '—'}</strong></div>
            <div><span className="text-gray-500">Date d'embauche:</span> {employee.startDate || '—'}</div>
            <div><span className="text-gray-500">Période:</span> {month}</div>
          </div>

          {/* Earnings */}
          <div>
            <p className="font-black uppercase text-xs text-gray-400 mb-2">Rémunération</p>
            <div className="space-y-1">
              <Row label="Salaire de Base"     value={`${fmt(payroll.baseSalary)} TND`} />
              <Row label="Heures Supplémentaires" value={`${fmt(payroll.overtimePay)} TND`} />
              <Row label="Primes"              value={`${fmt(payroll.bonuses)} TND`} />
              <Row label="Salaire Brut"        value={`${fmt(payroll.grossSalary)} TND`} bold />
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="font-black uppercase text-xs text-gray-400 mb-2">Retenues Légales</p>
            <div className="space-y-1">
              <Row label={`CNSS Salarié (${(CNSS_EMPLOYEE_RATE * 100).toFixed(2)}%)`} value={`- ${fmt(payroll.cnssEmployee)} TND`} accent="text-red-600" />
              <Row label="Revenu Imposable (Base IRPP)"                               value={`${fmt(payroll.taxableIncome)} TND`} />
              <Row label="IRPP (Barème Progressif)"                                    value={`- ${fmt(payroll.irpp)} TND`} accent="text-red-600" />
              <Row label="Avances Déduites"                                            value={`- ${fmt(payroll.advances)} TND`} accent="text-red-600" />
            </div>
          </div>

          {/* Net */}
          <div className="border-t-2 border-black pt-3">
            <Row label="NET À PAYER" value={`${fmt(payroll.netSalary)} TND`} bold large />
          </div>

          {/* Employer cost — informational */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 border border-gray-200">
            <p>Charge patronale CNSS ({(CNSS_EMPLOYER_RATE * 100).toFixed(2)}%): {fmt(payroll.cnssEmployer)} TND</p>
            <p>Coût total employeur: <strong>{fmt(payroll.totalEmployerCost)} TND</strong></p>
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            Document généré conformément au Code du Travail Tunisien et au barème IRPP 2024.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            <FiPrinter /> Imprimer la Fiche
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, bold, large, accent = '' }) => (
  <div className={`flex justify-between ${large ? 'text-base' : 'text-xs'}`}>
    <span className={bold ? 'font-black' : 'text-gray-600'}>{label}</span>
    <span className={`font-black ${accent}`}>{value}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const HRManager = () => {
  const [employees, setEmployees]       = useState([]);
  const [tab, setTab]                   = useState('Records');
  const [isSaving, setIsSaving]         = useState(false);
  const [payslip, setPayslip]           = useState(null); // { employee, payroll }

  const [employeeForm, setEmployeeForm] = useState({
    name: '', position: '', baseSalary: '', startDate: ''
  });
  const [attendanceData, setAttendanceData] = useState({});
  const [adjustmentForm, setAdjustmentForm] = useState({
    employeeId: '', type: 'Bonus', amount: '', note: ''
  });

  // Firestore listener with error handler
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        setEmployees(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error('HRManager Firestore error:', error);
        toast.error('خطأ في تحميل بيانات الموظفين.');
      }
    );
    return () => unsub();
  }, []);

  // ── Add Employee ────────────────────────────────────────────────────────────
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const error = validateEmployee(employeeForm);
    if (error) return toast.error(error);

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'employees'), {
        name:       employeeForm.name.trim(),
        position:   employeeForm.position.trim(),
        baseSalary: parseFloat(employeeForm.baseSalary),
        startDate:  employeeForm.startDate,
        createdAt:  serverTimestamp(),
      });
      toast.success('تمت إضافة الموظف بنجاح');
      setEmployeeForm({ name: '', position: '', baseSalary: '', startDate: '' });
    } catch {
      toast.error('خطأ في إضافة الموظف. حاول مجدداً.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Record Attendance (with duplicate guard) ────────────────────────────────
  const handleRecordAttendance = async () => {
    const empIds = Object.keys(attendanceData);
    if (empIds.length === 0) return toast.error('لا توجد بيانات حضور لحفظها.');

    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Check for existing records today
      const duplicateChecks = await Promise.all(
        empIds.map(empId =>
          getDocs(query(
            collection(db, 'attendance'),
            where('date', '==', today),
            where('employeeId', '==', empId)
          ))
        )
      );

      const duplicates = duplicateChecks
        .map((snap, i) => (!snap.empty ? employees.find(e => e.id === empIds[i])?.name : null))
        .filter(Boolean);

      if (duplicates.length > 0) {
        return toast.error(`الحضور مسجل مسبقاً لهذا اليوم: ${duplicates.join(', ')}`);
      }

      // Validate overtime values before writing
      for (const empId of empIds) {
        const ot = parseFloat(attendanceData[empId]?.overtime || 0);
        if (ot > MAX_OVERTIME_HOURS) {
          return toast.error(`ساعات العمل الإضافية تتجاوز الحد القانوني (${MAX_OVERTIME_HOURS} ساعة شهرياً).`);
        }
      }

      // Write all records in a batch
      const batch = writeBatch(db);
      empIds.forEach(empId => {
        const record = attendanceData[empId];
        const ref    = doc(collection(db, 'attendance'));
        batch.set(ref, {
          employeeId: empId,
          date:       today,
          status:     record.status || 'Present',
          overtime:   parseFloat(record.overtime || 0),
          createdAt:  serverTimestamp(),
        });
      });
      await batch.commit();

      toast.success('تم تسجيل الحضور بنجاح');
      setAttendanceData({});
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error('خطأ في تسجيل الحضور. حاول مجدداً.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Add Adjustment ──────────────────────────────────────────────────────────
  const handleAddAdjustment = async (e) => {
    e.preventDefault();
    const error = validateAdjustment(adjustmentForm);
    if (error) return toast.error(error);

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'employee_adjustments'), {
        employeeId: adjustmentForm.employeeId,
        type:       adjustmentForm.type,
        amount:     parseFloat(adjustmentForm.amount),
        note:       adjustmentForm.note.trim(),
        date:       new Date().toISOString().split('T')[0],
        createdAt:  serverTimestamp(),
      });
      toast.success('تم تسجيل العملية بنجاح');
      setAdjustmentForm({ employeeId: '', type: 'Bonus', amount: '', note: '' });
    } catch {
      toast.error('خطأ في التسجيل. حاول مجدداً.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Generate Payslip ────────────────────────────────────────────────────────
  const handleGeneratePayroll = useCallback(async (employee) => {
    // Query this month's adjustments for the employee
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    let bonuses  = 0;
    let advances = 0;
    let overtimeHours = 0;

    try {
      const [adjSnap, attSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'employee_adjustments'),
          where('employeeId', '==', employee.id),
          where('date', '>=', monthStartStr)
        )),
        getDocs(query(
          collection(db, 'attendance'),
          where('employeeId', '==', employee.id),
          where('date', '>=', monthStartStr)
        )),
      ]);

      adjSnap.forEach(d => {
        const adj = d.data();
        if (adj.type === 'Bonus')   bonuses  += adj.amount || 0;
        if (adj.type === 'Advance') advances += adj.amount || 0;
      });

      attSnap.forEach(d => {
        overtimeHours += parseFloat(d.data().overtime || 0);
      });
    } catch (error) {
      console.error('Payroll query error:', error);
      toast.error('خطأ في قراءة بيانات الراتب.');
      return;
    }

    const payroll = calcPayroll({
      baseSalary: employee.baseSalary,
      overtimeHours,
      bonuses,
      advances,
    });

    // Record payroll disbursement in dedicated collection (not sales_transactions)
    try {
      await addDoc(collection(db, 'payroll_transactions'), {
        employeeId:   employee.id,
        employeeName: employee.name,
        month:        monthStartStr,
        ...payroll,
        createdAt:    serverTimestamp(),
        status:       'paid',
      });
    } catch (error) {
      console.error('Payroll record error:', error);
      toast.error('خطأ في تسجيل صرف الراتب.');
      return;
    }

    setPayslip({ employee, payroll });
    toast.success(`تم إنشاء فيش الراتب لـ ${employee.name}`);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  const inputCls = "bg-slate-900 border border-slate-800 p-3 rounded-xl text-sm outline-none focus:border-red-500 text-white placeholder-slate-600 w-full";

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
      <Toaster position="top-right" />

      {/* Payslip Modal */}
      {payslip && (
        <PayslipModal
          employee={payslip.employee}
          payroll={payslip.payroll}
          onClose={() => setPayslip(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="p-2 bg-red-600 rounded-xl"><FiUsers /></span>
          إدارة الموارد البشرية (HR)
        </h2>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[['Records', 'الموظفين'], ['Attendance', 'الحضور'], ['Payroll', 'الرواتب']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${tab === key ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legal notice */}
      <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl px-5 py-4 mb-8 text-sm text-blue-400">
        <FiAlertCircle className="flex-shrink-0 mt-0.5" />
        <span>
          الرواتب تُحسب وفق الإطار القانوني التونسي: CNSS {(CNSS_EMPLOYEE_RATE * 100).toFixed(2)}% + IRPP بالسلم التصاعدي.
          الحد الأدنى للأجور: {SMIG_MONTHLY} TND.
        </span>
      </div>

      {/* Tab: Records */}
      {tab === 'Records' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
            <input
              type="text"
              placeholder="الاسم الكامل *"
              value={employeeForm.name}
              onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="المنصب *"
              value={employeeForm.position}
              onChange={e => setEmployeeForm({ ...employeeForm, position: e.target.value })}
              className={inputCls}
            />
            <input
              type="number"
              placeholder={`الشهرية (min ${SMIG_MONTHLY} TND) *`}
              min={SMIG_MONTHLY}
              max={50000}
              value={employeeForm.baseSalary}
              onChange={e => setEmployeeForm({ ...employeeForm, baseSalary: e.target.value })}
              className={inputCls}
            />
            <input
              type="date"
              placeholder="تاريخ الانتداب *"
              value={employeeForm.startDate}
              onChange={e => setEmployeeForm({ ...employeeForm, startDate: e.target.value })}
              className={inputCls}
            />
            <button
              type="submit"
              disabled={isSaving}
              className="lg:col-span-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all"
            >
              <FiUserPlus /> إضافة موظف
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map(emp => (
              <div key={emp.id} className="p-6 bg-slate-950/30 border border-slate-800 rounded-3xl hover:border-red-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center font-black text-xl">
                    {emp.name?.charAt(0) ?? '?'}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{emp.position}</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-1">{emp.name}</h4>
                <p className="text-2xl font-black text-red-500">
                  {typeof emp.baseSalary === 'number' ? emp.baseSalary.toFixed(3) : '—'}
                  <span className="text-xs text-slate-500 ml-1">TND</span>
                </p>
                <p className="text-xs text-slate-600 mt-1">Depuis: {emp.startDate || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Attendance */}
      {tab === 'Attendance' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
          <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FiClock /> تسجيل حضور اليوم: {new Date().toLocaleDateString('fr-TN')}
            </h3>
            <button
              onClick={handleRecordAttendance}
              disabled={isSaving || Object.keys(attendanceData).length === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ السجل'}
            </button>
          </div>

          {employees.length === 0 ? (
            <p className="text-center text-slate-600 py-8">لا يوجد موظفون مسجلون بعد.</p>
          ) : (
            <div className="space-y-3">
              {employees.map(emp => (
                <div key={emp.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-slate-300">{emp.name}</span>
                  <div className="flex items-center gap-4">
                    <select
                      onChange={e => setAttendanceData({
                        ...attendanceData,
                        [emp.id]: { ...attendanceData[emp.id], status: e.target.value }
                      })}
                      className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs outline-none text-white"
                    >
                      <option value="Present">حاضر (Present)</option>
                      <option value="Absent">غائب (Absent)</option>
                      <option value="Late">متأخر (Late)</option>
                    </select>
                    <div className="flex items-center gap-2 bg-slate-900 p-1 px-3 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Extra Hrs</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        max={MAX_OVERTIME_HOURS}
                        step="0.5"
                        className="bg-transparent w-12 text-xs text-center outline-none text-red-500 font-bold"
                        onChange={e => setAttendanceData({
                          ...attendanceData,
                          [emp.id]: { ...attendanceData[emp.id], overtime: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Payroll */}
      {tab === 'Payroll' && (
        <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
          {/* Adjustment form */}
          <form onSubmit={handleAddAdjustment} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-blue-600/5 border border-blue-500/20 rounded-3xl">
            <select
              value={adjustmentForm.employeeId}
              onChange={e => setAdjustmentForm({ ...adjustmentForm, employeeId: e.target.value })}
              className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none text-white"
            >
              <option value="">اختر الموظف *</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <select
              value={adjustmentForm.type}
              onChange={e => setAdjustmentForm({ ...adjustmentForm, type: e.target.value })}
              className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none text-white"
            >
              <option value="Bonus">منحة (Prime)</option>
              <option value="Advance">تسليفة (Avance)</option>
            </select>
            <input
              type="number"
              placeholder="المبلغ (TND) *"
              min="1"
              value={adjustmentForm.amount}
              onChange={e => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
              className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none text-white placeholder-slate-600"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
            >
              تسجيل العملية
            </button>
          </form>

          {/* Payroll table */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <tr>
                  <th className="p-5">الموظف</th>
                  <th className="p-5">الراتب القار</th>
                  <th className="p-5">CNSS ({(CNSS_EMPLOYEE_RATE * 100).toFixed(2)}%)</th>
                  <th className="p-5">الصافي التقديري</th>
                  <th className="p-5 text-right">فيش الراتب</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-600 text-sm">
                      لا يوجد موظفون مسجلون بعد.
                    </td>
                  </tr>
                ) : employees.map(emp => {
                  const est = calcPayroll({ baseSalary: emp.baseSalary ?? 0 });
                  return (
                    <tr key={emp.id} className="border-t border-slate-900 hover:bg-slate-900/30 transition-all">
                      <td className="p-5 font-bold text-white">{emp.name}</td>
                      <td className="p-5 text-slate-400 font-mono">
                        {typeof emp.baseSalary === 'number' ? emp.baseSalary.toFixed(3) : '—'} TND
                      </td>
                      <td className="p-5 text-red-400 font-mono">{est.cnssEmployee.toFixed(3)} TND</td>
                      <td className="p-5 text-green-400 font-mono">{est.netSalary.toFixed(3)} TND</td>
                      <td className="p-5 text-right">
                        <button
                          onClick={() => handleGeneratePayroll(emp)}
                          className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg text-slate-400 hover:text-white transition-all"
                          title="إنشاء فيش الراتب"
                        >
                          <FiPrinter size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRManager;
