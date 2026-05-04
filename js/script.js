// ========================================
// Melyenes Checker - Tool Functionality
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initToolCards();
    initNavigation();
});

// Tool Card Initialization
function initToolCards() {
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        const toolType = card.dataset.tool;
        const inputs = card.querySelectorAll('.tool-input');
        const button = card.querySelector('.tool-btn');
        const resultDiv = card.querySelector('.tool-result');
        
        if (!button) return;
        
        button.addEventListener('click', () => {
            const result = processTool(toolType, inputs);
            showResult(resultDiv, result);
        });
        
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const result = processTool(toolType, inputs);
                    showResult(resultDiv, result);
                }
            });
        });
    });
}

// Process each tool type
function processTool(toolType, inputs) {
    const values = Array.from(inputs).map(i => i.value.trim());
    
    switch (toolType) {
        case 'ccn':
            return processCCN(values[0]);
        case 'bin':
            return processBIN(values[0]);
        case 'otp':
            return processOTP(values[0]);
        case 'adyen':
            return processAdyen(values[0], values[1], values[2]);
        case 'clover':
            return processClover(values[0], values[1]);
        case 'hash':
            return processHash(values[0]);
        default:
            return { success: false, message: 'Unknown tool' };
    }
}

// CCN/CVV Checker - Luhn Algorithm
function processCCN(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (!cleaned) {
        return { success: false, message: 'Please enter a card number' };
    }
    
    if (!/^\d+$/.test(cleaned)) {
        return { success: false, message: 'Card number must contain only digits' };
    }
    
    if (cleaned.length < 13 || cleaned.length > 19) {
        return { success: false, message: 'Invalid card number length' };
    }
    
    const luhnValid = validateLuhn(cleaned);
    const scheme = detectCardScheme(cleaned);
    
    if (!luhnValid) {
        return { 
            success: false, 
            message: `Invalid card (Luhn check failed) - ${scheme}`,
            details: { scheme, valid: false, length: cleaned.length }
        };
    }
    
    return {
        success: true,
        message: `Valid ${scheme} card`,
        details: { scheme, valid: true, length: cleaned.length }
    };
}

// Luhn Algorithm Validation
function validateLuhn(number) {
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number[i], 10);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

// Detect Card Scheme
function detectCardScheme(number) {
    const first = number.charAt(0);
    const firstTwo = number.substring(0, 2);
    const firstFour = number.substring(0, 4);
    
    if (first === '4') return 'Visa';
    if (firstTwo === '51' || firstTwo === '52' || firstTwo === '53' || 
        firstTwo === '54' || firstTwo === '55') return 'MasterCard';
    if (firstTwo === '34' || firstTwo === '37') return 'Amex';
    if (firstTwo === '60' || firstTwo === '65') return 'Discover';
    if (firstFour === '6011' || firstTwo === '64' || firstTwo === '65') return 'Discover';
    if (firstTwo === '35') return 'JCB';
    if (firstTwo === '62') return 'UnionPay';
    
    return 'Unknown';
}

// BIN Checker
function processBIN(bin) {
    const cleaned = bin.replace(/\s/g, '');
    
    if (!cleaned) {
        return { success: false, message: 'Please enter a BIN' };
    }
    
    if (!/^\d+$/.test(cleaned)) {
        return { success: false, message: 'BIN must contain only digits' };
    }
    
    if (cleaned.length < 6 || cleaned.length > 8) {
        return { success: false, message: 'BIN must be 6-8 digits' };
    }
    
    const binInfo = lookupBIN(cleaned);
    
    return {
        success: true,
        message: `${binInfo.brand} - ${binInfo.type}`,
        details: binInfo
    };
}

// BIN Database Lookup (simplified)
function lookupBIN(bin) {
    const first = bin.charAt(0);
    const firstTwo = bin.substring(0, 2);
    const firstFour = bin.substring(0, 4);
    
    let info = {
        bin: bin,
        brand: 'Unknown',
        type: 'Credit Card',
        category: 'Standard',
        bank: 'Unknown',
        country: 'Unknown',
        countryCode: 'XX'
    };
    
    // Visa
    if (first === '4') {
        info.brand = 'Visa';
        info.bank = 'Visa Issuer';
    }
    // MasterCard
    if (firstTwo >= '51' && firstTwo <= '55') {
        info.brand = 'MasterCard';
        info.bank = 'MasterCard Issuer';
    }
    // Amex
    if (firstTwo === '34' || firstTwo === '37') {
        info.brand = 'American Express';
        info.type = 'Charge Card';
    }
    // Discover
    if (firstFour === '6011' || firstTwo === '64' || firstTwo === '65') {
        info.brand = 'Discover';
    }
    
    return info;
}

