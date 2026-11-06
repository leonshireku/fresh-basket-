// Resend Email Integration for FreshBasket
// Supports Vercel Serverless Functions and standalone Node.js environments

const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html, text }) {
    const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'FreshBasket <onboarding@resend.dev>';

    if (!apiKey) {
        console.log(`[Resend Email Simulated] To: ${to} | Subject: ${subject}`);
        return { success: true, simulated: true, message: 'RESEND_API_KEY not configured. Email logged to console.' };
    }

    try {
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromAddress,
                to: Array.isArray(to) ? to : [to],
                subject: subject,
                html: html,
                text: text || ''
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[Resend Error]', data);
            return { success: false, error: data.message || 'Resend API error' };
        }

        return { success: true, id: data.id };
    } catch (err) {
        console.error('[Resend Network Error]', err);
        return { success: false, error: err.message };
    }
}

// EMAIL TEMPLATES (Strictly adhering to 60-30-10 Forest Green / Emerald FreshBasket Palette)
function getBaseTemplate({ title, subtitle, content }) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
            <tr>
                <td align="center" style="padding: 30px 15px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(18,56,36,0.06); border: 1px solid #E5E7EB;">
                        <!-- Header Banner -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #123824 0%, #059669 100%); padding: 36px 30px; text-align: center;">
                                <div style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 50%; width: 50px; height: 50px; line-height: 50px; margin-bottom: 12px; font-size: 24px;">🥬</div>
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">FreshBasket</h1>
                                <p style="margin: 6px 0 0 0; color: #D1FAE5; font-size: 14px;">100% Farm-Fresh Organic Groceries</p>
                            </td>
                        </tr>
                        <!-- Main Body -->
                        <tr>
                            <td style="padding: 32px 30px;">
                                <h2 style="margin: 0 0 10px 0; color: #123824; font-size: 20px; font-weight: 700;">${title}</h2>
                                ${subtitle ? `<p style="margin: 0 0 22px 0; color: #4B5563; font-size: 15px; line-height: 1.5;">${subtitle}</p>` : ''}
                                ${content}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F9FAFB; padding: 22px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                                <p style="margin: 0 0 6px 0; color: #6B7280; font-size: 13px;">Need help? Reply to this email or visit our store.</p>
                                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">© ${new Date().getFullYear()} FreshBasket Ltd. Nairobi, Kenya. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

// 1. WELCOME CLIENT EMAIL
function getWelcomeEmailHtml({ name }) {
    const content = `
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 10px 0; color: #166534; font-weight: 600; font-size: 15px;">Karibu sana, ${name}!</p>
            <p style="margin: 0; color: #15803D; font-size: 14px; line-height: 1.5;">Your account is ready. You can now explore our curated catalog of sun-ripened fruits, organic greens, dairy, and farm produce delivered directly to your doorstep.</p>
        </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
            <tr>
                <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>🌿 100% Certified Organic:</strong> Direct from regional partner farms.</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>🚀 Same-Day Delivery:</strong> Fast, climate-controlled logistics across town.</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #374151; font-size: 14px;"><strong>💳 Flexible Payment:</strong> Pay securely with M-Pesa or Cash on Delivery.</td>
            </tr>
        </table>
        <div style="text-align: center; margin-top: 28px;">
            <a href="https://fresh-basket-snowy.vercel.app/" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Start Shopping Now</a>
        </div>
    `;
    return getBaseTemplate({
        title: `Welcome to FreshBasket, ${name}!`,
        subtitle: 'Thank you for joining Kenya’s premier organic grocery marketplace.',
        content
    });
}

// 2. ORDER VERIFICATION CODE (OTP) EMAIL
function getOrderVerificationEmailHtml({ name, orderNumber, code, total }) {
    const content = `
        <p style="margin: 0 0 18px 0; font-size: 15px; color: #374151; line-height: 1.5;">Hello <strong>${name}</strong>, please use the 6-digit confirmation code below to complete your order <strong>${orderNumber}</strong> for <strong>KES ${total.toLocaleString()}</strong>.</p>
        
        <div style="background-color: #F0FDF4; border: 2px dashed #059669; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #047857; letter-spacing: 1px; display: block; margin-bottom: 8px;">Order Verification Code</span>
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #064E3B; font-family: monospace; display: block;">${code}</span>
            <span style="font-size: 12px; color: #6B7280; display: block; margin-top: 8px;">Valid for 10 minutes. Do not share this code.</span>
        </div>

        <p style="margin: 0; color: #6B7280; font-size: 13px; line-height: 1.5;">If you did not initiate this order, you can safely ignore this email.</p>
    `;
    return getBaseTemplate({
        title: 'Verify Your FreshBasket Order',
        subtitle: `Action required to confirm Order #${orderNumber}`,
        content
    });
}

// 3. ORDER SUCCESSFUL CONFIRMATION EMAIL
function getOrderSuccessEmailHtml({ name, orderNumber, items = [], total, address, phone, paymentMethod }) {
    let rowsHtml = '';
    items.forEach(item => {
        const sub = (item.price || 0) * (item.quantity || 1);
        rowsHtml += `
            <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 10px 0; font-size: 14px; color: #1F2937;">${item.name} <span style="color: #6B7280;">× ${item.quantity}</span></td>
                <td style="padding: 10px 0; text-align: right; font-size: 14px; font-weight: 600; color: #123824;">KES ${sub.toLocaleString()}</td>
            </tr>
        `;
    });

    const content = `
        <div style="background-color: #ECFDF5; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center;">
            <span style="font-size: 20px; margin-right: 12px;">✅</span>
            <span style="color: #065F46; font-size: 14px; font-weight: 600;">Your order has been verified and placed into fulfillment!</span>
        </div>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
            <thead>
                <tr style="border-bottom: 2px solid #E5E7EB;">
                    <th align="left" style="padding: 8px 0; font-size: 13px; color: #6B7280; text-transform: uppercase;">Product</th>
                    <th align="right" style="padding: 8px 0; font-size: 13px; color: #6B7280; text-transform: uppercase;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
                <tr>
                    <td style="padding: 14px 0 0 0; font-size: 16px; font-weight: 700; color: #123824;">Total Amount</td>
                    <td style="padding: 14px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #059669;">KES ${total.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div style="background-color: #F9FAFB; border-radius: 10px; padding: 16px; margin-top: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #1F2937; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Delivery Details</h4>
            <p style="margin: 0 0 4px 0; color: #4B5563; font-size: 14px;"><strong>Address:</strong> ${address}</p>
            <p style="margin: 0 0 4px 0; color: #4B5563; font-size: 14px;"><strong>Contact Phone:</strong> ${phone}</p>
            <p style="margin: 0; color: #4B5563; font-size: 14px;"><strong>Payment Method:</strong> ${paymentMethod || 'Cash on Delivery'}</p>
        </div>
    `;

    return getBaseTemplate({
        title: `Order Confirmed: #${orderNumber}`,
        subtitle: `Thank you for your order, ${name}! We're preparing your fresh groceries.`,
        content
    });
}

module.exports = {
    sendEmail,
    getWelcomeEmailHtml,
    getOrderVerificationEmailHtml,
    getOrderSuccessEmailHtml
};

