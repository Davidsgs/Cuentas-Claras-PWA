import {
  createIcons,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  CornerUpLeft,
  Download,
  File as FileIcon,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Info,
  Moon,
  Pencil,
  Plus,
  PlusCircle,
  Receipt,
  RotateCcw,
  Settings,
  Share2,
  Sun,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide';

// Solo los iconos que usa la app: importar el set completo son ~600 KB.
const usedIcons = {
  AlertTriangle, ArrowLeft, ArrowRight, Calculator, Check, CheckCircle2,
  CornerUpLeft, Download, File: FileIcon, FileText, Folder, FolderPlus,
  Image: ImageIcon,
  Info, Moon, Pencil, Plus, PlusCircle, Receipt, RotateCcw, Settings, Share2,
  Sun, Trash2, Upload, User, X,
};

// Mismo shim que exponía el CDN, para no tocar las llamadas de abajo.
const lucide = { createIcons: () => createIcons({ icons: usedIcons }) };

const defaultCategories = [
    { id: 1, name: 'General', emoji: '📝' },
    { id: 2, name: 'Comida', emoji: '🍕' },
    { id: 3, name: 'Transporte', emoji: '🚕' },
    { id: 4, name: 'Hospedaje', emoji: '🏨' },
    { id: 5, name: 'Ocio', emoji: '🎉' }
];

const defaultColors = {
    light: { primary: '#4F46E5', secondary: '#10B981', base: '#F9FAFB', surface: '#FFFFFF' },
    dark:  { primary: '#4F46E5', secondary: '#10B981', base: '#111827', surface: '#1F2937' }
};

const colorLabels = {
    primary:   ['Primario', 'Botones, enlaces y acentos'],
    secondary: ['Secundario', 'Verde de saldado y confirmaciones'],
    base:      ['Fondo', 'Color de la pantalla'],
    surface:   ['Tarjetas', 'Cabeceras, tarjetas y hojas']
};

// Mezclado contra los valores de fábrica: un guardado viejo o a medias no puede
// dejar una variable CSS sin definir.
const loadColors = () => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('cc_colors')) || {}; } catch (e) { saved = {}; }
    return {
        light: { ...defaultColors.light, ...(saved.light || {}) },
        dark:  { ...defaultColors.dark,  ...(saved.dark  || {}) }
    };
};

const store = {
    accounts: JSON.parse(localStorage.getItem('cc_accounts')) || [],
    categories: JSON.parse(localStorage.getItem('cc_categories')) || defaultCategories,
    folders: JSON.parse(localStorage.getItem('cc_folders')) || [],
    colors: loadColors(),
    theme: localStorage.getItem('cc_theme') || 'dark', 
    currentAccountId: null,
    currentFolderId: null,
    editingExpenseId: null,
    // null = fuera del modo selección; Set de ids de cuenta cuando está activo.
    selection: null
};

const utils = {
    save: () => {
        localStorage.setItem('cc_accounts', JSON.stringify(store.accounts));
        localStorage.setItem('cc_categories', JSON.stringify(store.categories));
        localStorage.setItem('cc_folders', JSON.stringify(store.folders));
        localStorage.setItem('cc_colors', JSON.stringify(store.colors));
    },
    showToast: (msg) => {
        const toast = document.getElementById('toast');
        document.getElementById('toast-msg').innerText = msg;
        toast.classList.remove('opacity-0', 'pointer-events-none');
        toast.classList.add('translate-y-2');
        setTimeout(() => {
            toast.classList.add('opacity-0', 'pointer-events-none');
            toast.classList.remove('translate-y-2');
        }, 3000);
    },
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);
    },
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        if (dateStr.includes('-') && dateStr.length === 10) {
            const parts = dateStr.split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return new Date(dateStr).toLocaleDateString();
    },
    generateId: () => Date.now().toString(36) + Math.random().toString(36).slice(2),
    // '#4F46E5' -> '79 70 229'. Canales sueltos porque Tailwind mete la
    // opacidad aparte: rgb(var(--c-primary) / 0.3).
    hexToRgb: (hex) => {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
    }
};

