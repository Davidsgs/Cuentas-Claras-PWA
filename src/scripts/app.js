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
  Link,
  Plus,
  PlusCircle,
  QrCode,
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
  Info, Link, Moon, Pencil, Plus, PlusCircle, QrCode, Receipt, RotateCcw,
  Settings, Share2,
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

const THEME_KEYS = ['primary', 'secondary', 'base', 'surface', 'content', 'muted', 'line'];

const themeLabels = {
    primary:   ['Primario', 'Botones, enlaces y acentos'],
    secondary: ['Secundario', 'Saldado y confirmaciones'],
    base:      ['Fondo', 'Color de la pantalla'],
    surface:   ['Tarjetas', 'Cabeceras, tarjetas y hojas'],
    content:   ['Texto', 'Títulos y texto principal'],
    muted:     ['Texto apagado', 'Subtítulos y ayudas'],
    line:      ['Bordes', 'Líneas y separadores']
};

const factoryThemes = [
    { id: 'light', name: 'Tema Claro', colors: {
        primary: '#4F46E5', secondary: '#10B981', base: '#F9FAFB', surface: '#FFFFFF',
        content: '#111827', muted: '#6B7280', line: '#E5E7EB' } },
    { id: 'dark', name: 'Tema Oscuro', colors: {
        primary: '#4F46E5', secondary: '#10B981', base: '#111827', surface: '#1F2937',
        content: '#F3F4F6', muted: '#9CA3AF', line: '#374151' } },
    { id: 'contrast', name: 'Alto Contraste', colors: {
        primary: '#FFD400', secondary: '#00E676', base: '#000000', surface: '#0D0D0D',
        content: '#FFFFFF', muted: '#D4D4D4', line: '#8A8A8A' } },
    { id: 'blue', name: 'Tema Azul', colors: {
        primary: '#3B82F6', secondary: '#22D3EE', base: '#0B1220', surface: '#132033',
        content: '#E8EFFA', muted: '#94AEC9', line: '#27394F' } },
    { id: 'red', name: 'Tema Rojo', colors: {
        primary: '#E11D48', secondary: '#F59E0B', base: '#1A0B10', surface: '#2B131C',
        content: '#FDE8EC', muted: '#C68C99', line: '#4C2432' } }
];

const cloneFactory = () => factoryThemes.map(t => ({ id: t.id, name: t.name, colors: { ...t.colors } }));

// Mezclado contra fábrica: un tema guardado a medias no puede dejar una
// variable CSS sin definir. Migra además el modelo viejo (cc_colors), que solo
// tenía 4 colores por modo: se vuelcan sobre el tema claro/oscuro de fábrica y
// los 3 colores nuevos salen de ahí.
const loadThemes = () => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('cc_themes')); } catch (e) { saved = null; }

    if (Array.isArray(saved) && saved.length) {
        const fallback = factoryThemes[1].colors;
        return saved
            .filter(t => t && t.id && typeof t.name === 'string')
            .map(t => {
                const factory = factoryThemes.find(f => f.id === t.id);
                return { id: t.id, name: t.name, colors: { ...(factory ? factory.colors : fallback), ...(t.colors || {}) } };
            });
    }

    const themes = cloneFactory();
    let old = null;
    try { old = JSON.parse(localStorage.getItem('cc_colors')); } catch (e) { old = null; }
    if (old) {
        ['light', 'dark'].forEach(mode => {
            const palette = old[mode];
            const target = themes.find(t => t.id === mode);
            if (!palette || !target) return;
            ['primary', 'secondary', 'base', 'surface'].forEach(k => {
                if (/^#[0-9a-f]{6}$/i.test(String(palette[k] || ''))) target.colors[k] = palette[k];
            });
        });
    }
    return themes;
};

const loadThemeId = (themes) => {
    const saved = localStorage.getItem('cc_theme_id') || localStorage.getItem('cc_theme');
    return themes.some(t => t.id === saved) ? saved : (themes[1] || themes[0]).id;
};

const store = {
    accounts: JSON.parse(localStorage.getItem('cc_accounts')) || [],
    categories: JSON.parse(localStorage.getItem('cc_categories')) || defaultCategories,
    folders: JSON.parse(localStorage.getItem('cc_folders')) || [],
    themes: loadThemes(),
    currentAccountId: null,
    currentFolderId: null,
    editingExpenseId: null,
    // null = fuera del modo selección; Set de ids de cuenta cuando está activo.
    selection: null,
    // Borrador del editor de temas; null cuando el modal está cerrado.
    themeDraft: null,
    // null = todas las categorías. Un Set = solo esas. Un Set vacío = ninguna.
    // No se persiste: un filtro guardado entre sesiones parece pérdida de datos.
    categoryFilter: null,
    // Índice de la categoría que se está editando; null al crear una nueva.
    editingCategoryIndex: null
};

store.themeId = loadThemeId(store.themes);

