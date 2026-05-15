
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, where, doc, runTransaction, getDocs } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';
import { FiUsers, FiUserPlus, FiClock, FiDollarSign, FiFileText, FiPrinter, FiPlus, FiMinus } from 'react-icons/fi';

const HRManager = () => {
    const [employees, setEmployees] = useState([]);
    const [tab, setTab] = useState('Records'); // Records, Attendance, Payroll
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [employeeForm, setEmployeeForm] = useState({ name: '', position: '', baseSalary: '', startDate: '' });
    const [attendanceData, setAttendanceData] = useState({}); // { employeeId: { status, overtime } }
    const [adjustmentForm, setAdjustmentForm] = useState({ employeeId: '', type: 'Bonus', amount: '', note: '' });

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'employees'), (snapshot) => {
            setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!employeeForm.name || !employeeForm.baseSalary) return toast.error("أكمل بيانات الموظف");
        try {
            await addDoc(collection(db, 'employees'), {
                ...employeeForm,
                baseSalary: parseFloat(employeeForm.baseSalary),
                createdAt: serverTimestamp()
            });
            toast.success("تمت إضافة الموظف بنجاح");
            setEmployeeForm({ name: '', position: '', baseSalary: '', startDate: '' });
        } catch (error) {
            toast.error("خطأ في الإضافة");
        }
    };

    const handleRecordAttendance = async () => {
        setIsSaving(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            await runTransaction(db, async (transaction) => {
                for (const empId in attendanceData) {
                    const record = attendanceData[empId];
                    const attendanceRef = doc(collection(db, 'attendance'));
                    transaction.set(attendanceRef, {
                        employeeId: empId,
                        date: today,
                        status: record.status || 'Present',
                        overtime: parseFloat(record.overtime || 0),
                        createdAt: serverTimestamp()
                    });
                }
            });
            toast.success("تم تسجيل الحضور لليوم");
            setAttendanceData({});
        } catch (error) {
            toast.error("خطأ في تسجيل الحضور");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddAdjustment = async (e) => {
        e.preventDefault();
        if (!adjustmentForm.employeeId || !adjustmentForm.amount) return toast.error("أكمل بيانات المنحة/التسليفة");
        try {
            await addDoc(collection(db, 'employee_adjustments'), {
                ...adjustmentForm,
                amount: parseFloat(adjustmentForm.amount),
                date: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });
            toast.success("تم تسجيل العملية");
            setAdjustmentForm({ employeeId: '', type: 'Bonus', amount: '', note: '' });
        } catch (error) {
            toast.error("خطأ في التسجيل");
        }
    };

    const generatePayroll = async (employee) => {
        // This is a simplified logic for demo. In real app, we'd query attendance and adjustments for the month.
        const printContent = `
            Fiche de Paie - CINQD
            --------------------
            Employé: ${employee.name}
            Poste: ${employee.position}
            Mois: ${new Date().toLocaleString('default', { month: 'long' })}
            
            Salaire de Base: ${employee.baseSalary.toFixed(2)} TND
            Primes: 0.00 TND (Calcul auto à venir)
            Avances: 0.00 TND
            Retards/Absences: 0.00 TND
            
            NET À PAYER: ${employee.baseSalary.toFixed(2)} TND
        `;
        
        // Link to Finance Module (Expense)
        try {
            await addDoc(collection(db, 'sales_transactions'), {
                amount: -employee.baseSalary,
                source: `Salaire: ${employee.name}`,
                caisse: 'caisse_directe',
                type: 'expense',
                createdAt: serverTimestamp(),
                status: 'completed'
            });
            toast.success(`تم صرف الراتب لـ ${employee.name} وتسجيل المصروف`);
            alert(printContent); // Demo "PDF"
        } catch (error) {
            toast.error("خطأ في معالجة الراتب مالياً");
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
            <Toaster position="top-right" />
            
            <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <span className="p-2 bg-red-600 rounded-xl"><FiUsers/></span>
                    إدارة الموارد البشرية (HR)
                </h2>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button onClick={() => setTab('Records')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${tab === 'Records' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>الموظفين</button>
                    <button onClick={() => setTab('Attendance')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${tab === 'Attendance' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>الحضور</button>
                    <button onClick={() => setTab('Payroll')} className={`px-6 py-2 rounded-lg font-bold text-xs transition-all ${tab === 'Payroll' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>الرواتب</button>
                </div>
            </div>

            {tab === 'Records' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
                        <input type="text" placeholder="الاسم" value={employeeForm.name} onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})} className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-sm outline-none focus:border-red-500"/>
                        <input type="text" placeholder="المنصب" value={employeeForm.position} onChange={e => setEmployeeForm({...employeeForm, position: e.target.value})} className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-sm outline-none"/>
                        <input type="number" placeholder="الشهرية القارة" value={employeeForm.baseSalary} onChange={e => setEmployeeForm({...employeeForm, baseSalary: e.target.value})} className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-sm outline-none"/>
                        <button className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"><FiUserPlus/> إضافة موظف</button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {employees.map(emp => (
                            <div key={emp.id} className="p-6 bg-slate-950/30 border border-slate-800 rounded-3xl hover:border-red-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center font-black text-xl">{emp.name.charAt(0)}</div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{emp.position}</span>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">{emp.name}</h4>
                                <p className="text-2xl font-black text-red-500">{emp.baseSalary.toFixed(2)} <span className="text-xs text-slate-500">TND</span></p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'Attendance' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <h3 className="font-bold text-white flex items-center gap-2"><FiClock/> تسجيل حضور اليوم: {new Date().toLocaleDateString()}</h3>
                        <button onClick={handleRecordAttendance} disabled={isSaving} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs transition-all">حفظ السجل</button>
                    </div>
                    <div className="space-y-3">
                        {employees.map(emp => (
                            <div key={emp.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-between">
                                <span className="font-bold text-slate-300">{emp.name}</span>
                                <div className="flex items-center gap-4">
                                    <select 
                                        onChange={e => setAttendanceData({...attendanceData, [emp.id]: {...attendanceData[emp.id], status: e.target.value}})}
                                        className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs outline-none"
                                    >
                                        <option value="Present">Present (حاضر)</option>
                                        <option value="Absent">Absent (غائب)</option>
                                        <option value="Late">Late (متأخر)</option>
                                    </select>
                                    <div className="flex items-center gap-2 bg-slate-900 p-1 px-3 rounded-lg border border-slate-800">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Extra Hrs</span>
                                        <input 
                                            type="number" 
                                            placeholder="0" 
                                            className="bg-transparent w-10 text-xs text-center outline-none text-red-500 font-bold"
                                            onChange={e => setAttendanceData({...attendanceData, [emp.id]: {...attendanceData[emp.id], overtime: e.target.value}})}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'Payroll' && (
                <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
                    <form onSubmit={handleAddAdjustment} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-blue-600/5 border border-blue-500/20 rounded-3xl">
                        <select value={adjustmentForm.employeeId} onChange={e => setAdjustmentForm({...adjustmentForm, employeeId: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none">
                            <option value="">اختر الموظف</option>
                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                        <select value={adjustmentForm.type} onChange={e => setAdjustmentForm({...adjustmentForm, type: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none">
                            <option value="Bonus">Prime (منحة)</option>
                            <option value="Advance">Avance (تسليفة)</option>
                        </select>
                        <input type="number" placeholder="المبلغ" value={adjustmentForm.amount} onChange={e => setAdjustmentForm({...adjustmentForm, amount: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs outline-none"/>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all">تسجيل العملية</button>
                    </form>

                    <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                                <tr>
                                    <th className="p-5">الموظف</th>
                                    <th className="p-5">الراتب القار</th>
                                    <th className="p-5">الحالة المالية</th>
                                    <th className="p-5 text-right">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} className="border-t border-slate-900 hover:bg-slate-900/30 transition-all">
                                        <td className="p-5 font-bold text-white">{emp.name}</td>
                                        <td className="p-5 text-slate-400 font-mono">{emp.baseSalary.toFixed(2)} TND</td>
                                        <td className="p-5">
                                            <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase">En Règle</span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <button onClick={() => generatePayroll(emp)} className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg text-slate-400 hover:text-white transition-all">
                                                <FiPrinter size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRManager;
