// ==========================================
// 1. IMPORT FIREBASE SERVICES VIA CDN
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Kitufe cha kuonyesha/kuficha nenosiri (Eye Toggle)
window.togglePassword = function(inputId, iconElement) {
    const passwordInput = document.getElementById(inputId);
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        iconElement.classList.replace("fa-eye-slash", "fa-eye");
    } else {
        passwordInput.type = "password";
        iconElement.classList.replace("fa-eye", "fa-eye-slash");
    }
};

// ==========================================
// 2. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAU8xXa4IOwHCcjCVHoTdIOKaAG5DYogqM",
  authDomain: "jimmy--smart-duka-security.firebaseapp.com",
  projectId: "jimmy--smart-duka-security",
  storageBucket: "jimmy--smart-duka-security.firebasestorage.app",
  messagingSenderId: "162105368684",
  appId: "1:162105368684:web:8f39541ab5e2e75c63b849",
  measurementId: "G-J33QFGEL27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Namba ya Admin na Email Maalumu ya Kuingia kwenye Super Control
const MY_WHATSAPP_NUMBER = "255614262362"; 
const ADMIN_EMAIL = "jamalialcantara@gmail.com"; 

// Global States
let currentUserData = null;
let systemLogs = [];

// Local Memory za Duka (Kwa ajili ya data za mtumiaji)
let appProducts = [];
let appSales = [];
let appDebts = [];
let appExpenses = [];

// ==========================================
// WINDOW BINDING (Kuruhusu HTML kusoma Functions)
// ==========================================
window.showSection = showSection;
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.handleForgotPassword = handleForgotPassword;
window.redirectToWhatsApp = redirectToWhatsApp;
window.enterSystemMainDashboard = enterSystemMainDashboard;
window.handleLogout = handleLogout;
window.switchUserTab = switchUserTab;

// Admin Window Binding
window.approveUserPackage = approveUserPackage;
window.sendGlobalBroadcast = sendGlobalBroadcast;
window.filterSystemLogs = filterSystemLogs;

// User Core Window Binding
window.addStockProduct = addStockProduct;
window.processPOSSale = processPOSSale;
window.addDebtor = addDebtor;
window.addExpense = addExpense;
window.remindDebtorViaWhatsApp = remindDebtorViaWhatsApp;
window.shareReportViaWhatsApp = shareReportViaWhatsApp;

// Kudhibiti kurasa za Login/Register/Forgot
function showSection(sectionId) {
    document.getElementById("login-form-section").classList.add("hidden");
    document.getElementById('register-section').classList.add("hidden");
    document.getElementById('forgot-section').classList.add("hidden");
    document.getElementById(sectionId).classList.remove("hidden");
}

// ==========================================
// SECURITY AUDIT TRAIL LOGIC (Admin View Only)
// ==========================================
function logSecurityEvent(action, details) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const name = currentUserData ? currentUserData.name : "Mgeni";
    const role = currentUserData ? currentUserData.role.toUpperCase() : "GUEST";

    let logData = { time: timeStr, user: `${name} (${role})`, action, details };
    systemLogs.unshift(logData);
    renderSystemLogs(systemLogs);
}

function renderSystemLogs(logsArray) {
    const logsDiv = document.getElementById("system-logs-div");
    if (!logsDiv) return;
    logsDiv.innerHTML = "";
    
    if (logsArray.length === 0) {
        logsDiv.innerHTML = `<p style="color: #94a3b8; font-style: italic;">Hakuna matukio yaliyopatikana...</p>`;
        return;
    }
    
    logsArray.forEach(log => {
        let p = document.createElement("div");
        p.className = "log-entry";
        p.innerHTML = `<span><i class="fa fa-caret-right"></i> [${log.user}] : <strong>${log.action}</strong> -> ${log.details}</span><span class="log-time">${log.time}</span>`;
        logsDiv.appendChild(p);
    });
}

function filterSystemLogs(filterType) {
    if (filterType === "ALL") {
        renderSystemLogs(systemLogs);
    } else {
        const filtered = systemLogs.filter(log => log.action === filterType);
        renderSystemLogs(filtered);
    }
}