const utils = {
    save: () => {
        localStorage.setItem('cc_accounts', JSON.stringify(store.accounts));
        localStorage.setItem('cc_categories', JSON.stringify(store.categories));
        localStorage.setItem('cc_folders', JSON.stringify(store.folders));
        localStorage.setItem('cc_themes', JSON.stringify(store.themes));
        localStorage.setItem('cc_theme_id', store.themeId);
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
    },
    // Luminancia relativa sRGB (WCAG). Decide si un tema es claro u oscuro y
    // qué color de texto va encima de un acento.
    luminance: (hex) => {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
        if (!m) return 0;
        const n = parseInt(m[1], 16);
        const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
            .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    },
    isDarkColor: (hex) => utils.luminance(hex) < 0.4,
    // Corta una promesa que no termina. Rechaza al vencer el plazo.
    withTimeout: (promesa, ms) => Promise.race([
        promesa,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]),
    toBase64Url: (bytes) => {
        let bin = '';
        bytes.forEach(b => { bin += String.fromCharCode(b); });
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    fromBase64Url: (text) => {
        const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
        const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
        return Uint8Array.from(bin, c => c.charCodeAt(0));
    },
    // Todo texto que llega de un archivo o de un enlace pasa por acá. La app
    // pinta nombres con innerHTML en muchos lados: sin esto, un enlace armado a
    // mano podría inyectar HTML.
    clean: (value, max = 120) => String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max),
    contrastOn: (hex) => (utils.luminance(hex) > 0.45 ? '17 24 39' : '255 255 255')
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
        // La migración de cc_colors vive solo en memoria hasta que algo guarda:
        // se persiste acá para que no se rehaga en cada arranque.
        if (!localStorage.getItem('cc_themes')) utils.save();
        app.renderHome();
        lucide.createIcons();
        app.checkIncomingShare();
        app.announceUpdate();
        // Si la app ya estaba abierta, abrir un enlace compartido solo cambia el
        // hash y no recarga el documento: sin esto el enlace no haría nada.
        window.addEventListener('hashchange', () => app.checkIncomingShare());
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
        if (viewId === 'settings') app.renderSettings();
        if (viewId === 'home') { store.selection = null; app.renderHome(); }
    },

    // --- FILTRO POR CATEGORÍA ---
    matchesFilter: (acc) => store.categoryFilter === null || store.categoryFilter.has(String(acc.categoryId)),

    // Cuentas de una carpeta que además pasan el filtro.
    visibleIn: (folderId) => app.accountsIn(folderId).filter(app.matchesFilter),

    toggleAllCategories: () => {
        // "Todas" activo -> deselecciona todo; si no -> selecciona todo.
        store.categoryFilter = store.categoryFilter === null ? new Set() : null;
        app.renderHome();
    },

    toggleCategoryFilter: (id) => {
        const all = store.categories.map(c => String(c.id));
        let set;
        if (store.categoryFilter === null) {
            // Con "Todas" puesto, tocar una categoría deja solo esa.
            set = new Set([id]);
        } else {
            set = new Set(store.categoryFilter);
            if (set.has(id)) set.delete(id); else set.add(id);
        }
        // Si quedaron todas marcadas, vuelve a "Todas" para que el chip lo muestre.
        store.categoryFilter = (set.size === all.length && all.every(x => set.has(x))) ? null : set;
        app.renderHome();
    },

    renderFilters: () => {
        const wrap = document.getElementById('home-filters');
        if (!wrap) return;
        wrap.innerHTML = '';

        const chip = (label, active, onClick) => {
            const b = document.createElement('button');
            b.className = 'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition ' +
                (active ? 'bg-primary text-on-primary shadow-md shadow-primary/30' : 'bg-content/10 text-muted');
            b.innerText = label;
            b.onclick = onClick;
            return b;
        };

        wrap.appendChild(chip('Todas', store.categoryFilter === null, () => app.toggleAllCategories()));
        store.categories.forEach(cat => {
            const id = String(cat.id);
            const active = store.categoryFilter === null || store.categoryFilter.has(id);
            wrap.appendChild(chip(`${cat.emoji} ${cat.name}`, active, () => app.toggleCategoryFilter(id)));
        });
    },

    activeTheme: () => store.themes.find(t => t.id === store.themeId) || store.themes[0] || factoryThemes[1],

    applyTheme: () => app.applyColors(app.activeTheme().colors),

    applyColors: (palette) => {
        const root = document.documentElement;
        THEME_KEYS.forEach(key => {
            const rgb = utils.hexToRgb(palette[key]);
            if (rgb) root.style.setProperty(`--c-${key}`, rgb);
        });
        root.style.setProperty('--c-on-primary', utils.contrastOn(palette.primary));
        root.style.setProperty('--c-on-secondary', utils.contrastOn(palette.secondary));
        // La clase .dark ya no pinta nada (todo va por variables), pero define
        // color-scheme para que los selectores nativos de fecha y color no
        // salgan blancos sobre un tema oscuro.
        const dark = utils.isDarkColor(palette.base);
        root.classList.toggle('dark', dark);
        root.style.colorScheme = dark ? 'dark' : 'light';
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
        const btn = document.getElementById('export-share-btn');
        if (btn) btn.onclick = () => { app.closeExportModal(); app.showShareModal('account', store.currentAccountId); };
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

    folderTotal: (folderId) => app.visibleIn(folderId)
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
        const ids = app.visibleIn(store.currentFolderId).map(a => a.id);
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
        b.className = 'w-full flex items-center gap-4 p-4 rounded-xl bg-content/5 hover:bg-content/10 transition text-left';
        b.innerHTML = `
            <div class="bg-primary/15 p-3 rounded-full text-primary shrink-0"><i data-lucide="${icon}" class="w-6 h-6"></i></div>
            <div class="min-w-0">
                <h4 class="font-bold text-content truncate">${label}</h4>
                <p class="text-xs text-muted">${sub}</p>
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
        ghost.className = 'fixed z-[90] pointer-events-none bg-primary text-on-primary px-4 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 -translate-x-1/2 -translate-y-1/2';
        ghost.innerHTML = `<i data-lucide="folder" class="w-4 h-4"></i> ${n} ${n === 1 ? 'cuenta' : 'cuentas'}`;
        document.body.appendChild(ghost);
        lucide.createIcons();

        app.drag = { ghost, x, y, overId: null };
        document.body.style.touchAction = 'none';
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
        show('home-folder-share', !selecting && inFolder);
        show('home-settings-btn', !selecting);
        show('home-fab', !selecting);

        if (inFolder) {
            const f = store.folders.find(x => x.id === store.currentFolderId);
            const total = app.accountsIn(store.currentFolderId).length;
            const shown = app.visibleIn(store.currentFolderId).length;
            document.getElementById('home-folder-name').innerText = f ? f.name : 'Carpeta';
            document.getElementById('home-folder-meta').innerText = store.categoryFilter === null
                ? `${total} ${total === 1 ? 'cuenta' : 'cuentas'}`
                : `${shown} de ${total}`;
        }
        if (selecting) {
            const n = store.selection.size;
            const all = app.visibleIn(store.currentFolderId).length;
            document.getElementById('home-select-count').innerText = `${n} ${n === 1 ? 'seleccionada' : 'seleccionadas'}`;
            document.getElementById('home-select-all').innerText = (all > 0 && n === all) ? 'Ninguna' : 'Todas';
        }
    },

    renderHome: () => {
        const list = document.getElementById('accounts-list');
        app.syncHomeChrome();
        app.renderFilters();
        list.innerHTML = '';

        const folderId = store.currentFolderId;
        const accounts = app.visibleIn(folderId);
        // Sin filtro se listan todas las carpetas (incluidas las vacías); con
        // filtro solo las que tienen alguna cuenta que pase.
        const folders = folderId ? []
            : (store.categoryFilter === null ? store.folders
                                             : store.folders.filter(f => app.visibleIn(f.id).length > 0));

        if (folders.length === 0 && accounts.length === 0 && store.categoryFilter !== null) {
            list.innerHTML = `<div class="text-center py-10 text-muted bg-surface rounded-xl border border-dashed border-line text-sm">Ninguna cuenta con las categorías elegidas.<br>Ajusta los filtros de arriba.</div>`;
            lucide.createIcons();
            return;
        }

        if (folders.length === 0 && accounts.length === 0) {
            list.innerHTML = folderId
                ? `<div class="text-center py-10 text-muted bg-surface rounded-xl border border-dashed border-line text-sm">Esta carpeta está vacía.<br>Arrastra cuentas aquí o usa "Mover a…".</div>`
                : `
                <div class="flex flex-col items-center justify-center text-center h-full min-h-[60vh] px-6">
                    <img src="${import.meta.env.BASE_URL}logo.svg" alt="" draggable="false" width="96" height="96" class="w-24 h-24 mb-6">
                    <h2 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 pb-1">Cuentas Claras</h2>
                    <p class="text-sm text-muted mt-2 mb-8">Aún no tienes cuentas. Crea la primera para empezar a dividir gastos.</p>
                    <button onclick="app.showAddAccountModal()" class="bg-primary text-on-primary px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 ios-btn flex items-center gap-2">
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
        const total = app.accountsIn(f.id).length;
        const shown = app.visibleIn(f.id).length;
        const cuenta = store.categoryFilter === null
            ? `${total} ${total === 1 ? 'cuenta' : 'cuentas'}`
            : `${shown} de ${total}`;
        const selecting = !!store.selection;
        const el = document.createElement('div');
        el.dataset.folderId = f.id;
        el.className = 'bg-surface p-4 rounded-xl shadow-sm border border-line flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer';
        el.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <i data-lucide="folder" class="w-6 h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="font-bold text-content truncate">${f.name}</h3>
                    <p class="text-xs font-medium text-primary">${cuenta} · ${utils.formatCurrency(app.folderTotal(f.id))}</p>
                </div>
            </div>
            ${selecting ? '<span class="text-xs font-bold text-primary shrink-0 pl-2">Soltar aquí</span>' : `
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="app.renameFolder('${f.id}', event)" aria-label="Renombrar carpeta" class="w-11 h-11 flex items-center justify-center text-muted hover:text-primary transition rounded-full hover:bg-primary/10">
                    <i data-lucide="pencil" class="w-5 h-5"></i>
                </button>
                <button onclick="app.deleteFolder('${f.id}', event)" aria-label="Eliminar carpeta" class="w-11 h-11 flex items-center justify-center text-muted hover:text-danger transition rounded-full hover:bg-danger/10">
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
        el.className = `bg-surface p-4 rounded-xl shadow-sm border flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer group ${selected ? 'border-primary ring-2 ring-primary/40' : 'border-line'}`;
        el.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                ${selecting ? `<div class="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? 'bg-primary border-primary text-on-primary' : 'border-line'}">${selected ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}</div>` : ''}
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">${cat.emoji}</div>
                <div class="min-w-0">
                    <h3 class="font-bold text-content truncate">${acc.name}</h3>
                    <div class="flex items-center gap-2">
                        <p class="text-xs font-medium text-primary">${utils.formatCurrency(total)}</p>
                        ${isSettled ? '<span class="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/30 flex items-center gap-0.5"><i data-lucide="check" class="w-3 h-3"></i> SALDADO</span>' : ''}
                    </div>
                </div>
            </div>
            ${selecting ? '' : `
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="app.showEditAccountModal('${acc.id}', event)" aria-label="Editar cuenta" class="w-11 h-11 flex items-center justify-center text-muted hover:text-primary transition rounded-full hover:bg-primary/10">
                    <i data-lucide="pencil" class="w-5 h-5"></i>
                </button>
                <button onclick="app.deleteAccountFromHome('${acc.id}', event)" aria-label="Eliminar cuenta" class="w-11 h-11 flex items-center justify-center text-muted hover:text-danger transition rounded-full hover:bg-danger/10">
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
            btn.innerHTML = `<div class="w-10 h-10 rounded-full bg-content/5 border border-line flex items-center justify-center text-primary hover:bg-content/10 transition"><i data-lucide="plus" class="w-5 h-5"></i></div><span class="text-[10px] text-muted">Añadir</span>`;
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
                        <div class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-sm border-2 border-surface">
                            ${p.name.substring(0,2).toUpperCase()}
                        </div>
                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition shadow-sm border border-base">
                            <i data-lucide="x" class="w-2 h-2"></i>
                        </div>
                    </div>
                    <span class="text-[10px] text-muted truncate w-full text-center group-hover:text-danger transition">${p.name}</span>
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
            expList.innerHTML = `<div class="text-center py-8 text-muted bg-surface rounded-xl border border-dashed border-line text-sm">No hay actividad.<br>¡Añade un gasto!</div>`;
        } else {
            allItems.forEach((item) => {
                const el = document.createElement('div');
                if (item.kind === 'expense') {
                    el.className = 'flex items-center justify-between p-3 bg-surface rounded-xl border border-line cursor-pointer active:scale-[0.99] transition-transform';
                    el.onclick = (ev) => { if (!ev.target.closest('button')) app.showEditExpenseModal(item.id); };
                    const dateBadge = item.userDate ? `<span class="text-[10px] bg-content/10 text-muted px-1.5 py-0.5 rounded ml-2">${utils.formatDate(item.userDate).slice(0,5)}</span>` : '';
                    
                    // Visualización si es personal
                    let infoLine = `<p class="text-xs text-muted">Pagó: ${item.payer}</p>`;
                    let icon = `<div class="bg-primary/10 p-2 rounded-lg text-primary shrink-0"><i data-lucide="receipt" class="w-5 h-5"></i></div>`;
                    
                    if (item.type === 'individual') {
                        icon = `<div class="bg-amber-500/10 p-2 rounded-lg text-amber-500 shrink-0"><i data-lucide="user" class="w-5 h-5"></i></div>`;
                        infoLine = `<p class="text-xs text-amber-500 font-medium">Personal: ${item.payer} <i data-lucide="arrow-right" class="w-3 h-3 inline"></i> ${item.beneficiary}</p>`;
                    }

                    el.innerHTML = `
                        <div class="flex items-center gap-3 overflow-hidden">
                            ${icon}
                            <div class="truncate">
                                <div class="flex items-center">
                                    <h4 class="font-bold text-content text-sm truncate">${item.desc}</h4>
                                    ${dateBadge}
                                </div>
                                ${infoLine}
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="font-bold text-content">${utils.formatCurrency(item.amount)}</span>
                            <button onclick="app.deleteExpense('${item.id}')" aria-label="Eliminar gasto" class="w-10 h-10 -mr-1 shrink-0 flex items-center justify-center text-muted hover:text-danger rounded-full hover:bg-danger/10 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    `;
                } else {
                    el.className = 'flex items-center justify-between p-3 bg-secondary/10 rounded-xl border border-secondary/30';
                    el.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="bg-secondary/20 p-2 rounded-lg text-secondary shrink-0"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div>
                            <div>
                                <h4 class="font-bold text-content text-sm">Pago registrado</h4>
                                <p class="text-xs text-muted">${item.from} pagó a ${item.to}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="font-bold text-secondary">${utils.formatCurrency(item.amount)}</span>
                            <button onclick="app.deletePayment('${item.id}')" aria-label="Eliminar pago" class="w-10 h-10 -mr-1 shrink-0 flex items-center justify-center text-muted hover:text-danger rounded-full hover:bg-danger/10 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
            list.innerHTML = `<div class="text-center py-6"><div class="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-3 text-secondary"><i data-lucide="check" class="w-8 h-8"></i></div><p class="text-muted font-medium">¡Todo pagado! Nadie debe nada.</p></div>`;
        } else {
            transactions.forEach(t => {
                const el = document.createElement('div');
                el.className = 'flex items-center justify-between p-4 bg-surface rounded-xl border border-line shadow-sm';
                el.innerHTML = `
                    <div class="flex flex-col flex-1 min-w-0 mr-3">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-content">${t.from}</span>
                            <i data-lucide="arrow-right" class="w-4 h-4 text-muted"></i>
                            <span class="font-bold text-content">${t.to}</span>
                        </div>
                        <span class="text-lg font-bold text-primary">${utils.formatCurrency(t.amount)}</span>
                    </div>
                    <button onclick="app.settleDebt('${t.from}', '${t.to}', ${t.amount})" class="bg-secondary/20 text-secondary px-4 py-2 rounded-lg text-sm font-bold hover:bg-secondary/30 transition flex items-center gap-1">
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
    
    // --- CONFIGURACION: TEMAS ---
    renderSettings: () => {
        const v = document.getElementById('app-version');
        if (v) v.innerText = app.version();
        app.renderThemes();
        store.editingCategoryIndex = null;
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-emoji').value = '';
        app.syncCategoryForm();
        app.renderCategories();
    },

    renderThemes: () => {
        const wrap = document.getElementById('settings-themes');
        wrap.innerHTML = '';

        store.themes.forEach(theme => {
            const c = theme.colors;
            const isActive = theme.id === store.themeId;
            const el = document.createElement('div');
            el.className = `rounded-xl overflow-hidden border transition cursor-pointer ${isActive ? 'border-primary ring-2 ring-primary/40' : 'border-line'}`;
            // La miniatura se pinta con los colores del tema, no con los del
            // tema activo: por eso va en style y no en clases.
            el.innerHTML = `
                <div class="p-3 h-20 flex flex-col justify-center gap-1.5" style="background:${c.base}">
                    <div class="rounded-lg p-2 flex items-center gap-2" style="background:${c.surface};border:1px solid ${c.line}">
                        <div class="w-4 h-4 rounded-full shrink-0" style="background:${c.primary}"></div>
                        <div class="flex-1 min-w-0 space-y-1">
                            <div class="h-1.5 rounded-full w-4/5" style="background:${c.content}"></div>
                            <div class="h-1.5 rounded-full w-1/2" style="background:${c.muted}"></div>
                        </div>
                        <div class="w-3 h-3 rounded-full shrink-0" style="background:${c.secondary}"></div>
                    </div>
                </div>
                <div class="bg-surface px-3 py-2 flex items-center justify-between gap-1">
                    <div class="min-w-0 flex items-center gap-1.5">
                        ${isActive ? '<i data-lucide="check" class="w-4 h-4 text-primary shrink-0"></i>' : ''}
                        <span class="text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-content'}">${theme.name}</span>
                    </div>
                    <div class="flex items-center shrink-0">
                        <button onclick="app.showThemeModal('${theme.id}', event)" aria-label="Editar ${theme.name}" class="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-primary/10 transition">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button onclick="app.deleteTheme('${theme.id}', event)" aria-label="Eliminar ${theme.name}" class="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 transition">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>`;
            el.onclick = (e) => { if (!e.target.closest('button')) app.selectTheme(theme.id); };
            wrap.appendChild(el);
        });

        const add = document.createElement('button');
        add.className = 'rounded-xl border border-dashed border-line bg-content/5 hover:bg-content/10 transition flex flex-col items-center justify-center gap-2 min-h-[7.5rem] text-primary';
        add.onclick = () => app.showThemeModal();
        add.innerHTML = '<i data-lucide="plus" class="w-6 h-6"></i><span class="text-xs font-bold">Nuevo tema</span>';
        wrap.appendChild(add);

        lucide.createIcons();
    },

    selectTheme: (id) => {
        if (!store.themes.some(t => t.id === id)) return;
        store.themeId = id;
        utils.save();
        app.applyTheme();
        app.renderThemes();
    },

    uniqueThemeName: (base) => {
        const taken = new Set(store.themes.map(t => t.name));
        if (!taken.has(base)) return base;
        let n = 2;
        while (taken.has(`${base} ${n}`)) n++;
        return `${base} ${n}`;
    },

    showThemeModal: (id, event) => {
        if (event) event.stopPropagation();
        const existing = id ? store.themes.find(t => t.id === id) : null;
        if (id && !existing) return;

        store.themeDraft = existing
            ? { id: existing.id, name: existing.name, colors: { ...existing.colors }, isNew: false }
            : { id: utils.generateId(), name: app.uniqueThemeName('Mi tema'), colors: { ...app.activeTheme().colors }, isNew: true };

        document.getElementById('theme-modal-title').innerText = existing ? 'Editar Tema' : 'Nuevo Tema';
        document.getElementById('theme-name').value = store.themeDraft.name;

        const list = document.getElementById('theme-colors');
        list.innerHTML = THEME_KEYS.map(key => `
            <label class="flex items-center justify-between gap-3 p-3 rounded-xl bg-content/5 border border-line cursor-pointer">
                <div class="min-w-0">
                    <h5 class="font-bold text-sm text-content">${themeLabels[key][0]}</h5>
                    <p class="text-xs text-muted truncate">${themeLabels[key][1]}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span id="theme-hex-${key}" class="text-xs text-muted tabular-nums">${store.themeDraft.colors[key]}</span>
                    <input type="color" id="theme-color-${key}" value="${store.themeDraft.colors[key]}" aria-label="${themeLabels[key][0]}" oninput="app.setDraftColor('${key}', this.value)" class="w-10 h-10 rounded-lg">
                </div>
            </label>`).join('');

        const btn = document.getElementById('theme-save');
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.innerText = existing ? 'Guardar cambios' : 'Crear tema';
        fresh.onclick = () => app.saveTheme();

        const modal = document.getElementById('modal-theme');
        const panel = document.getElementById('modal-theme-panel');
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('translate-y-full'); }, 10);
    },

    setDraftColor: (key, hex) => {
        const draft = store.themeDraft;
        if (!draft || !utils.hexToRgb(hex)) return;
        draft.colors[key] = hex.toUpperCase();
        const label = document.getElementById(`theme-hex-${key}`);
        if (label) label.innerText = draft.colors[key];
        // Vista previa en vivo solo si estás editando el tema que está puesto.
        if (draft.id === store.themeId) app.applyColors(draft.colors);
    },

    saveTheme: () => {
        const draft = store.themeDraft;
        if (!draft) return;
        const name = document.getElementById('theme-name').value.trim();
        if (!name) return utils.showToast('Ponle un nombre al tema');
        draft.name = name;

        const saved = { id: draft.id, name: draft.name, colors: { ...draft.colors } };
        const i = store.themes.findIndex(t => t.id === draft.id);
        if (i === -1) store.themes.push(saved);
        else store.themes[i] = saved;

        if (draft.isNew) store.themeId = saved.id;
        store.themeDraft = null;
        utils.save();
        app.applyTheme();
        app.renderThemes();
        app.closeThemeModal();
        utils.showToast(draft.isNew ? `Tema "${name}" creado` : 'Tema actualizado');
    },

    deleteTheme: (id, event) => {
        if (event) event.stopPropagation();
        const theme = store.themes.find(t => t.id === id);
        if (!theme) return;
        if (store.themes.length === 1) return utils.showToast('Tiene que quedar al menos un tema');

        app.confirmAction(`¿Borrar el tema "${theme.name}"?`, () => {
            store.themes = store.themes.filter(t => t.id !== id);
            if (store.themeId === id) store.themeId = store.themes[0].id;
            utils.save();
            app.applyTheme();
            app.renderThemes();
            utils.showToast('Tema eliminado');
        });
    },

    resetThemes: () => {
        app.confirmAction('Vuelven los 5 temas de fábrica y se descartan los personalizados.', () => {
            store.themes = cloneFactory();
            if (!store.themes.some(t => t.id === store.themeId)) store.themeId = 'dark';
            utils.save();
            app.applyTheme();
            app.renderThemes();
            utils.showToast('Temas restaurados');
        }, 'Restaurar');
    },

    closeThemeModal: () => {
        store.themeDraft = null;
        app.applyTheme();   // descarta la vista previa en vivo
        const modal = document.getElementById('modal-theme');
        const panel = document.getElementById('modal-theme-panel');
        modal.classList.add('opacity-0'); panel.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    // --- ACTUALIZACIONES ---
    version: () => (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '?'),

    swRegistration: null,

    // El navegador solo busca un sw.js nuevo cuando hay una carga real de página
    // dentro del scope. Una PWA instalada que se reanuda desde el launcher puede
    // pasar días sin arrancar en frío y no enterarse nunca de que hay versión
    // nueva. Por eso preguntamos nosotros: cada hora y cada vez que la app vuelve
    // a primer plano.
    onSWRegistered: (registration) => {
        app.swRegistration = registration || null;
        if (!registration) return;
        const buscar = () => registration.update().catch(() => {});
        setInterval(buscar, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') buscar();
        });
        window.addEventListener('online', buscar);
    },

    // Un mensaje, al terminar. Si además hay un service worker esperando,
    // onNeedRefresh muestra la barra por su cuenta.
    checkForUpdates: async () => {
        const actual = app.version();
        const nueva = await app.fetchNewVersion();
        if (app.swRegistration) {
            try { await utils.withTimeout(app.swRegistration.update(), 8000); } catch (e) { /* sin red */ }
        }
        if (nueva === null) return utils.showToast('Sin conexión: no se pudo comprobar');
        if (nueva !== actual) return utils.showToast(`Versión ${nueva} disponible. Recarga para aplicarla.`);
        utils.showToast(`Ya tienes la última versión (${actual})`);
    },

    // La versión que trae la actualización que espera. version.json no está en el
    // precache, así que esto lo responde la red: es la del build nuevo. El
    // parámetro extra evita además la caché HTTP.
    fetchNewVersion: async () => {
        try {
            const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`;
            // En una red móvil mala un fetch puede quedar colgado sin fallar
            // nunca; sin este corte el botón no respondería jamás.
            const res = await utils.withTimeout(fetch(url, { cache: 'no-store' }), 8000);
            if (!res || !res.ok) return null;
            const data = await res.json();
            return typeof data.version === 'string' ? data.version : null;
        } catch (e) { return null; }
    },

    showUpdateBar: async (apply) => {
        const bar = document.getElementById('update-bar');
        if (!bar) return;

        const nueva = await app.fetchNewVersion();
        const actual = app.version();
        if (nueva && nueva !== actual) {
            document.getElementById('update-title').innerText = `Versión ${nueva} disponible`;
            // Los builds anteriores a esta versión no llevan número: ahí no tiene
            // sentido decir "tienes la ?".
            document.getElementById('update-sub').innerText = actual === '?'
                ? 'Se aplica al recargar. Tus cuentas no se tocan.'
                : `Tienes la ${actual}. Se aplica al recargar; tus cuentas no se tocan.`;
        } else {
            document.getElementById('update-title').innerText = 'Hay una versión nueva';
            document.getElementById('update-sub').innerText = 'Se aplica al recargar. Tus cuentas no se tocan.';
        }

        document.getElementById('update-now').onclick = () => {
            // La marca sobrevive a la recarga: sirve para confirmar del otro lado
            // que lo que pasó fue una actualización y no un cierre raro.
            try { localStorage.setItem('cc_updated', app.version()); } catch (e) {}
            bar.classList.add('hidden');
            apply();
        };
        bar.classList.remove('hidden');
        lucide.createIcons();
    },

    dismissUpdate: () => {
        const bar = document.getElementById('update-bar');
        if (bar) bar.classList.add('hidden');
    },

    announceUpdate: () => {
        try {
            const anterior = localStorage.getItem('cc_updated');
            if (!anterior) return;
            localStorage.removeItem('cc_updated');
            const ahora = app.version();
            const texto = anterior !== ahora ? `Actualizada a la versión ${ahora}` : 'App actualizada';
            setTimeout(() => utils.showToast(texto), 500);
        } catch (e) {}
    },

    // --- COMPARTIR ---
    // Más allá de esto el QR queda tan denso que cuesta escanearlo desde una
    // pantalla; a partir de acá se ofrece enlace o archivo.
    SHARE_QR_LIMIT: 2200,

    categoriesFor: (accounts) => {
        const ids = new Set(accounts.map(a => String(a.categoryId)));
        return store.categories.filter(c => ids.has(String(c.id)));
    },

    buildSharePayload: (kind, id) => {
        // folderId no viaja: los ids de carpeta del que recibe son otros.
        const strip = (a) => { const { folderId, ...resto } = a; return resto; };
        if (kind === 'folder') {
            const folder = store.folders.find(f => f.id === id);
            if (!folder) return null;
            const accounts = app.accountsIn(id);
            if (!accounts.length) return null;
            return { v: 1, k: 'folder', name: folder.name, accounts: accounts.map(strip), categories: app.categoriesFor(accounts) };
        }
        const acc = store.accounts.find(a => a.id === id);
        if (!acc) return null;
        return { v: 1, k: 'account', name: acc.name, accounts: [strip(acc)], categories: app.categoriesFor([acc]) };
    },

    encodeShare: async (payload) => {
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        if (typeof CompressionStream !== 'function') return '0' + utils.toBase64Url(bytes);
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
        return '1' + utils.toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
    },

    decodeShare: async (code) => {
        let bytes = utils.fromBase64Url(code.slice(1));
        if (code[0] === '1') {
            const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
            bytes = new Uint8Array(await new Response(stream).arrayBuffer());
        }
        return JSON.parse(new TextDecoder().decode(bytes));
    },

    shareCurrentFolder: () => app.showShareModal('folder', store.currentFolderId),

    showShareModal: async (kind, id, event) => {
        if (event) event.stopPropagation();
        const payload = app.buildSharePayload(kind, id);
        if (!payload) return utils.showToast('No hay nada para compartir');

        const code = await app.encodeShare(payload);
        const url = `${location.origin}${import.meta.env.BASE_URL}#s=${code}`;
        store.share = { payload, url };

        const nGastos = payload.accounts.reduce((n, a) => n + (a.expenses || []).length, 0);
        document.getElementById('share-title').innerText = `Compartir ${payload.name}`;
        document.getElementById('share-sub').innerText =
            `${payload.accounts.length} ${payload.accounts.length === 1 ? 'cuenta' : 'cuentas'} · ${nGastos} ${nGastos === 1 ? 'gasto' : 'gastos'}`;

        const cabe = code.length <= app.SHARE_QR_LIMIT;
        document.getElementById('share-qr-wrap').classList.toggle('hidden', !cabe);
        document.getElementById('share-qr-hint').classList.toggle('hidden', !cabe);
        document.getElementById('share-too-big').classList.toggle('hidden', cabe);
        if (cabe) {
            const QR = (await import('qrcode')).default;
            document.getElementById('share-qr').innerHTML = await QR.toString(url, {
                type: 'svg', errorCorrectionLevel: 'L', margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
            });
            const svg = document.querySelector('#share-qr svg');
            if (svg) { svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); }
        }

        const modal = document.getElementById('modal-share');
        const panel = document.getElementById('modal-share-panel');
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); panel.classList.remove('translate-y-full'); }, 10);
        lucide.createIcons();
    },

    closeShareModal: () => {
        store.share = null;
        const modal = document.getElementById('modal-share');
        const panel = document.getElementById('modal-share-panel');
        modal.classList.add('opacity-0'); panel.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    shareLink: async () => {
        if (!store.share) return;
        const { payload, url } = store.share;
        const texto = `Te comparto "${payload.name}" de Cuentas Claras`;
        try {
            if (navigator.share) { await navigator.share({ title: payload.name, text: texto, url }); return; }
            await navigator.clipboard.writeText(url);
            utils.showToast('Enlace copiado');
        } catch (e) { /* el usuario canceló la hoja de compartir */ }
    },

    shareFile: async () => {
        if (!store.share) return;
        const { payload } = store.share;
        const nombre = `${payload.name.replace(/\s+/g, '-')}.json`;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        try {
            const file = new File([blob], nombre, { type: 'application/json' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: payload.name });
                return;
            }
        } catch (e) { /* cae a la descarga */ }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = nombre; link.click();
        URL.revokeObjectURL(url);
        utils.showToast('Archivo descargado');
    },

    // --- RECIBIR ---
    checkIncomingShare: async () => {
        const m = /^#s=(.+)$/.exec(location.hash);
        if (!m) return;
        // Se limpia el hash ya: si no, recargar volvería a ofrecer la importación.
        history.replaceState(null, '', location.pathname + location.search);

        let payload;
        try { payload = await app.decodeShare(m[1]); }
        catch (e) { return utils.showToast('El enlace compartido no se pudo leer'); }
        if (!payload || !Array.isArray(payload.accounts) || !payload.accounts.length) {
            return utils.showToast('El enlace no trae cuentas');
        }

        const nombre = utils.clean(payload.name || 'lo compartido');
        const nCuentas = payload.accounts.length;
        const nGastos = payload.accounts.reduce((n, a) => n + ((a && a.expenses) || []).length, 0);
        const detalle = payload.k === 'folder'
            ? `la carpeta "${nombre}" con ${nCuentas} ${nCuentas === 1 ? 'cuenta' : 'cuentas'} y ${nGastos} ${nGastos === 1 ? 'gasto' : 'gastos'}`
            : `la cuenta "${nombre}" con ${nGastos} ${nGastos === 1 ? 'gasto' : 'gastos'}`;

        app.confirmAction(`Te compartieron ${detalle}. Se agrega a tus cuentas sin tocar lo que ya tienes.`,
            () => app.importShared(payload), 'Importar');
    },

    importShared: (payload) => {
        const catMap = app.reconcileCategories(payload.categories);
        const esCarpeta = payload.k === 'folder';
        let folderId = null;

        if (esCarpeta) {
            const folder = { id: utils.generateId(), name: app.uniqueFolderName(utils.clean(payload.name) || 'Compartido') };
            store.folders.push(folder);
            folderId = folder.id;
        }

        const cuentas = payload.accounts
            .filter(a => a && typeof a.name === 'string' && a.name.trim())
            .map(a => app.normalizeAccount(a, folderId, catMap));

        store.accounts = cuentas.concat(store.accounts);
        utils.save();
        app.renderHome();
        utils.showToast(`${cuentas.length} ${cuentas.length === 1 ? 'cuenta importada' : 'cuentas importadas'}`);
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
            themes: store.themes,
            themeId: store.themeId
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `cuentas-claras-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        utils.showToast('Datos exportados');
    },

    // Las categorías que llegan se reconcilian por nombre; las que faltan se
    // crean con id local, si no las cuentas caerían todas en "General".
    reconcileCategories: (list) => {
        const catMap = {};
        (Array.isArray(list) ? list : []).forEach(c => {
            if (!c || typeof c.name !== 'string') return;
            const nombre = utils.clean(c.name, 40);
            if (!nombre) return;
            const local = store.categories.find(x => x.name === nombre);
            if (local) {
                catMap[c.id] = local.id;
            } else {
                const created = { id: Date.now() + Math.floor(Math.random() * 10000), name: nombre, emoji: utils.clean(c.emoji, 4) || '📦' };
                store.categories.push(created);
                catMap[c.id] = created.id;
            }
        });
        return catMap;
    },

    // Ids nuevos (los de afuera pueden chocar con los de acá) y todo el texto
    // saneado, venga de un archivo o de un enlace.
    normalizeAccount: (a, folderId, catMap) => ({
        id: utils.generateId(),
        name: utils.clean(a.name, 60),
        categoryId: catMap[a.categoryId] !== undefined ? catMap[a.categoryId] : store.categories[0].id,
        date: a.date || new Date().toISOString(),
        eventDate: a.eventDate || null,
        folderId: folderId,
        participants: (Array.isArray(a.participants) ? a.participants : [])
            .filter(pt => pt && pt.name)
            .map(pt => ({ id: utils.generateId(), name: utils.clean(pt.name, 40) })),
        expenses: (Array.isArray(a.expenses) ? a.expenses : [])
            .filter(e => e && Number(e.amount) > 0)
            .map(e => ({
                id: utils.generateId(),
                desc: utils.clean(e.desc, 80),
                amount: Number(e.amount),
                payer: utils.clean(e.payer, 40),
                date: e.date || new Date().toISOString(),
                userDate: e.userDate || null,
                type: e.type === 'individual' ? 'individual' : 'group',
                ...(e.type === 'individual' ? { beneficiary: utils.clean(e.beneficiary, 40) } : {})
            })),
        payments: (Array.isArray(a.payments) ? a.payments : [])
            .filter(pg => pg && Number(pg.amount) > 0)
            .map(pg => ({
                id: utils.generateId(),
                from: utils.clean(pg.from, 40),
                to: utils.clean(pg.to, 40),
                amount: Number(pg.amount),
                date: pg.date || new Date().toISOString()
            }))
    }),

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

        const catMap = app.reconcileCategories(data.categories);
        const folder = { id: utils.generateId(), name: app.uniqueFolderName(`Importado ${utils.formatDate(new Date().toISOString())}`) };
        const imported = incoming.map(a => app.normalizeAccount(a, folder.id, catMap));

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
            el.className = 'flex items-center justify-between p-3 bg-surface rounded-xl border border-line';
            const editing = store.editingCategoryIndex === index;
            if (editing) el.className += ' ring-2 ring-primary border-primary';
            el.innerHTML = `
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 shrink-0 rounded-full bg-content/5 flex items-center justify-center text-xl">${cat.emoji}</div>
                    <span class="font-medium text-content truncate">${cat.name}</span>
                </div>
                <div class="flex items-center shrink-0">
                    <button onclick="app.editCategory(${index})" aria-label="Editar ${cat.name}" class="w-10 h-10 flex items-center justify-center text-muted hover:text-primary transition rounded-full hover:bg-primary/10">
                        <i data-lucide="pencil" class="w-5 h-5"></i>
                    </button>
                    ${isDefault
                        ? '<span class="text-xs text-muted bg-content/10 px-2 py-1 rounded ml-1">Default</span>'
                        : `<button onclick="app.deleteCategory(${index})" aria-label="Eliminar ${cat.name}" class="w-10 h-10 flex items-center justify-center text-muted hover:text-danger transition rounded-full hover:bg-danger/10">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>`}
                </div>`;
            list.appendChild(el);
        });
        lucide.createIcons();
    },
    // El mismo formulario crea y edita: editingCategoryIndex decide cuál.
    editCategory: (index) => {
        const cat = store.categories[index];
        if (!cat) return;
        store.editingCategoryIndex = index;
        document.getElementById('cat-name').value = cat.name;
        document.getElementById('cat-emoji').value = cat.emoji;
        app.syncCategoryForm();
        app.renderCategories();
        document.getElementById('cat-name').focus();
    },

    cancelEditCategory: () => {
        store.editingCategoryIndex = null;
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-emoji').value = '';
        app.syncCategoryForm();
        app.renderCategories();
    },

    syncCategoryForm: () => {
        const editing = store.editingCategoryIndex !== null;
        const save = document.getElementById('cat-save');
        const cancel = document.getElementById('cat-cancel');
        if (!save || !cancel) return;
        cancel.classList.toggle('hidden', !editing);
        cancel.classList.toggle('flex', editing);
        save.setAttribute('aria-label', editing ? 'Guardar categoría' : 'Agregar categoría');
        save.innerHTML = `<i data-lucide="${editing ? 'check' : 'plus'}" class="w-6 h-6"></i>`;
        document.getElementById('cat-name').placeholder = editing ? 'Nombre de la categoría' : 'Nueva Categoría';
        lucide.createIcons();
    },

    saveCategory: () => {
        const name = document.getElementById('cat-name').value.trim();
        const emoji = document.getElementById('cat-emoji').value.trim() || '📦';
        if (!name) return utils.showToast('Ponle un nombre a la categoría');

        if (store.editingCategoryIndex !== null) {
            const cat = store.categories[store.editingCategoryIndex];
            if (cat) {
                cat.name = name;
                cat.emoji = emoji;
                utils.save();
                utils.showToast('Categoría actualizada');
            }
            app.cancelEditCategory();
            return;
        }

        store.categories.push({ id: Date.now(), name, emoji });
        store.categoryFilter = null;
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
            store.categoryFilter = null;
            store.editingCategoryIndex = null;
            utils.save();
            app.syncCategoryForm();
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
