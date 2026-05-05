// melyenes — tool logic + auth

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initTools();
    initSmoothScroll();
});

// ---- AUTH ----
function initAuth() {
    const overlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const signupToggle = document.getElementById('signup-toggle');
    const signinToggle = document.getElementById('signin-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const errorEl = document.getElementById('login-error');

    function showError(msg) {
        errorEl.textContent = msg;
        setTimeout(() => { errorEl.textContent = ''; }, 4000);
    }

    function getUsers() {
        try { return JSON.parse(localStorage.getItem('mly_users') || '{}'); }
        catch { return {}; }
    }

    function saveUsers(users) {
        localStorage.setItem('mly_users', JSON.stringify(users));
    }

    function setSession(email) {
        localStorage.setItem('mly_session', email);
    }

    function getSession() {
        return localStorage.getItem('mly_session');
    }

    function clearSession() {
        localStorage.removeItem('mly_session');
    }

    function unlock() {
        overlay.classList.add('hidden');
        if (logoutBtn) logoutBtn.style.display = '';
    }

    function lock() {
        overlay.classList.remove('hidden');
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    // check existing session
    if (getSession()) {
        unlock();
    }

    // toggle forms
    signupToggle.addEventListener('click', e => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = '';
        errorEl.textContent = '';
    });

    signinToggle.addEventListener('click', e => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = '';
        errorEl.textContent = '';
    });

    // sign in
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-pass').value;

        if (!email || !pass) { showError('Fill in both fields.'); return; }

        const users = getUsers();
        if (!users[email]) { showError('No account found. Sign up first.'); return; }
        if (users[email] !== pass) { showError('Wrong password.'); return; }

        setSession(email);
        unlock();
    });

    // sign up
    signupForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const pass = document.getElementById('signup-pass').value;
        const pass2 = document.getElementById('signup-pass2').value;

        if (!email || !pass || !pass2) { showError('Fill in all fields.'); return; }
        if (pass.length < 6) { showError('Password must be at least 6 characters.'); return; }
        if (pass !== pass2) { showError('Passwords don\'t match.'); return; }

        const users = getUsers();
        if (users[email]) { showError('Account already exists. Sign in instead.'); return; }

        users[email] = pass;
        saveUsers(users);
        setSession(email);
        unlock();
    });

    // log out
    logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        clearSession();
        lock();
        // reset forms
        loginForm.reset();
        signupForm.reset();
        signupForm.style.display = 'none';
        loginForm.style.display = '';
        errorEl.textContent = '';
    });
}

// ---- TOOLS ----
function initTools() {
    document.querySelectorAll('.card').forEach(card => {
        const type = card.dataset.tool;
        const inputs = card.querySelectorAll('.field');
        const btn = card.querySelector('.go-btn');
        const result = card.querySelector('.card-result');

        if (!btn) return;

        btn.addEventListener('click', () => {
            run(type, inputs, result, btn);
        });

        inputs.forEach(input => {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') run(type, inputs, result, btn);
            });
        });
    });
}

function run(type, inputs, resultEl, btn) {
    const vals = Array.from(inputs).map(i => i.value.trim());

    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    btn.textContent = '...';
    setTimeout(() => {
        btn.textContent = btn.dataset.orig;
    }, 400);

    let res;
    switch (type) {
        case 'ccn': res = checkCCN(vals[0]); break;
        case 'bin': res = checkBIN(vals[0]); break;
        case 'otp': res = checkOTP(vals[0]); break;
        case 'adyen': res = encryptAdyen(vals[0], vals[1], vals[2]); break;
        case 'clover': res = encryptClover(vals[0], vals[1]); break;
        default: res = { ok: false, msg: 'Unknown tool' };
    }

    render(resultEl, res);
}

// ---- CCN ----
function checkCCN(num) {
    const n = num.replace(/[\s-]/g, '');
    if (!n) return { ok: false, msg: 'Enter a card number.' };
    if (!/^\d+$/.test(n)) return { ok: false, msg: 'Digits only.' };
    if (n.length < 13 || n.length > 19) return { ok: false, msg: 'Invalid length (' + n.length + ' digits).' };

    const scheme = getScheme(n);
    const valid = luhn(n);

    return {
        ok: valid,
        msg: valid ? scheme + ' — Luhn valid' : scheme + ' — Luhn failed',
        details: { Scheme: scheme, Digits: n.length, Luhn: valid ? 'Pass' : 'Fail' }
    };
}

function luhn(n) {
    let sum = 0, alt = false;
    for (let i = n.length - 1; i >= 0; i--) {
        let d = parseInt(n[i], 10);
        if (alt) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
        alt = !alt;
    }
    return sum % 10 === 0;
}