// ==========================================
// 3. REGISTRATION (OFA YA SIKU 3 - KAMILI KWA SAA NA DAKIKA)
// ==========================================
async function handleRegister() {
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const phone = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!name || !email || !phone || !password) {
        alert("Tafadhali jaza nafasi zote!");
        return;
    }

    const role = (email === ADMIN_EMAIL) ? "admin" : "user";
    
    // Mahesabu kamili ya masaa na dakika (Siku 3 tangu sasa hivi)
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(now.getDate() + 3); 

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
            uid: user.uid,
            name: name,
            email: email,
            phone: phone,
            role: role,
            createdAt: now.toISOString(),
            packageExpiryDate: expiryDate.toISOString(), 
            isPaid: role === 'admin' ? true : false,
            kifurushiAina: role === 'admin' ? "Admin Lifetime" : "Ofa ya Siku 3 za Bure"
        };

        await setDoc(doc(db, "users", user.uid), userData);
        currentUserData = userData;

        logSecurityEvent("USAJILI KABISA", `Akaunti mpya ya [${role.toUpperCase()}] imesajiliwa.`);
        alert("Usajili Umefanikiwa! Umepata Ofa ya Siku 3 za bure kuanzia saa na dakika hii.");
        goToPricingPage();
    } catch (error) {
        alert("Hitilafu ya Usajili: " + error.message);
    }
}

// ==========================================
// 4. LOGIN & STICT EXPIRY TIME CHECK
// ==========================================
async function handleLogin() {
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert("Tafadhali jaza nafasi zote!");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const docSnap = await getDoc(doc(db, "users", user.uid));

        if (docSnap.exists()) {
            currentUserData = docSnap.data();
            logSecurityEvent("LOGIN SAHIHI", `Ameingia kwenye mfumo.`);
            
            // Sikiliza matangazo ya kimataifa ya Admin (Live Broadcast)
            listenToBroadcasts();
            
            goToPricingPage();
        } else {
            alert("Taarifa zako hazipo kwenye kanzidata (Database).");
        }
    } catch (error) {
        alert("Nenosiri (Password) au Email si sahihi!");
    }
}

function goToPricingPage() {
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("pricing-container").classList.remove("hidden");
    
    const counterText = document.getElementById("trial-days-counter");
    const enterBtn = document.getElementById("btn-enter-dashboard-nav");

    if (currentUserData.role === 'admin') {
        counterText.innerHTML = `Hali: <strong>JOPO LA SYSTEM ADMIN LIPO WAZI (${currentUserData.email})</strong>`;
        enterBtn.innerText = "Ingia Kwenye Jopo la Admin";
        enterBtn.disabled = false;
        enterBtn.style.background = "#2563eb";
        return;
    }

    // Kuchunguza kama sekunde/dakika ya sasa imevuka ile ya ukomo Firestore
    const sasa = new Date();
    const ukomoMuda = new Date(currentUserData.packageExpiryDate);

    if (sasa > ukomoMuda) {
        // MUDA UMEISHA KAMILI
        counterText.innerHTML = `<span style="color:red; font-weight:bold;"><i class="fa fa-lock"></i> Kifurushi chako kimeisha kabisa! Mfumo Umefungwa. Tafadhali lipia upya kuendelea.</span>`;
        enterBtn.disabled = true;
        enterBtn.style.background = "#cbd5e1";
        enterBtn.innerText = "Mfumo Umefungwa (Lipia Upya)";
    } else {
        // Muda bado upo (Hata kama ni masaa au dakika zilizobaki)
        const tofautiMuda = ukomoMuda - sasa; 
        const masaaYaliyobaki = Math.floor(tofautiMuda / (1000 * 60 * 60));
        const sikuZilizobaki = Math.floor(masaaYaliyobaki / 24);
        const masaaZiada = masaaYaliyobaki % 24;

        counterText.innerHTML = `Kifurushi chako cha (<strong>${currentUserData.kifurushiAina}</strong>) kipo hai! Umebakiza: <strong>Siku ${sikuZilizobaki}, Masaa ${masaaZiada}</strong> kabla ya kufungwa kiotomatiki.`;
        enterBtn.disabled = false;
        enterBtn.style.background = "#64748b";
        enterBtn.innerText = "Ingia Ndani ya Mfumo";
    }
}