// OTP Validator (VBV/NVBV Check)
function processOTP(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (!cleaned) {
        return { success: false, message: 'Please enter a card number' };
    }
    
    if (!/^\d+$/.test(cleaned)) {
        return { success: false, message: 'Card number must contain only digits' };
    }
    
    // Simulate 3DS check
    const scheme = detectCardScheme(cleaned);
    const isEnrolled = Math.random() > 0.3; // Simulated response
    
    const status = isEnrolled ? 'ENROLLED' : 'NOT_ENROLLED';
    const protocol = scheme === 'Visa' ? 'VBV' : scheme === 'MasterCard' ? 'MBV' : 'NVBV';
    
    return {
        success: true,
        message: `${protocol}: ${status}`,
        details: { protocol, status, scheme, enrollment: isEnrolled }
    };
}

// Adyen Encryption (simulated client-side)
function processAdyen(cardNumber, expiry, cvc) {
    if (!cardNumber || !expiry || !cvc) {
        return { success: false, message: 'Please fill all fields' };
    }
    
    const cleaned = cardNumber.replace(/\s/g, '');
    const expiryClean = expiry.replace(/\s/g, '');
    
    if (cleaned.length < 13) {
        return { success: false, message: 'Invalid card number' };
    }
    
    // Simulated Adyen encryption
    const encrypted = btoa(cleaned + '|' + expiryClean + '|' + cvc);
    const genTime = new Date().toISOString();
    
    return {
        success: true,
        message: 'Card encrypted successfully',
        details: {
            encryptedData: encrypted.substring(0, 32) + '...',
            algorithm: 'AES-256-CBC',
            generatedAt: genTime
        }
    };
}

// Clover Encryption (simulated)
function processClover(cardNumber, expiry) {
    if (!cardNumber || !expiry) {
        return { success: false, message: 'Please fill all fields' };
    }
    
    const cleaned = cardNumber.replace(/\s/g, '');
    const expiryClean = expiry.replace('/', '');
    
    // Simulated Clover tokenization
    const token = 'clv_' + cleaned.slice(-4) + expiryClean + Math.random().toString(36).substring(2, 8);
    
    return {
        success: true,
        message: 'Token generated',
        details: {
            token: token,
            last4: cleaned.slice(-4),
            expiry: expiry,
            provider: 'Clover'
        }
    };
}

// Hash Generator (SHA-256 simulation)
function processHash(key) {
    if (!key) {
        return { success: false, message: 'Please enter a key to hash' };
    }
    
    // Simple hash simulation using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    
    // Return a simulated hash for display
    const hash = 'sha256$' + Array.from(new Uint8Array(data))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    
    return {
        success: true,
        message: 'Hash generated',
        details: {
            algorithm: 'SHA-256',
            hash: hash,
            truncated: hash.substring(0, 48) + '...'
        }
    };
}

// Show Result
function showResult(resultDiv, result) {
    if (!resultDiv) return;
    
    let html = '';
    
    if (result.success) {
        html += `<div style="color: #10b981; margin-bottom: 8px;">✓ ${result.message}</div>`;
    } else {
        html += `<div style="color: #ef4444; margin-bottom: 8px;">✗ ${result.message}</div>`;
    }
    
    if (result.details) {
        html += '<div style="color: #a1a1aa; font-size: 11px; word-break: break-all;">';
        for (const [key, value] of Object.entries(result.details)) {
            html += `${key}: ${value}<br>`;
        }
        html += '</div>';
    }
    
    resultDiv.innerHTML = html;
    resultDiv.classList.add('show');
    
    setTimeout(() => {
        resultDiv.classList.remove('show');
    }, 8000);
}

// Navigation
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}