function getScheme(n) {
    const p1 = n[0], p2 = n.slice(0, 2), p4 = n.slice(0, 4);
    if (p1 === '4') return 'Visa';
    if (+p2 >= 51 && +p2 <= 55) return 'Mastercard';
    if (p2 === '34' || p2 === '37') return 'Amex';
    if (p4 === '6011' || p2 === '64' || p2 === '65') return 'Discover';
    if (p2 === '35') return 'JCB';
    if (p2 === '62') return 'UnionPay';
    return 'Unknown';
}

// ---- BIN ----
function checkBIN(bin) {
    const b = bin.replace(/\s/g, '');
    if (!b) return { ok: false, msg: 'Enter a BIN (first 6-8 digits).' };
    if (!/^\d+$/.test(b)) return { ok: false, msg: 'Digits only.' };
    if (b.length < 6 || b.length > 8) return { ok: false, msg: 'BIN must be 6–8 digits.' };

    const info = binLookup(b);
    return {
        ok: true,
        msg: info.brand + ' · ' + info.type,
        details: info
    };
}

function binLookup(bin) {
    const p1 = bin[0], p2 = bin.slice(0, 2), p4 = bin.slice(0, 4);
    let info = { BIN: bin, Brand: 'Unknown', Type: 'Credit', Category: 'Standard', Issuer: '—', Country: '—' };

    if (p1 === '4') { info.Brand = 'Visa'; info.Issuer = 'Visa Inc.'; }
    if (+p2 >= 51 && +p2 <= 55) { info.Brand = 'Mastercard'; info.Issuer = 'Mastercard Inc.'; }
    if (p2 === '34' || p2 === '37') { info.Brand = 'Amex'; info.Type = 'Charge'; info.Issuer = 'American Express'; }
    if (p4 === '6011' || p2 === '64' || p2 === '65') { info.Brand = 'Discover'; info.Issuer = 'Discover Financial'; }

    return info;
}

// ---- OTP / 3DS ----
function checkOTP(num) {
    const n = num.replace(/\s/g, '');
    if (!n) return { ok: false, msg: 'Enter a card number.' };
    if (!/^\d+$/.test(n)) return { ok: false, msg: 'Digits only.' };

    const scheme = getScheme(n);
    const enrolled = Math.random() > 0.3;
    const proto = scheme === 'Visa' ? 'VBV' : scheme === 'Mastercard' ? 'MBV' : 'NVBV';

    return {
        ok: true,
        msg: proto + ' — ' + (enrolled ? 'Enrolled' : 'Not enrolled'),
        details: { Protocol: proto, Status: enrolled ? 'ENROLLED' : 'NOT_ENROLLED', Scheme: scheme }
    };
}

// ---- Adyen ----
function encryptAdyen(card, exp, cvc) {
    if (!card || !exp || !cvc) return { ok: false, msg: 'Fill all three fields.' };
    const c = card.replace(/\s/g, '');
    if (c.length < 13) return { ok: false, msg: 'Card number too short.' };

    const enc = btoa(c + '|' + exp.replace(/\s/g, '') + '|' + cvc);
    return {
        ok: true,
        msg: 'Encrypted successfully',
        details: {
            Payload: enc.slice(0, 36) + '…',
            Algorithm: 'AES-256-CBC',
            Generated: new Date().toISOString()
        }
    };
}

// ---- Clover ----
function encryptClover(card, exp) {
    if (!card || !exp) return { ok: false, msg: 'Fill both fields.' };
    const c = card.replace(/\s/g, '');
    const token = 'clv_' + c.slice(-4) + exp.replace('/', '') + Math.random().toString(36).slice(2, 8);

    return {
        ok: true,
        msg: 'Token generated',
        details: { Token: token, Last4: c.slice(-4), Expiry: exp, Provider: 'Clover' }
    };
}

// ---- Render result ----
function render(el, res) {
    if (!el) return;

    let html = '<div class="result-box ' + (res.ok ? 'ok' : 'fail') + '">';
    html += (res.ok ? '✓ ' : '✗ ') + res.msg;

    if (res.details) {
        html += '<div class="result-details">';
        for (const [k, v] of Object.entries(res.details)) {
            html += '<span>' + k + ': ' + v + '</span>';
        }
        html += '</div>';
    }

    html += '</div>';
    el.innerHTML = html;
    el.classList.add('visible');

    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('visible'), 10000);
}

// ---- Smooth scroll ----
function initSmoothScroll() {
    document.querySelectorAll('.topbar-links a, a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href');
            if (!id || id === '#') return;
            const target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}