function redirectToWhatsApp(kifurushiJina) {
    let customText = `Habari Kaka Jamal, Mimi naitwa *${currentUserData.name}*. Nahitaji unifungulie mfumo kwa Kifurushi cha *${kifurushiJina}*. Email yangu ni: ${currentUserData.email}.`;
    let whatsappUrl = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(customText)}`;
    
    logSecurityEvent("OMBI LA MALIPO", `Ameomba kulipia ${kifurushiJina}.`);
    window.open(whatsappUrl, '_blank');
}

// Kuingia kwenye Dashboard Kuu (Admin au User)
function enterSystemMainDashboard() {
    document.getElementById("pricing-container").classList.add("hidden");
    document.getElementById("main-dashboard").classList.remove("hidden");
    document.getElementById("user-role-display").innerText = currentUserData.role.toUpperCase();

    if (currentUserData.role === 'admin') {
        document.getElementById("admin-only-settings").classList.remove("hidden");
        document.getElementById("user-only-panel").classList.add("hidden");
        loadAdminDashboardData();
    } else {
        document.getElementById("admin-only-settings").classList.add("hidden");
        document.getElementById("user-only-panel").classList.remove("hidden");
        document.getElementById("user-shop-name-display").innerText = currentUserData.name;
        switchUserTab('tab-home');
    }
}

// ==========================================
// 5. JOPO LA SUPER ADMIN (SUPER CONTROL)
// ==========================================
async function loadAdminDashboardData() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const tbody = document.getElementById("admin-user-list-tbody");
        tbody.innerHTML = "";

        let totalUsers = 0;
        let activePaidUsers = 0;
        let totalRevenue = 0;

        querySnapshot.forEach((docObj) => {
            const user = docObj.data();
            if (user.role === 'admin') return; 
            
            totalUsers++;
            const sasa = new Date();
            const ukomo = new Date(user.packageExpiryDate);
            const isPaidCurrent = user.isPaid && (ukomo > sasa);

            if (isPaidCurrent) {
                activePaidUsers++;
                if(user.kifurushiAina.includes("5,000")) totalRevenue += 5000;
                if(user.kifurushiAina.includes("9,000")) totalRevenue += 9000;
                if(user.kifurushiAina.includes("18,000")) totalRevenue += 18000;
                if(user.kifurushiAina.includes("90,000")) totalRevenue += 90000;
                if(user.kifurushiAina.includes("160,000")) totalRevenue += 160000;
            }

            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${user.name}</strong></td>
                <td>${user.email}</td>
                <td><span style="color:${isPaidCurrent ? 'green':'red'}; font-weight:bold;">${isPaidCurrent ? 'ACTIVE (HAI)':'LOCKED (IMEFUNGWA)'}</span></td>
                <td>${ukomo.toLocaleString()}</td>
                <td>
                    <select id="pkg-select-${user.uid}" class="admin-select">
                        <option value="7">Wiki 1 (Tsh 5,000)</option>
                        <option value="14">Wiki 2 (Tsh 9,000)</option>
                        <option value="30">Mwezi 1 (Tsh 18,000)</option>
                        <option value="180">Miezi 6 (Tsh 90,000)</option>
                        <option value="365">Mwaka 1 (Tsh 160,000)</option>
                    </select>
                </td>
                <td>
                    <button class="btn-approve" onclick="approveUserPackage('${user.uid}')">Washa Account (Approve)</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("admin-total-users").innerText = totalUsers;
        document.getElementById("admin-active-users").innerText = activePaidUsers;
        document.getElementById("admin-total-revenue").innerText = `Tsh ${totalRevenue.toLocaleString()}`;

        loadPasswordResets();
    } catch (e) {
        console.error(e);
    }
}

async function approveUserPackage(uid) {
    const selectEl = document.getElementById(`pkg-select-${uid}`);
    const days = parseInt(selectEl.value);
    const textKifurushi = selectEl.options[selectEl.selectedIndex].text;

    const sasa = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(sasa.getDate() + days);

    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            isPaid: true,
            packageExpiryDate: expiryDate.toISOString(),
            kifurushiAina: textKifurushi
        });

        alert("Akaunti ya mtumiaji imewashwa na muda umesogezwa mbele kiotomatiki!");
        loadAdminDashboardData();
    } catch (err) {
        alert("Hitilafu: " + err.message);
    }
}

async function sendGlobalBroadcast() {
    const text = document.getElementById("broadcast-message-input").value.trim();
    if (!text) return alert("Tafadhali andika ujumbe kwanza!");

    try {
        await setDoc(doc(db, "system", "broadcast"), {
            message: text,
            timestamp: new Date().toISOString()
        });
        alert("Ilani ya Mfumo imetumwa kwa watumiaji wote kwa mafanikio!");
        document.getElementById("broadcast-message-input").value = "";
    } catch (e) { alert(e.message); }
}

function listenToBroadcasts() {
    onSnapshot(doc(db, "system", "broadcast"), (docSnap) => {
        const banner = document.getElementById("global-broadcast-display");
        if (docSnap.exists() && banner) {
            const data = docSnap.data();
            banner.innerHTML = `<i class="fa fa-bullhorn"></i> <strong>ILANI YA ADMIN:</strong> ${data.message}`;
            banner.classList.remove("hidden");
        }
    });
}

async function handleForgotPassword() {
    const email = document.getElementById("forgot-email").value.trim().toLowerCase();
    if(!email) return alert("Weka email yako ya mfumo!");

    try {
        await setDoc(doc(db, "password_resets", email.replace(".", "_")), {
            email: email,
            time: new Date().toLocaleString()
        });
        alert("Ombi lako la kubadili password limefika kwa Admin. Wasiliana nae kwa uanzishaji mpya.");
        showSection("login-form-section");
    } catch (e) { alert(e.message); }
}

async function loadPasswordResets() {
    const qSnap = await getDocs(collection(db, "password_resets"));
    const ul = document.getElementById("password-reset-list");
    ul.innerHTML = "";
    qSnap.forEach(d => {
        let li = document.createElement("li");
        li.innerHTML = `<i class="fa fa-envelope"></i> ${d.data().email} - <small style="color:gray;">${d.data().time}</small>`;
        ul.appendChild(li);
    });
}

// ==========================================
// 6. USER SIDE FUNCTIONS (TAB SWITCH & LOGIC)
// ==========================================
function switchUserTab(tabId) {
    document.querySelectorAll(".user-tab-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".sub-nav-btn").forEach(btn => btn.classList.remove("active"));
    
    document.getElementById(tabId).classList.remove("hidden");
    if(event) {
        event.currentTarget.classList.add("active");
    }

    if (tabId === 'tab-sales') updatePOSDropdown();
    if (tabId === 'tab-reports') calculateBusinessReports();
}

// 1. Stock Management
function addStockProduct() {
    const name = document.getElementById("prod-name").value.trim();
    const cost = parseFloat(document.getElementById("prod-cost").value);
    const price = parseFloat(document.getElementById("prod-price").value);
    const qty = parseInt(document.getElementById("prod-qty").value);

    if (!name || isNaN(cost) || isNaN(price) || isNaN(qty)) { 
        alert("Tafadhali jaza taarifa zote za bidhaa kwa usahihi!"); 
        return; 
    }

    appProducts.push({ id: Date.now().toString(), name, cost, price, qty });
    alert(`Bidhaa "${name}" imehifadhiwa kwenye duka lako kikamilifu.`);
    
    document.getElementById("prod-name").value = "";
    document.getElementById("prod-cost").value = "";
    document.getElementById("prod-price").value = "";
    document.getElementById("prod-qty").value = "";

    renderProductsList();
}

function renderProductsList() {
    const ul = document.getElementById("all-products-list");
    const lowStockContainer = document.getElementById("low-stock-container");
    const lowStockList = document.getElementById("low-stock-list");

    ul.innerHTML = "";
    lowStockList.innerHTML = "";
    let lowStockExists = false;

    appProducts.forEach(p => {
        let li = document.createElement("li");
        li.innerHTML = `<div><strong>${p.name}</strong> - Bei ya Kuuzia: Tsh ${p.price} | Stock Iliyopo: ${p.qty}</div>`;
        ul.appendChild(li);

        // Onyesha tahadhari kama bidhaa imebaki chini ya 5
        if (p.qty <= 5) {
            lowStockExists = true;
            let lli = document.createElement("li");
            lli.innerText = `${p.name} - Imesalia ${p.qty} tu kwenye duka!`;
            lowStockList.appendChild(lli);
        }
    });

    lowStockContainer.style.display = lowStockExists ? "block" : "none";
}

function updatePOSDropdown() {
    const select = document.getElementById("pos-product-select");
    select.innerHTML = "";
    appProducts.forEach(p => {
        let opt = document.createElement("option");
        opt.value = p.id;
        opt.innerText = `${p.name} (Zilizopo Stock: ${p.qty})`;
        select.appendChild(opt);
    });

    const isCreditCheck = document.getElementById("pos-is-credit");
    isCreditCheck.onchange = function() {
        document.getElementById("pos-credit-fields").classList.toggle("hidden", !this.checked);
    };
}

// 2. Point of Sale (POS) Logic - Inapunguza stock yenyewe
function processPOSSale() {
    const select = document.getElementById("pos-product-select");
    const qtyInput = document.getElementById("pos-qty").value;
    const isCredit = document.getElementById("pos-is-credit").checked;

    if (!select.value || !qtyInput) return alert("Chagua bidhaa na uweke idadi ya kuuza!");
    const qty = parseInt(qtyInput);
    
    const prod = appProducts.find(p => p.id === select.value);
    if (!prod) return;

    if (prod.qty < qty) return alert(`Stock haitoshi! Kuna bidhaa ${prod.qty} tu zilizobaki.`);

    // Kupunguza Stock Kiotomatiki
    prod.qty -= qty;

    const totalAmount = prod.price * qty;
    const totalCost = prod.cost * qty;

    if (isCredit) {
        const debtorName = document.getElementById("pos-debtor-name").value.trim();
        const debtorPhone = document.getElementById("pos-debtor-phone").value.trim();
        if(!debtorName || !debtorPhone) return alert("Weka jina na namba ya mdaiwa kupitisha mkopo!");

        appDebts.push({ name: debtorName, amount: totalAmount, phone: debtorPhone });
        alert(`Uuzaji wa Mkopo Umefanikiwa! Deni la Tsh ${totalAmount} limesajiliwa.`);
        renderDebtorsList();
    } else {
        alert(`Uuzaji wa cash umekamilika vizuri! Jumla: Tsh ${totalAmount}`);
    }

    // Kutunza Historia ya Mauzo
    appSales.push({
        productName: prod.name,
        qty: qty,
        totalPrice: totalAmount,
        totalCost: totalCost,
        isCredit: isCredit,
        time: new Date().toLocaleTimeString()
    });

    document.getElementById("pos-qty").value = "";
    document.getElementById("pos-is-credit").checked = false;
    document.getElementById("pos-credit-fields").classList.add("hidden");

    renderProductsList();
    renderSalesHistory();
}

function renderSalesHistory() {
    const ul = document.getElementById("sales-history-list");
    ul.innerHTML = "";
    appSales.forEach(s => {
        let li = document.createElement("li");
        li.innerHTML = `<div><i class="fa fa-shopping-bag"></i> ${s.productName} (x${s.qty}) - <strong>Tsh ${s.totalPrice}</strong> ${s.isCredit ? '<span style="color:red;font-weight:bold;">[MKOPO]</span>':''}</div> <span>${s.time}</span>`;
        ul.appendChild(li);
    });
}

// 3. Debtors Management
function addDebtor() {
    const name = document.getElementById("debtor-name").value.trim();
    const amount = parseFloat(document.getElementById("debtor-amount").value);
    const phone = document.getElementById("debtor-phone").value.trim();

    if (!name || isNaN(amount) || !phone) return alert("Jaza nafasi zote kwa usahihi!");

    appDebts.push({ name, amount, phone });
    alert("Mteja mdaiwa amesajiliwa kwenye orodha.");
    
    document.getElementById("debtor-name").value = "";
    document.getElementById("debtor-amount").value = "";
    document.getElementById("debtor-phone").value = "";

    renderDebtorsList();
}

function renderDebtorsList() {
    const listUl = document.getElementById("debtors-list-ul");
    if(!listUl) return;
    listUl.innerHTML = "";
    appDebts.forEach(m => {
        let li = document.createElement("li");
        li.innerHTML = `<div><strong>${m.name}</strong> - Anadaiwa: Tsh ${m.amount}</div>
        <button class="btn-whatsapp" onclick="remindDebtorViaWhatsApp('${m.name}', '${m.amount}', '${m.phone}')">Kumbusha WhatsApp <i class="fab fa-whatsapp"></i></button>`;
        listUl.appendChild(li);
    });
}

function remindDebtorViaWhatsApp(jina, kiasi, namba) {
    let ujumbe = `Habari *${jina}*,\n\nUnakumbushwa kwa adabu kulipia deni lako la kiasi cha *Tsh ${kiasi}* kwenye duka letu la *${currentUserData.name}*.\n\nKaribu sana, asante kwa kuendelea kufanya biashara nasi.`;
    window.open(`https://wa.me/${namba}?text=${encodeURIComponent(ujumbe)}`, '_blank');
}