const app = {
    init: () => {
        // Un long-press o un drop cambian el estado y re-renderizan durante el
        // pointerup, así que el click que viene detrás llega cuando la tarjeta
        // original ya no existe: no burbujea hasta document y no se lo puede
        // parar ahí. El guard es temporal y se arma desde document, que sí
        // sobrevive al re-render; cada tarjeta ignora el click si acaba de
        // terminar un gesto. 300 ms: el click sigue al pointerup en menos de un
        // frame (el retardo de 300 ms del touch no aplica, el viewport es
        // width=device-width), y si el navegador no lo emite la ventana vence
        // sola sin comerse nada.
        document.addEventListener('pointerup', app.armGestureGuard, true);
        document.addEventListener('pointercancel', app.armGestureGuard, true);
        app.applyTheme();
        app.renderHome();
        lucide.createIcons();
    },

    _pendingGesture: false,
    _gestureAt: 0,
    armGestureGuard: () => {
        if (!app._pendingGesture) return;
        app._pendingGesture = false;
        app._gestureAt = Date.now();
    },
    justGestured: () => Date.now() - app._gestureAt < 300,

    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        window.scrollTo(0, 0);
        if (viewId === 'categories') app.renderCategories();
        if (viewId === 'settings') app.renderSettings();
        if (viewId === 'home') { store.selection = null; app.renderHome(); }
    },

    filterAccounts: (type) => { if (type === 'all') app.exitFolder(); },

    toggleTheme: () => {
        store.theme = store.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('cc_theme', store.theme);
        app.applyTheme();
    },
    applyTheme: () => {
        document.documentElement.classList.toggle('dark', store.theme === 'dark');
        app.applyColors();
    },

    applyColors: () => {
        const palette = store.colors[store.theme] || defaultColors[store.theme];
        Object.entries(palette).forEach(([key, hex]) => {
            const rgb = utils.hexToRgb(hex);
            if (rgb) document.documentElement.style.setProperty(`--c-${key}`, rgb);
        });
    },

    // --- CONFIRMATION ---
    confirmAction: (message, callback, okLabel) => {
        const modal = document.getElementById('modal-confirm');
        const panel = document.getElementById('modal-panel');
        const btnYes = document.getElementById('modal-btn-yes');
        document.getElementById('modal-msg').innerText = message;
        
        const newBtn = btnYes.cloneNode(true);
        btnYes.parentNode.replaceChild(newBtn, btnYes);
        newBtn.innerText = okLabel || 'Eliminar';
        newBtn.onclick = () => { callback(); app.closeConfirm(); };

        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('scale-95'); panel.classList.add('scale-100'); }, 10);
    },
    closeConfirm: () => {
        const modal = document.getElementById('modal-confirm');
        const panel = document.getElementById('modal-panel');
        modal.classList.add('opacity-0');
        panel.classList.remove('scale-100'); panel.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },

    // --- HELPERS DE CALCULO ---
    getDebts: (acc) => {
        if (!acc || !acc.participants.length || !acc.expenses.length) {
            return { transactions: [], share: 0, total: 0, totalGroup: 0 };
        }

        const balances = {};
        acc.participants.forEach(p => balances[p.name] = 0);

        let total = 0;
        let totalGroupExpenses = 0;

        acc.expenses.forEach(e => {
            const amount = Number(e.amount);
            total += amount;
            
            balances[e.payer] = (balances[e.payer] || 0) + amount;

            if (e.type === 'individual') {
                if(balances[e.beneficiary] !== undefined) {
                    balances[e.beneficiary] -= amount;
                }
            } else {
                totalGroupExpenses += amount;
                const split = amount / acc.participants.length;
                acc.participants.forEach(p => {
                    balances[p.name] -= split;
                });
            }
        });

        if (acc.payments) {
            acc.payments.forEach(p => {
                if (balances[p.from] !== undefined) balances[p.from] += Number(p.amount);
                if (balances[p.to] !== undefined) balances[p.to] -= Number(p.amount);
            });
        }

        let debtors = [];
        let creditors = [];
        for (const [name, amount] of Object.entries(balances)) {
            if (amount < -0.01) debtors.push({ name, amount: Math.abs(amount) });
            else if (amount > 0.01) creditors.push({ name, amount });
        }
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const transactions = [];
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            let amount = Math.min(debtors[i].amount, creditors[j].amount);
            if (amount > 0.01) {
                transactions.push({ from: debtors[i].name, to: creditors[j].name, amount });
            }
            debtors[i].amount -= amount;
            creditors[j].amount -= amount;
            if (debtors[i].amount < 0.01) i++;
            if (creditors[j].amount < 0.01) j++;
        }
        
        const share = acc.participants.length > 0 ? totalGroupExpenses / acc.participants.length : 0;
        
        // Ahora devolvemos también el totalGroupExpenses
        return { transactions, share, total, totalGroup: totalGroupExpenses };
    },

    isAccountSettled: (acc) => {
        if (!acc.expenses || acc.expenses.length === 0) return false;
        if (!acc.participants || acc.participants.length === 0) return false;

        const balances = {};
        acc.participants.forEach(p => balances[p.name] = 0);

        acc.expenses.forEach(e => {
            const amount = Number(e.amount);
            balances[e.payer] = (balances[e.payer] || 0) + amount;
            
            if (e.type === 'individual') {
                if(balances[e.beneficiary] !== undefined) balances[e.beneficiary] -= amount;
            } else {
                const split = amount / acc.participants.length;
                acc.participants.forEach(p => balances[p.name] -= split);
            }
        });

        if (acc.payments) {
            acc.payments.forEach(p => {
                if (balances[p.from] !== undefined) balances[p.from] += Number(p.amount);
                if (balances[p.to] !== undefined) balances[p.to] -= Number(p.amount);
            });
        }
        return Object.values(balances).every(b => Math.abs(b) < 1.0);
    },

    // --- EXPORT LOGIC ---
    showExportModal: () => {
        const modal = document.getElementById('modal-export');
        const panel = document.getElementById('modal-export-panel');
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('translate-y-full'); }, 10);
    },
    closeExportModal: () => {
        const modal = document.getElementById('modal-export');
        const panel = document.getElementById('modal-export-panel');
        modal.classList.add('opacity-0'); panel.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    exportText: async () => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;
        
        const { transactions, total, totalGroup } = app.getDebts(acc);
        const groupExpenses = acc.expenses.filter(e => e.type !== 'individual');
        const personalExpenses = acc.expenses.filter(e => e.type === 'individual');

        let text = `📋 *${acc.name}*\n`;
        if(acc.eventDate) text += `📅 Evento: ${utils.formatDate(acc.eventDate)}\n`;
        
        text += `💰 Gasto Grupal: ${utils.formatCurrency(totalGroup)}\n`;
        text += `💵 Total General (con personales): ${utils.formatCurrency(total)}\n\n`;
        
        text += `👥 *Participantes:*\n`;
        acc.participants.forEach(p => text += `- ${p.name}\n`);
        
        // GASTOS GRUPALES
        if (groupExpenses.length > 0) {
            text += `\n🧾 *Gastos Grupales:*\n`;
            groupExpenses.forEach(e => {
                const dateStr = e.userDate ? ` [${utils.formatDate(e.userDate)}]` : '';
                text += `- ${e.desc}: ${utils.formatCurrency(e.amount)} (Pagó ${e.payer})${dateStr}\n`;
            });
        }

        // GASTOS PERSONALES (SECCIÓN NUEVA)
        if (personalExpenses.length > 0) {
            text += `\n👤 *Gastos Personales:*\n`;
            personalExpenses.forEach(e => {
                const dateStr = e.userDate ? ` [${utils.formatDate(e.userDate)}]` : '';
                // Formato: Pagó A -> para B
                text += `- ${e.desc}: ${utils.formatCurrency(e.amount)} (Pagó ${e.payer} -> para ${e.beneficiary})${dateStr}\n`;
            });
        }
        
        if (acc.payments && acc.payments.length > 0) {
            text += `\n💸 *Pagos ya realizados:*\n`;
            acc.payments.forEach(p => text += `- ${p.from} -> ${p.to}: ${utils.formatCurrency(p.amount)}\n`);
        }

        text += `\n⚖️ *División Sugerida (Quién le debe a quién):*\n`;
        if (transactions.length === 0) {
            text += `✅ ¡Cuentas saldadas! Nadie debe nada.\n`;
        } else {
            transactions.forEach(t => text += `👉 ${t.from} paga a ${t.to}: ${utils.formatCurrency(t.amount)}\n`);
        }

        try {
            await navigator.clipboard.writeText(text);
            utils.showToast("Copiado al portapapeles");
        } catch (err) {
            console.error("Error al copiar", err);
        }

        if (navigator.share) {
            navigator.share({ title: acc.name, text: text }).catch(console.error);
        }
        
        app.closeExportModal();
    },

    exportImage: async () => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;
        
        const { transactions, total, totalGroup } = app.getDebts(acc);
        const groupExpenses = acc.expenses.filter(e => e.type !== 'individual');
        const personalExpenses = acc.expenses.filter(e => e.type === 'individual');

        utils.showToast("Generando imagen...");
        const el = document.createElement('div');
        el.style.width = '600px';
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#1f2937';
        el.style.padding = '40px';
        el.style.fontFamily = 'sans-serif';
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        el.style.zIndex = '-100';
        
        let html = `<h1 style="font-size: 32px; font-weight: bold; color: #4F46E5; margin-bottom: 8px;">${acc.name}</h1>`;
        html += `<div style="color: #6b7280; margin-bottom: 24px; font-size:14px;">
                    <span>Resumen de gastos</span>
                 </div>`;
        if(acc.eventDate) {
            html += `<p style="color: #4F46E5; font-weight:bold; margin-bottom: 20px;">📅 Fecha del evento: ${utils.formatDate(acc.eventDate)}</p>`;
        }
        
        html += `<div style="background: #e0e7ff; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
            <div style="margin-bottom: 10px;">
                <p style="font-size: 14px; color: #4338ca; font-weight: bold; margin: 0;">GASTO GRUPAL</p>
                <p style="font-size: 36px; font-weight: bold; color: #312e81; margin: 0;">${utils.formatCurrency(totalGroup)}</p>
            </div>
            <div style="border-top: 1px solid #c7d2fe; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; color: #4338ca;">Total General (con personales):</span>
                <span style="font-size: 18px; font-weight: bold; color: #312e81;">${utils.formatCurrency(total)}</span>
            </div>
        </div>`;
        
        html += `<div style="margin-bottom: 24px;"><p style="font-weight:bold; margin-bottom:5px;">Participantes:</p><p style="color:#4b5563;">${acc.participants.map(p => p.name).join(', ')}</p></div>`;

        // SECCIÓN GASTOS GRUPALES
        if (groupExpenses.length > 0) {
            html += `<h3 style="font-size: 18px; font-weight: bold; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 16px;">Gastos Grupales</h3>`;
            groupExpenses.forEach(e => {
                const dateStr = e.userDate ? `<span style="font-size:12px; color:#9ca3af; margin-left:8px;">${utils.formatDate(e.userDate)}</span>` : '';
                html += `<div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 16px;">
                    <div><span style="font-weight: bold;">${e.desc}</span> <span style="font-size: 14px; color: #6b7280;">(Pagó ${e.payer})</span> ${dateStr}</div>
                    <div style="font-weight: bold;">${utils.formatCurrency(e.amount)}</div>
                </div>`;
            });
        }

        // SECCIÓN GASTOS PERSONALES
        if (personalExpenses.length > 0) {
            html += `<h3 style="font-size: 18px; font-weight: bold; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 16px; margin-top: 24px; color: #d97706;">Gastos Personales</h3>`;
            personalExpenses.forEach(e => {
                const dateStr = e.userDate ? `<span style="font-size:12px; color:#9ca3af; margin-left:8px;">${utils.formatDate(e.userDate)}</span>` : '';
                // Formato: Pagó A -> para B
                const details = `<span style="font-size: 14px; color: #d97706;">(Pagó ${e.payer} &rarr; para ${e.beneficiary})</span>`;
                
                html += `<div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 16px;">
                    <div><span style="font-weight: bold;">${e.desc}</span> ${details} ${dateStr}</div>
                    <div style="font-weight: bold; color: #d97706;">${utils.formatCurrency(e.amount)}</div>
                </div>`;
            });
        }

        html += `<h3 style="font-size: 18px; font-weight: bold; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 16px; margin-top: 30px; color: #dc2626;">División (A Pagar)</h3>`;
        if (transactions.length === 0) {
            html += `<p style="color: #059669; font-weight: bold;">✅ Cuentas Saldadas</p>`;
        } else {
            transactions.forEach(t => {
                html += `<div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 16px;">
                    <div>${t.from} <span style="color:#9ca3af">➡</span> ${t.to}</div>
                    <div style="font-weight: bold; color: #dc2626;">${utils.formatCurrency(t.amount)}</div>
                </div>`;
            });
        }

        el.innerHTML = html;
        document.body.appendChild(el);
        
        await document.fonts.ready;

        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(el, { scale: 2 });
        document.body.removeChild(el);
        
        const link = document.createElement('a');
        link.download = `Resumen-${acc.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        app.closeExportModal();
    },

    exportPDF: async () => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;
        
        const { transactions, total, totalGroup } = app.getDebts(acc);
        const groupExpenses = acc.expenses.filter(e => e.type !== 'individual');
        const personalExpenses = acc.expenses.filter(e => e.type === 'individual');

        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        let y = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229); 
        doc.text(acc.name, 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        let subTitle = acc.eventDate ? `Evento: ${utils.formatDate(acc.eventDate)}` : 'Resumen de gastos';
        doc.text(subTitle, 20, y);
        y += 15;
        
        // Desglose de totales
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y, 170, 35, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(60);
        doc.text("Gasto Grupal", 30, y + 10);
        
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(utils.formatCurrency(totalGroup), 30, y + 20);
        
        doc.setDrawColor(200);
        doc.line(30, y+25, 180, y+25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text("Total General (con personales):", 30, y + 31);
        
        doc.setFont("helvetica", "bold");
        doc.text(utils.formatCurrency(total), 140, y + 31);

        y += 45;

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("Participantes:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        const participantsStr = acc.participants.map(p => p.name).join(', ');
        const splitText = doc.splitTextToSize(participantsStr, 170);
        doc.text(splitText, 55, y);
        y += (splitText.length * 7) + 10;

        // --- GASTOS GRUPALES PDF ---
        if (groupExpenses.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("Gastos Grupales", 20, y);
            doc.setDrawColor(200);
            doc.line(20, y+2, 190, y+2);
            y += 15;
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            
            groupExpenses.forEach(e => {
                if (y > 270) { doc.addPage(); y = 20; }
                let itemText = `${e.desc} (Pagó ${e.payer})`;
                if(e.userDate) itemText += ` [${utils.formatDate(e.userDate)}]`;
                
                doc.text(itemText, 20, y);
                const amountStr = utils.formatCurrency(e.amount);
                const width = doc.getTextWidth(amountStr);
                doc.text(amountStr, 190 - width, y);
                y += 10;
            });
            y += 5;
        }

        // --- GASTOS PERSONALES PDF ---
        if (personalExpenses.length > 0) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setTextColor(200, 100, 0); // Orange
            doc.setFont("helvetica", "bold");
            doc.text("Gastos Personales", 20, y);
            doc.setDrawColor(200, 100, 0);
            doc.line(20, y+2, 190, y+2);
            y += 15;
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0); // Reset color for item names
            
            personalExpenses.forEach(e => {
                if (y > 270) { doc.addPage(); y = 20; }
                // Formato: Pagó A -> para B
                let itemText = `${e.desc} (Pagó ${e.payer} -> para ${e.beneficiary})`;
                if(e.userDate) itemText += ` [${utils.formatDate(e.userDate)}]`;
                
                doc.text(itemText, 20, y);
                const amountStr = utils.formatCurrency(e.amount);
                const width = doc.getTextWidth(amountStr);
                doc.text(amountStr, 190 - width, y);
                y += 10;
            });
            y += 5;
        }

        y += 5;
        if (y > 250) { doc.addPage(); y = 20; }
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("División Sugerida (A Pagar)", 20, y);
        doc.setDrawColor(220, 38, 38);
        doc.line(20, y+2, 190, y+2);
        y += 15;

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");

        if (transactions.length === 0) {
            doc.setTextColor(5, 150, 105);
            doc.text("✅ Todas las cuentas están saldadas.", 20, y);
        } else {
            transactions.forEach(t => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.text(`${t.from}`, 20, y);
                doc.setTextColor(150);
                doc.text("pagar a ->", 70, y);
                doc.setTextColor(0);
                doc.text(`${t.to}`, 110, y);
                
                const amountStr = utils.formatCurrency(t.amount);
                const width = doc.getTextWidth(amountStr);
                doc.setFont("helvetica", "bold");
                doc.text(amountStr, 190 - width, y);
                doc.setFont("helvetica", "normal");
                y += 10;
            });
        }
        
        doc.save(`Reporte-${acc.name.replace(/\s+/g, '-')}.pdf`);
        app.closeExportModal();
    },

    // --- ACCOUNT CRUD ---
    // Mismo modal para crear y editar: store.editingAccountId decide cuál de las dos.
    saveAccount: () => {
        const name = document.getElementById('new-account-name').value;
        const catId = document.getElementById('new-account-cat').value;
        const eventDate = document.getElementById('new-account-date').value; // Nueva fecha

        if (!name.trim()) return utils.showToast('Ponle un nombre');

        if (store.editingAccountId) {
            const acc = store.accounts.find(a => a.id === store.editingAccountId);
            if (!acc) return;
            acc.name = name;
            acc.categoryId = catId;
            acc.eventDate = eventDate || null;
            utils.save();
            app.closeAddAccountModal();
            app.renderHome();
            utils.showToast('Cuenta actualizada');
            return;
        }

        const id = utils.generateId();
        store.accounts.unshift({
            id: id,
            name: name,
            categoryId: catId,
            date: new Date().toISOString(), // Fecha creación
            eventDate: eventDate || null, // Fecha evento usuario
            expenses: [],
            participants: [],
            payments: []
        });
        utils.save();
        app.closeAddAccountModal();
        utils.showToast('Cuenta creada');
        app.openAccount(id);
    },

    deleteCurrentAccount: () => {
        if (!store.currentAccountId) return;
        app.confirmAction("Se borrará toda la cuenta, gastos y participantes.", () => {
            store.accounts = store.accounts.filter(a => a.id !== store.currentAccountId);
            utils.save();
            store.currentAccountId = null;
            app.navigate('home');
            utils.showToast("Cuenta eliminada");
        });
    },

    deleteAccountFromHome: (id, event) => {
        if(event) event.stopPropagation();
        app.confirmAction("¿Borrar cuenta y todos sus datos?", () => {
            store.accounts = store.accounts.filter(a => a.id !== id);
            utils.save();
            app.renderHome();
            utils.showToast("Cuenta eliminada");
        });
    },

    // --- CARPETAS Y SELECCION ---
    accountsIn: (folderId) => store.accounts.filter(a => (a.folderId || null) === (folderId || null)),

    folderTotal: (folderId) => app.accountsIn(folderId)
        .reduce((sum, a) => sum + (a.expenses || []).reduce((t, e) => t + Number(e.amount), 0), 0),

    nextFolderName: () => {
        const taken = new Set(store.folders.map(f => f.name));
        let n = 1;
        while (taken.has(`Grupo Nro. ${n}`)) n++;
        return `Grupo Nro. ${n}`;
    },

    openFolder: (id) => { store.currentFolderId = id; store.selection = null; app.renderHome(); },
    exitFolder: () => { store.currentFolderId = null; store.selection = null; app.renderHome(); },

    renameFolder: (id, event) => {
        if (event) event.stopPropagation();
        const f = store.folders.find(x => x.id === id);
        if (!f) return;
        app.promptText('Renombrar carpeta', f.name, (name) => {
            f.name = name;
            utils.save();
            app.renderHome();
            utils.showToast('Carpeta renombrada');
        });
    },

    deleteFolder: (id, event) => {
        if (event) event.stopPropagation();
        const f = store.folders.find(x => x.id === id);
        if (!f) return;
        const n = app.accountsIn(id).length;
        const msg = n === 0
            ? `¿Borrar la carpeta "${f.name}"?`
            : `Se borrará la carpeta "${f.name}". Sus ${n} ${n === 1 ? 'cuenta vuelve' : 'cuentas vuelven'} a la lista principal.`;
        app.confirmAction(msg, () => {
            store.accounts.forEach(a => { if (a.folderId === id) a.folderId = null; });
            store.folders = store.folders.filter(x => x.id !== id);
            if (store.currentFolderId === id) store.currentFolderId = null;
            utils.save();
            app.renderHome();
            utils.showToast('Carpeta eliminada');
        });
    },

    enterSelection: (id) => {
        store.selection = new Set(id ? [id] : []);
        app.renderHome();
    },
    exitSelection: () => { store.selection = null; app.renderHome(); },

    toggleSelect: (id) => {
        if (!store.selection) return;
        if (store.selection.has(id)) store.selection.delete(id);
        else store.selection.add(id);
        app.renderHome();
    },

    toggleSelectAll: () => {
        if (!store.selection) return;
        const ids = app.accountsIn(store.currentFolderId).map(a => a.id);
        store.selection = store.selection.size === ids.length ? new Set() : new Set(ids);
        app.renderHome();
    },

    groupSelection: () => {
        if (!store.selection || store.selection.size === 0) return utils.showToast('No hay cuentas seleccionadas');
        const folder = { id: utils.generateId(), name: app.nextFolderName() };
        store.folders.push(folder);
        app.moveSelectionTo(folder.id);
    },

    moveSelectionTo: (folderId) => {
        if (!store.selection || store.selection.size === 0) return;
        const ids = store.selection;
        const n = ids.size;
        store.accounts.forEach(a => { if (ids.has(a.id)) a.folderId = folderId; });
        utils.save();
        store.selection = null;
        app.renderHome();
        const target = folderId
            ? (store.folders.find(f => f.id === folderId) || {}).name
            : 'la lista principal';
        utils.showToast(`${n} ${n === 1 ? 'cuenta movida' : 'cuentas movidas'} a ${target}`);
    },

    deleteSelection: () => {
        if (!store.selection || store.selection.size === 0) return utils.showToast('No hay cuentas seleccionadas');
        const ids = new Set(store.selection);
        const n = ids.size;
        app.confirmAction(`Se borrarán ${n} ${n === 1 ? 'cuenta' : 'cuentas'} con todos sus gastos y participantes.`, () => {
            store.accounts = store.accounts.filter(a => !ids.has(a.id));
            utils.save();
            store.selection = null;
            app.renderHome();
            utils.showToast(`${n} ${n === 1 ? 'cuenta eliminada' : 'cuentas eliminadas'}`);
        });
    },

    // --- MOVER A CARPETA (hoja) ---
    showMoveModal: () => {
        if (!store.selection || store.selection.size === 0) return utils.showToast('No hay cuentas seleccionadas');
        const n = store.selection.size;
        document.getElementById('move-title').innerText = `Mover ${n} ${n === 1 ? 'cuenta' : 'cuentas'} a…`;

        const list = document.getElementById('move-list');
        list.innerHTML = '';

        if (store.accounts.some(a => store.selection.has(a.id) && a.folderId)) {
            list.appendChild(app.moveRow('corner-up-left', 'Sacar de la carpeta', 'Vuelven a la lista principal',
                () => { app.closeMoveModal(); app.moveSelectionTo(null); }));
        }

        store.folders.forEach(f => {
            if (f.id === store.currentFolderId) return;
            const c = app.accountsIn(f.id).length;
            list.appendChild(app.moveRow('folder', f.name, `${c} ${c === 1 ? 'cuenta' : 'cuentas'}`,
                () => { app.closeMoveModal(); app.moveSelectionTo(f.id); }));
        });

        list.appendChild(app.moveRow('folder-plus', 'Nueva carpeta', 'Crear y mover ahí', () => {
            app.closeMoveModal();
            app.promptText('Nombre de la carpeta', app.nextFolderName(), (name) => {
                const folder = { id: utils.generateId(), name };
                store.folders.push(folder);
                app.moveSelectionTo(folder.id);
            });
        }));

        const modal = document.getElementById('modal-move');
        const panel = document.getElementById('modal-move-panel');
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('translate-y-full'); }, 10);
        lucide.createIcons();
    },

    moveRow: (icon, label, sub, onClick) => {
        const b = document.createElement('button');
        b.className = 'w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left';
        b.innerHTML = `
            <div class="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-full text-primary shrink-0"><i data-lucide="${icon}" class="w-6 h-6"></i></div>
            <div class="min-w-0">
                <h4 class="font-bold text-gray-900 dark:text-white truncate">${label}</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400">${sub}</p>
            </div>`;
        b.onclick = onClick;
        return b;
    },

    closeMoveModal: () => {
        const modal = document.getElementById('modal-move');
        const panel = document.getElementById('modal-move-panel');
        modal.classList.add('opacity-0'); panel.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    // --- PROMPT DE TEXTO ---
    promptText: (title, value, callback) => {
        const modal = document.getElementById('modal-prompt');
        const panel = document.getElementById('modal-prompt-panel');
        const input = document.getElementById('prompt-input');
        document.getElementById('prompt-title').innerText = title;
        input.value = value || '';

        const btn = document.getElementById('prompt-ok');
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.onclick = () => {
            const v = input.value.trim();
            if (!v) return utils.showToast('Escribe un nombre');
            app.closePrompt();
            callback(v);
        };

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            panel.classList.remove('scale-95'); panel.classList.add('scale-100');
            input.focus(); input.select();
        }, 10);
    },
    closePrompt: () => {
        const modal = document.getElementById('modal-prompt');
        const panel = document.getElementById('modal-prompt-panel');
        modal.classList.add('opacity-0');
        panel.classList.remove('scale-100'); panel.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },

    // --- GESTOS ---
    // Mantener presionado entra en modo seleccion. Ya en seleccion, mantener
    // presionado sobre una tarjeta seleccionada arrastra todo el grupo.
    bindCardGestures: (el, accId) => {
        let timer = null, startX = 0, startY = 0, down = false;
        const cancel = () => { clearTimeout(timer); timer = null; };

        el.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button')) return;
            startX = e.clientX; startY = e.clientY; down = true;
            const x = e.clientX, y = e.clientY;
            timer = setTimeout(() => {
                timer = null;
                if (!down) return;
                if (!store.selection) {
                    app._pendingGesture = true;
                    if (navigator.vibrate) navigator.vibrate(15);
                    app.enterSelection(accId);
                } else if (store.selection.has(accId)) {
                    app._pendingGesture = true;
                    if (navigator.vibrate) navigator.vibrate(15);
                    app.startDrag(x, y);
                }
            }, 450);
        });

        el.addEventListener('pointermove', (e) => {
            if (timer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) cancel();
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
            el.addEventListener(ev, () => { down = false; cancel(); }));
    },

    startDrag: (x, y) => {
        if (!store.selection || store.selection.size === 0) return;
        const n = store.selection.size;
        const ghost = document.createElement('div');
        ghost.className = 'fixed z-[90] pointer-events-none bg-primary text-white px-4 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 -translate-x-1/2 -translate-y-1/2';
        ghost.innerHTML = `<i data-lucide="folder" class="w-4 h-4"></i> ${n} ${n === 1 ? 'cuenta' : 'cuentas'}`;
        document.body.appendChild(ghost);
        lucide.createIcons();

        app.drag = { ghost, x, y, overId: null };
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
        app.moveDrag(x, y);

        document.addEventListener('pointermove', app.onDragMove, { passive: false });
        document.addEventListener('pointerup', app.onDragEnd);
        document.addEventListener('pointercancel', app.onDragEnd);
        app.dragScroll = setInterval(app.autoScroll, 50);
    },

    moveDrag: (x, y) => {
        const d = app.drag;
        if (!d) return;
        d.x = x; d.y = y;
        d.ghost.style.left = `${x}px`;
        d.ghost.style.top = `${y}px`;

        d.ghost.style.display = 'none';
        const under = document.elementFromPoint(x, y);
        d.ghost.style.display = '';

        const folderEl = under && under.closest ? under.closest('[data-folder-id]') : null;
        document.querySelectorAll('[data-folder-id]').forEach(el => el.classList.toggle('drop-target', el === folderEl));
        d.overId = folderEl ? folderEl.dataset.folderId : null;
    },

    onDragMove: (e) => { e.preventDefault(); app.moveDrag(e.clientX, e.clientY); },

    onDragEnd: () => {
        const d = app.drag;
        if (!d) return;
        clearInterval(app.dragScroll);
        document.removeEventListener('pointermove', app.onDragMove);
        document.removeEventListener('pointerup', app.onDragEnd);
        document.removeEventListener('pointercancel', app.onDragEnd);
        d.ghost.remove();
        document.body.style.touchAction = '';
        document.body.style.userSelect = '';
        document.querySelectorAll('[data-folder-id]').forEach(el => el.classList.remove('drop-target'));

        const target = d.overId;
        app.drag = null;
        app._pendingGesture = false;
        app._gestureAt = Date.now();
        if (target) app.moveSelectionTo(target);
    },

    // ponytail: autoscroll a velocidad fija. Si la lista se hace muy larga,
    // acelerar segun la distancia al borde.
    autoScroll: () => {
        const d = app.drag;
        if (!d) return;
        const main = document.getElementById('accounts-list');
        const r = main.getBoundingClientRect();
        if (d.y < r.top + 70) main.scrollTop -= 12;
        else if (d.y > r.bottom - 70) main.scrollTop += 12;
    },

    // --- RENDER HOME ---
    syncHomeChrome: () => {
        const selecting = !!store.selection;
        const inFolder = !!store.currentFolderId;
        const show = (id, on) => document.getElementById(id).classList.toggle('hidden', !on);

        show('home-brand', !selecting && !inFolder);
        show('home-folder-head', !selecting && inFolder);
        show('home-select-head', selecting);
        show('home-filters', !selecting);
        show('home-select-actions', selecting);
        show('home-select-all', selecting);
        show('home-settings-btn', !selecting);
        show('home-theme-btn', !selecting);
        show('home-fab', !selecting);

        if (inFolder) {
            const f = store.folders.find(x => x.id === store.currentFolderId);
            const n = app.accountsIn(store.currentFolderId).length;
            document.getElementById('home-folder-name').innerText = f ? f.name : 'Carpeta';
            document.getElementById('home-folder-meta').innerText = `${n} ${n === 1 ? 'cuenta' : 'cuentas'}`;
        }
        if (selecting) {
            const n = store.selection.size;
            const all = app.accountsIn(store.currentFolderId).length;
            document.getElementById('home-select-count').innerText = `${n} ${n === 1 ? 'seleccionada' : 'seleccionadas'}`;
            document.getElementById('home-select-all').innerText = (all > 0 && n === all) ? 'Ninguna' : 'Todas';
        }
    },

    renderHome: () => {
        const list = document.getElementById('accounts-list');
        app.syncHomeChrome();
        list.innerHTML = '';

        const folderId = store.currentFolderId;
        const accounts = app.accountsIn(folderId);
        const folders = folderId ? [] : store.folders;

        if (folders.length === 0 && accounts.length === 0) {
            list.innerHTML = folderId
                ? `<div class="text-center py-10 text-gray-400 bg-gray-50 dark:bg-cardDark rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm">Esta carpeta está vacía.<br>Arrastra cuentas aquí o usa "Mover a…".</div>`
                : `
                <div class="flex flex-col items-center justify-center text-center h-full min-h-[60vh] px-6">
                    <img src="${import.meta.env.BASE_URL}logo.svg" alt="" width="96" height="96" class="w-24 h-24 mb-6">
                    <h2 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 pb-1">Cuentas Claras</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-8">Aún no tienes cuentas. Crea la primera para empezar a dividir gastos.</p>
                    <button onclick="app.showAddAccountModal()" class="bg-primary text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 ios-btn flex items-center gap-2">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                        Nueva cuenta
                    </button>
                </div>`;
            lucide.createIcons();
            return;
        }

        folders.forEach(f => list.appendChild(app.folderCard(f)));
        accounts.forEach(acc => list.appendChild(app.accountCard(acc)));
        lucide.createIcons();
    },

    folderCard: (f) => {
        const n = app.accountsIn(f.id).length;
        const selecting = !!store.selection;
        const el = document.createElement('div');
        el.dataset.folderId = f.id;
        el.className = 'bg-surface p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer';
        el.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-primary shrink-0">
                    <i data-lucide="folder" class="w-6 h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="font-bold text-gray-800 dark:text-gray-100 truncate">${f.name}</h3>
                    <p class="text-xs font-medium text-primary">${n} ${n === 1 ? 'cuenta' : 'cuentas'} · ${utils.formatCurrency(app.folderTotal(f.id))}</p>
                </div>
            </div>
            ${selecting ? '<span class="text-xs font-bold text-primary shrink-0 pl-2">Soltar aquí</span>' : `
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="app.renameFolder('${f.id}', event)" aria-label="Renombrar carpeta" class="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-primary transition rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                    <i data-lucide="pencil" class="w-5 h-5"></i>
                </button>
                <button onclick="app.deleteFolder('${f.id}', event)" aria-label="Eliminar carpeta" class="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-red-500 transition rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>`}`;
        el.onclick = (e) => {
            if (e.target.closest('button') || app.justGestured()) return;
            // En seleccion, tocar la carpeta hace lo mismo que soltar encima.
            if (store.selection) app.moveSelectionTo(f.id);
            else app.openFolder(f.id);
        };
        return el;
    },

    accountCard: (acc) => {
        const cat = store.categories.find(c => c.id == acc.categoryId) || store.categories[0];
        const total = (acc.expenses || []).reduce((sum, ex) => sum + Number(ex.amount), 0);
        const isSettled = app.isAccountSettled(acc);
        const selecting = !!store.selection;
        const selected = selecting && store.selection.has(acc.id);

        const el = document.createElement('div');
        el.dataset.accountId = acc.id;
        el.className = `bg-surface p-4 rounded-xl shadow-sm border flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer group ${selected ? 'border-primary ring-2 ring-primary/40' : 'border-gray-100 dark:border-gray-800'}`;
        el.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                ${selecting ? `<div class="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-600'}">${selected ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}</div>` : ''}
                <div class="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-2xl shrink-0">${cat.emoji}</div>
                <div class="min-w-0">
                    <h3 class="font-bold text-gray-800 dark:text-gray-100 truncate">${acc.name}</h3>
                    <div class="flex items-center gap-2">
                        <p class="text-xs font-medium text-primary">${utils.formatCurrency(total)}</p>
                        ${isSettled ? '<span class="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800 flex items-center gap-0.5"><i data-lucide="check" class="w-3 h-3"></i> SALDADO</span>' : ''}
                    </div>
                </div>
            </div>
            ${selecting ? '' : `
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="app.showEditAccountModal('${acc.id}', event)" aria-label="Editar cuenta" class="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-primary transition rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                    <i data-lucide="pencil" class="w-5 h-5"></i>
                </button>
                <button onclick="app.deleteAccountFromHome('${acc.id}', event)" aria-label="Eliminar cuenta" class="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-red-500 transition rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>`}`;
        el.onclick = (e) => {
            if (e.target.closest('button') || app.justGestured()) return;
            if (store.selection) app.toggleSelect(acc.id);
            else app.openAccount(acc.id);
        };
        app.bindCardGestures(el, acc.id);
        return el;
    },

    // --- ACCOUNT DETAIL ---
    openAccount: (id) => {
        store.currentAccountId = id;
        app.renderAccount();
        app.navigate('account');
    },

    renderAccount: () => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return app.navigate('home');
        document.getElementById('acc-title').innerText = acc.name;
        
        // Mostrar fechas
        let metaText = `Creado: ${utils.formatDate(acc.date)}`;
        if (acc.eventDate) {
            metaText += ` • Evento: ${utils.formatDate(acc.eventDate)}`;
        }
        document.getElementById('acc-meta').innerText = metaText;
        
        // CÁLCULO DE TOTALES DIFERENCIADOS
        let totalGroup = 0;
        let totalAll = 0;

        (acc.expenses || []).forEach(e => {
            const amt = Number(e.amount);
            totalAll += amt;
            if (e.type !== 'individual') {
                totalGroup += amt;
            }
        });

        document.getElementById('acc-total-group').innerText = utils.formatCurrency(totalGroup);
        document.getElementById('acc-total-all').innerText = utils.formatCurrency(totalAll);

        // Participants
        const partList = document.getElementById('acc-participants');
        partList.innerHTML = '';
        const renderAddBtn = () => {
            const btn = document.createElement('button');
            btn.onclick = () => app.showAddParticipantModal();
            btn.className = 'flex flex-col items-center gap-1 min-w-[60px]';
            btn.innerHTML = `<div class="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-primary hover:bg-gray-100 transition"><i data-lucide="plus" class="w-5 h-5"></i></div><span class="text-[10px] text-gray-500">Añadir</span>`;
            return btn;
        };

        if (!acc.participants || acc.participants.length === 0) {
            partList.appendChild(renderAddBtn());
        } else {
            acc.participants.forEach(p => {
                const el = document.createElement('div');
                el.className = 'flex flex-col items-center gap-1 min-w-[60px] cursor-pointer group relative';
                el.onclick = () => app.confirmDeleteParticipant(p.id, p.name);
                el.innerHTML = `
                    <div class="relative w-10 h-10">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-sm border-2 border-white dark:border-cardDark">
                            ${p.name.substring(0,2).toUpperCase()}
                        </div>
                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition shadow-sm border border-white dark:border-dark">
                            <i data-lucide="x" class="w-2 h-2"></i>
                        </div>
                    </div>
                    <span class="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full text-center group-hover:text-red-500 transition">${p.name}</span>
                `;
                partList.appendChild(el);
            });
            partList.appendChild(renderAddBtn());
        }

        // Expenses & Payments List
        const expList = document.getElementById('acc-expenses');
        expList.innerHTML = '';
        
        let allItems = [
            ...(acc.expenses || []).map(e => ({...e, kind: 'expense'})),
            ...(acc.payments || []).map(p => ({...p, kind: 'payment'}))
        ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (allItems.length === 0) {
            expList.innerHTML = `<div class="text-center py-8 text-gray-400 bg-gray-50 dark:bg-cardDark rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm">No hay actividad.<br>¡Añade un gasto!</div>`;
        } else {
            allItems.forEach((item) => {
                const el = document.createElement('div');
                if (item.kind === 'expense') {
                    el.className = 'flex items-center justify-between p-3 bg-surface rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.99] transition-transform';
                    el.onclick = (ev) => { if (!ev.target.closest('button')) app.showEditExpenseModal(item.id); };
                    const dateBadge = item.userDate ? `<span class="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded ml-2">${utils.formatDate(item.userDate).slice(0,5)}</span>` : '';
                    
                    // Visualización si es personal
                    let infoLine = `<p class="text-xs text-gray-500">Pagó: ${item.payer}</p>`;
                    let icon = `<div class="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-primary shrink-0"><i data-lucide="receipt" class="w-5 h-5"></i></div>`;
                    
                    if (item.type === 'individual') {
                        icon = `<div class="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg text-amber-500 shrink-0"><i data-lucide="user" class="w-5 h-5"></i></div>`;
                        infoLine = `<p class="text-xs text-amber-600 dark:text-amber-500 font-medium">Personal: ${item.payer} <i data-lucide="arrow-right" class="w-3 h-3 inline"></i> ${item.beneficiary}</p>`;
                    }

                    el.innerHTML = `
                        <div class="flex items-center gap-3 overflow-hidden">
                            ${icon}
                            <div class="truncate">
                                <div class="flex items-center">
                                    <h4 class="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">${item.desc}</h4>
                                    ${dateBadge}
                                </div>
                                ${infoLine}
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="font-bold text-gray-900 dark:text-white">${utils.formatCurrency(item.amount)}</span>
                            <button onclick="app.deleteExpense('${item.id}')" aria-label="Eliminar gasto" class="w-10 h-10 -mr-1 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    `;
                } else {
                    el.className = 'flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30';
                    el.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="bg-green-100 dark:bg-green-900/40 p-2 rounded-lg text-green-600 shrink-0"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div>
                            <div>
                                <h4 class="font-bold text-gray-800 dark:text-gray-200 text-sm">Pago registrado</h4>
                                <p class="text-xs text-gray-500">${item.from} pagó a ${item.to}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="font-bold text-green-600 dark:text-green-400">${utils.formatCurrency(item.amount)}</span>
                            <button onclick="app.deletePayment('${item.id}')" aria-label="Eliminar pago" class="w-10 h-10 -mr-1 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    `;
                }
                expList.appendChild(el);
            });
        }
        lucide.createIcons();
    },

    // --- DELETING ITEMS ---
    deleteExpense: (id) => {
        app.confirmAction("¿Borrar este gasto?", () => {
            const acc = store.accounts.find(a => a.id === store.currentAccountId);
            if (acc) {
                acc.expenses = acc.expenses.filter(e => e.id !== id);
                utils.save();
                app.renderAccount();
                utils.showToast("Gasto eliminado");
            }
        });
    },
    deletePayment: (id) => {
        app.confirmAction("¿Borrar este pago?", () => {
            const acc = store.accounts.find(a => a.id === store.currentAccountId);
            if (acc) {
                acc.payments = acc.payments.filter(p => p.id !== id);
                utils.save();
                app.renderAccount();
                utils.showToast("Pago eliminado");
            }
        });
    },

    // --- PARTICIPANT DELETION ---
    confirmDeleteParticipant: (id, name) => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;

        const hasExpenses = acc.expenses && acc.expenses.some(e => e.payer === name);
        const hasPayments = acc.payments && acc.payments.some(p => p.from === name || p.to === name);

        if (hasExpenses || hasPayments) {
            utils.showToast("No se puede borrar: tiene gastos asociados");
            return;
        }

        app.confirmAction(`¿Borrar a ${name}?`, () => {
            acc.participants = acc.participants.filter(p => p.id !== id);
            utils.save();
            app.renderAccount();
            utils.showToast("Participante eliminado");
        });
    },

    // --- CALCULATE BALANCES ---
    calculateBalances: () => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;
        
        const { transactions, share } = app.getDebts(acc);
        
        if (share === 0 && transactions.length === 0) {
             utils.showToast("No hay gastos para calcular");
             return;
        }

        app.showBalancesModal(transactions, share);
    },

    showBalancesModal: (transactions, share) => {
        const modal = document.getElementById('modal-balances');
        const panel = document.getElementById('modal-balances-panel');
        const list = document.getElementById('bal-list');
        document.getElementById('bal-share').innerText = utils.formatCurrency(share);
        list.innerHTML = '';

        if (transactions.length === 0) {
            list.innerHTML = `<div class="text-center py-6"><div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600"><i data-lucide="check" class="w-8 h-8"></i></div><p class="text-gray-500 font-medium">¡Todo pagado! Nadie debe nada.</p></div>`;
        } else {
            transactions.forEach(t => {
                const el = document.createElement('div');
                el.className = 'flex items-center justify-between p-4 bg-surface rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm';
                el.innerHTML = `
                    <div class="flex flex-col flex-1 min-w-0 mr-3">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-gray-900 dark:text-white">${t.from}</span>
                            <i data-lucide="arrow-right" class="w-4 h-4 text-gray-400"></i>
                            <span class="font-bold text-gray-900 dark:text-white">${t.to}</span>
                        </div>
                        <span class="text-lg font-bold text-primary">${utils.formatCurrency(t.amount)}</span>
                    </div>
                    <button onclick="app.settleDebt('${t.from}', '${t.to}', ${t.amount})" class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-200 transition flex items-center gap-1">
                        <i data-lucide="check" class="w-4 h-4"></i> Saldar
                    </button>
                `;
                list.appendChild(el);
            });
        }
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('translate-y-full'); }, 10);
        lucide.createIcons();
    },

    settleDebt: (from, to, amount) => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;
        
        if (!acc.payments) acc.payments = [];
        acc.payments.push({
            id: utils.generateId(),
            from, to, amount, date: new Date().toISOString()
        });
        
        utils.save();
        utils.showToast("Pago registrado");
        app.calculateBalances(); 
        app.renderAccount(); 
    },

    closeBalancesModal: () => {
        const modal = document.getElementById('modal-balances');
        const panel = document.getElementById('modal-balances-panel');
        modal.classList.add('opacity-0'); panel.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    // --- HELPERS & INIT ---
    showAddAccountModal: () => {
        const modal = document.getElementById('modal-add-account');
        const panel = document.getElementById('modal-add-account-panel');
        const select = document.getElementById('new-account-cat');
        select.innerHTML = store.categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
        store.editingAccountId = null;
        document.getElementById('new-account-name').value = '';
        document.getElementById('new-account-date').value = '';
        document.getElementById('add-account-title').innerText = 'Nueva Cuenta';
        document.getElementById('add-account-submit').innerText = 'Crear';
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('translate-y-full'); }, 10);
    },

    showEditAccountModal: (id, event) => {
        if (event) event.stopPropagation();
        const acc = store.accounts.find(a => a.id === id);
        if (!acc) return;
        app.showAddAccountModal();
        store.editingAccountId = id;
        document.getElementById('new-account-name').value = acc.name;
        document.getElementById('new-account-cat').value = acc.categoryId;
        document.getElementById('new-account-date').value = acc.eventDate || '';
        document.getElementById('add-account-title').innerText = 'Editar Cuenta';
        document.getElementById('add-account-submit').innerText = 'Guardar';
    },
    closeAddAccountModal: () => {
        const modal = document.getElementById('modal-add-account');
        const panel = document.getElementById('modal-add-account-panel');
        modal.classList.add('opacity-0'); panel.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },
    
    showAddExpenseModal: () => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc.participants || acc.participants.length === 0) {
            utils.showToast("Primero añade participantes");
            app.showAddParticipantModal();
            return;
        }
        const modal = document.getElementById('modal-add-expense');
        const panel = document.getElementById('modal-add-expense-panel');
        
        // Llenar Payer
        const payerSelect = document.getElementById('exp-payer');
        const options = acc.participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        payerSelect.innerHTML = options;

        // Llenar Beneficiary (Nuevo)
        const benSelect = document.getElementById('exp-beneficiary');
        benSelect.innerHTML = options;

        // Reset UI
        store.editingExpenseId = null;
        document.getElementById('exp-desc').value = '';
        document.getElementById('exp-amount').value = '';
        document.getElementById('exp-date').value = '';
        document.getElementById('exp-is-personal').checked = false;
        document.getElementById('exp-beneficiary-wrapper').classList.add('hidden');
        document.getElementById('add-expense-title').innerText = 'Nuevo Gasto';
        document.getElementById('add-expense-submit').innerText = 'Guardar Gasto';

        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('translate-y-full'); }, 10);
    },
    closeAddExpenseModal: () => {
        const modal = document.getElementById('modal-add-expense');
        const panel = document.getElementById('modal-add-expense-panel');
        modal.classList.add('opacity-0'); panel.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
        
        // Limpiar form
        document.getElementById('exp-desc').value = '';
        document.getElementById('exp-amount').value = '';
        document.getElementById('exp-date').value = ''; 
    },
    
    toggleExpenseType: () => {
        const isPersonal = document.getElementById('exp-is-personal').checked;
        const wrapper = document.getElementById('exp-beneficiary-wrapper');
        if(isPersonal) {
            wrapper.classList.remove('hidden');
        } else {
            wrapper.classList.add('hidden');
        }
    },

    showEditExpenseModal: (id) => {
        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;
        const e = (acc.expenses || []).find(x => x.id === id);
        if (!e) return;

        app.showAddExpenseModal();
        store.editingExpenseId = id;
        document.getElementById('exp-desc').value = e.desc;
        document.getElementById('exp-amount').value = e.amount;
        document.getElementById('exp-payer').value = e.payer;
        document.getElementById('exp-date').value = e.userDate || '';

        const isPersonal = e.type === 'individual';
        document.getElementById('exp-is-personal').checked = isPersonal;
        document.getElementById('exp-beneficiary-wrapper').classList.toggle('hidden', !isPersonal);
        if (isPersonal) document.getElementById('exp-beneficiary').value = e.beneficiary;

        document.getElementById('add-expense-title').innerText = 'Editar Gasto';
        document.getElementById('add-expense-submit').innerText = 'Guardar cambios';
    },

    // Mismo modal para crear y editar: store.editingExpenseId decide cual.
    saveExpense: () => {
        const desc = document.getElementById('exp-desc').value;
        const amount = document.getElementById('exp-amount').value;
        const payer = document.getElementById('exp-payer').value;
        const userDate = document.getElementById('exp-date').value;
        
        const isPersonal = document.getElementById('exp-is-personal').checked;
        const beneficiary = document.getElementById('exp-beneficiary').value;

        const numAmount = Number(amount);
        
        if (!desc.trim()) return utils.showToast('Falta descripción');
        if (isNaN(numAmount) || numAmount <= 0) return utils.showToast('Monto inválido');
        if (!payer) return utils.showToast('Selecciona quién pagó');
        if (isPersonal && !beneficiary) return utils.showToast('Selecciona beneficiario');

        const acc = store.accounts.find(a => a.id === store.currentAccountId);
        if (!acc) return;
        if (!acc.expenses) acc.expenses = [];

        if (store.editingExpenseId) {
            const e = acc.expenses.find(x => x.id === store.editingExpenseId);
            if (!e) return;
            e.desc = desc;
            e.amount = numAmount;
            e.payer = payer;
            e.userDate = userDate || null;
            e.type = isPersonal ? 'individual' : 'group';
            // Si deja de ser personal hay que sacar el beneficiario viejo, si no
            // queda colgado en los datos y reaparece al volver a marcarlo.
            if (isPersonal) e.beneficiary = beneficiary;
            else delete e.beneficiary;

            utils.save();
            app.renderAccount();
            app.closeAddExpenseModal();
            utils.showToast('Gasto actualizado');
            return;
        }
        
        const newExpense = { 
            id: utils.generateId(), 
            desc, 
            amount: numAmount, 
            payer, 
            date: new Date().toISOString(),
            userDate: userDate || null,
            type: isPersonal ? 'individual' : 'group'
        };

        if (isPersonal) {
            newExpense.beneficiary = beneficiary;
        }

        acc.expenses.push(newExpense);
        utils.save();
        app.renderAccount();
        app.closeAddExpenseModal();
        utils.showToast('Gasto guardado');
    },
    
    // --- CONFIGURACION ---
    renderSettings: () => {
        const wrap = document.getElementById('settings-colors');
        wrap.innerHTML = '';

        [['light', 'Tema Claro', 'sun'], ['dark', 'Tema Oscuro', 'moon']].forEach(([theme, title, icon]) => {
            const group = document.createElement('div');
            const isActive = store.theme === theme;
            group.innerHTML = `
                <div class="flex items-center gap-2 mb-2 px-1">
                    <i data-lucide="${icon}" class="w-4 h-4 text-gray-400"></i>
                    <h4 class="font-bold text-sm text-gray-600 dark:text-gray-300">${title}</h4>
                    ${isActive ? '<span class="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">ACTIVO</span>' : ''}
                </div>
                <div class="space-y-2">
                    ${Object.keys(colorLabels).map(key => `
                        <label class="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-gray-100 dark:border-gray-800 cursor-pointer">
                            <div class="min-w-0">
                                <h5 class="font-bold text-sm text-gray-800 dark:text-gray-100">${colorLabels[key][0]}</h5>
                                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${colorLabels[key][1]}</p>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <span id="color-hex-${theme}-${key}" class="text-xs text-gray-400 tabular-nums">${store.colors[theme][key]}</span>
                                <input type="color" id="color-${theme}-${key}" value="${store.colors[theme][key]}" aria-label="${colorLabels[key][0]} (${title})" oninput="app.setColor('${theme}', '${key}', this.value)" class="w-10 h-10 rounded-lg">
                            </div>
                        </label>`).join('')}
                </div>`;
            wrap.appendChild(group);
        });
        lucide.createIcons();
    },

    setColor: (theme, key, hex) => {
        if (!store.colors[theme] || !utils.hexToRgb(hex)) return;
        store.colors[theme][key] = hex.toUpperCase();
        utils.save();
        if (theme === store.theme) app.applyColors();
        const label = document.getElementById(`color-hex-${theme}-${key}`);
        if (label) label.innerText = store.colors[theme][key];
    },

    resetColors: () => {
        app.confirmAction('Se vuelven a los colores de fábrica en los dos temas.', () => {
            store.colors = { light: { ...defaultColors.light }, dark: { ...defaultColors.dark } };
            utils.save();
            app.applyColors();
            app.renderSettings();
            utils.showToast('Colores restaurados');
        }, 'Restaurar');
    },

    // --- EXPORTAR / IMPORTAR TODO ---
    exportData: () => {
        const data = {
            app: 'cuentas-claras',
            version: 1,
            exportedAt: new Date().toISOString(),
            accounts: store.accounts,
            categories: store.categories,
            folders: store.folders,
            colors: store.colors
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `cuentas-claras-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        utils.showToast('Datos exportados');
    },

    uniqueFolderName: (base) => {
        const taken = new Set(store.folders.map(f => f.name));
        if (!taken.has(base)) return base;
        let n = 2;
        while (taken.has(`${base} (${n})`)) n++;
        return `${base} (${n})`;
    },

    importData: async (input) => {
        const file = input.files && input.files[0];
        input.value = '';  // si no, elegir el mismo archivo dos veces no dispara change
        if (!file) return;

        let data;
        try {
            data = JSON.parse(await file.text());
        } catch (e) {
            return utils.showToast('El archivo no es un JSON válido');
        }

        // El archivo viene de afuera: nada de confiar en su forma.
        if (!data || typeof data !== 'object' || !Array.isArray(data.accounts)) {
            return utils.showToast('El archivo no tiene el formato de Cuentas Claras');
        }
        const incoming = data.accounts.filter(a => a && typeof a.name === 'string' && a.name.trim());
        if (incoming.length === 0) return utils.showToast('El archivo no trae cuentas');

        // Las categorías del archivo se reconcilian por nombre; las que faltan se
        // crean con id local, si no las cuentas caerían todas en "General".
        const catMap = {};
        (Array.isArray(data.categories) ? data.categories : []).forEach(c => {
            if (!c || typeof c.name !== 'string') return;
            const local = store.categories.find(x => x.name === c.name);
            if (local) {
                catMap[c.id] = local.id;
            } else {
                const created = { id: Date.now() + Math.floor(Math.random() * 10000), name: c.name, emoji: c.emoji || '📦' };
                store.categories.push(created);
                catMap[c.id] = created.id;
            }
        });

        const folder = { id: utils.generateId(), name: app.uniqueFolderName(`Importado ${utils.formatDate(new Date().toISOString())}`) };

        // Ids nuevos: los del archivo pueden chocar con los que ya existen.
        const imported = incoming.map(a => ({
            id: utils.generateId(),
            name: a.name,
            categoryId: catMap[a.categoryId] !== undefined ? catMap[a.categoryId] : store.categories[0].id,
            date: a.date || new Date().toISOString(),
            eventDate: a.eventDate || null,
            folderId: folder.id,
            participants: Array.isArray(a.participants) ? a.participants : [],
            expenses: Array.isArray(a.expenses) ? a.expenses : [],
            payments: Array.isArray(a.payments) ? a.payments : []
        }));

        store.folders.push(folder);
        store.accounts = imported.concat(store.accounts);
        utils.save();
        utils.showToast(`${imported.length} ${imported.length === 1 ? 'cuenta importada' : 'cuentas importadas'} en ${folder.name}`);
    },

    // --- CATEGORIES ---
    renderCategories: () => {
        const list = document.getElementById('categories-list');
        list.innerHTML = '';
        store.categories.forEach((cat, index) => {
            const isDefault = index === 0;
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between p-3 bg-surface rounded-xl border border-gray-100 dark:border-gray-800';
            el.innerHTML = `<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xl">${cat.emoji}</div><span class="font-medium text-gray-700 dark:text-gray-200">${cat.name}</span></div>${!isDefault ? `<button onclick="app.deleteCategory(${index})" class="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"><i data-lucide="trash-2" class="w-5 h-5"></i></button>` : '<span class="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Default</span>'}`;
            list.appendChild(el);
        });
        lucide.createIcons();
    },
    addCategory: () => {
        const name = document.getElementById('cat-name').value.trim();
        const emoji = document.getElementById('cat-emoji').value.trim() || '📦';
        if (!name) return;
        store.categories.push({ id: Date.now(), name, emoji });
        utils.save();
        app.renderCategories();
        document.getElementById('cat-name').value = ''; document.getElementById('cat-emoji').value = '';
        utils.showToast('Categoría agregada');
    },
    deleteCategory: (index) => {
        const cat = store.categories[index];
        const inUse = store.accounts.some(a => a.categoryId == cat.id);
        app.confirmAction(inUse ? `"${cat.name}" se usa. Cuentas pasarán a "General".` : `¿Borrar "${cat.name}"?`, () => {
            if (inUse) store.accounts.forEach(a => { if(a.categoryId == cat.id) a.categoryId = store.categories[0].id; });
            store.categories.splice(index, 1);
            utils.save();
            app.renderCategories();
            utils.showToast("Categoría eliminada");
        });
    },
    // --- PARTICIPANTS ---
    showAddParticipantModal: () => {
        const modal = document.getElementById('modal-add-participant');
        const panel = document.getElementById('modal-add-participant-panel');
        const input = document.getElementById('part-name');
        input.value = '';
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('scale-95'); panel.classList.add('scale-100'); input.focus(); }, 10);
    },
    closeAddParticipantModal: () => {
        const modal = document.getElementById('modal-add-participant');
        const panel = document.getElementById('modal-add-participant-panel');
        modal.classList.add('opacity-0'); panel.classList.remove('scale-100'); panel.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },
    addParticipant: () => {
        const nameInput = document.getElementById('part-name');
        const name = nameInput.value.trim();
        if (name) {
            const acc = store.accounts.find(a => a.id === store.currentAccountId);
            if (!acc.participants) acc.participants = [];
            acc.participants.push({ id: utils.generateId(), name: name });
            utils.save();
            app.renderAccount();
            app.closeAddParticipantModal();
            utils.showToast(`${name} añadido`);
        } else {
            utils.showToast("Escribe un nombre");
        }
    }
}; 

// Los handlers en el HTML son onclick="app.x()", así que app vive en window.
window.app = app;
app.init();