// 4. Expenses Management
function addExpense() {
    const reason = document.getElementById("expense-reason").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);

    if(!reason || isNaN(amount)) return alert("Jaza sababu na kiasi halisi cha matumizi!");

    appExpenses.push({ reason, amount });
    alert("Gharama ya matumizi imesajiliwa.");
    
    document.getElementById("expense-reason").value = "";
    document.getElementById("expense-amount").value = "";

    const ul = document.getElementById("expenses-list-ul");
    ul.innerHTML = "";
    appExpenses.forEach(e => {
        let li = document.createElement("li");
        li.innerHTML = `<div>${e.reason}</div> <strong>- Tsh ${e.amount}</strong>`;
        ul.appendChild(li);
    });
}

// 5. Automatic Business Reports (Piga Hesabu za Faida Halisi)
function calculateBusinessReports() {
    let totalSalesCash = 0;
    let totalSalesCost = 0;
    appSales.forEach(s => {
        totalSalesCash += s.totalPrice;
        totalSalesCost += s.totalCost;
    });

    let totalDebtsVal = 0;
    appDebts.forEach(d => totalDebtsVal += d.amount);

    let totalExpensesVal = 0;
    appExpenses.forEach(e => totalExpensesVal += e.amount);

    // FORMULA YA FAIDA HALISI: (Jumla ya Bei ya mauzo - Gharama ya mtaji uliouza) - Matumizi mengine
    let netProfit = (totalSalesCash - totalSalesCost) - totalExpensesVal;

    document.getElementById("rep-total-sales").innerText = `Tsh ${totalSalesCash.toLocaleString()}`;
    document.getElementById("rep-total-cost").innerText = `Tsh ${totalSalesCost.toLocaleString()}`;
    document.getElementById("rep-total-debts").innerText = `Tsh ${totalDebtsVal.toLocaleString()}`;
    document.getElementById("rep-total-expenses").innerText = `Tsh ${totalExpensesVal.toLocaleString()}`;
    
    const profitEl = document.getElementById("rep-net-profit");
    profitEl.innerText = `Tsh ${netProfit.toLocaleString()}`;
    profitEl.style.color = netProfit >= 0 ? "green" : "red";
}

// 6. Share Reports Via WhatsApp
function shareReportViaWhatsApp() {
    let totalSalesCash = 0;
    appSales.forEach(s => totalSalesCash += s.totalPrice);
    let totalDebtsVal = 0;
    appDebts.forEach(d => totalDebtsVal += d.amount);
    let totalExpensesVal = 0;
    appExpenses.forEach(e => totalExpensesVal += e.amount);

    let reportText = `*RIPOTI YA BIASHARA - SMARTDUKA SECURITY*\n` +
                     `Jina la Duka: ${currentUserData.name}\n` +
                     `Tarehe: ${new Date().toLocaleDateString()}\n` +
                     `-----------------------------------\n` +
                     `• Jumla ya Mauzo: Tsh ${totalSalesCash.toLocaleString()}\n` +
                     `• Jumla ya Madeni: Tsh ${totalDebtsVal.toLocaleString()}\n` +
                     `• Jumla ya Matumizi: Tsh ${totalExpensesVal.toLocaleString()}\n` +
                     `-----------------------------------\n` +
                     `*Mfumo upo salama na unarekodi vizuri 100%!*`;

    let userPhone = currentUserData.phone || MY_WHATSAPP_NUMBER;
    window.open(`https://wa.me/${userPhone}?text=${encodeURIComponent(reportText)}`, '_blank');
}

// 7. HANDLE LOGOUT
async function handleLogout() {
    await signOut(auth);
    currentUserData = null;
    alert("Umetoka kwenye mfumo kwa usalama.");
    document.getElementById("main-dashboard").classList.add("hidden");
    document.getElementById("auth-container").classList.remove("hidden");
    showSection("login-form-section");
}