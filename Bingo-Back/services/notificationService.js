const User = require('../models/User');
const WalletService = require('./walletService');

class NotificationService {
    static async notifyWithdrawalApproved(userId, amount) {
        try {
            const BOT_TOKEN = process.env.BOT_TOKEN;
            const WEBAPP_URL = process.env.WEBAPP_URL || 'https://fikirbingo.com';

            const user = await User.findById(userId).lean();
            if (!user || !user.telegramId || !BOT_TOKEN) {
                return false;
            }

            const wallet = await WalletService.getWallet(userId);
            const main = Number(wallet?.main || 0);
            const play = Number(wallet?.play || 0);
            const coins = Number(wallet?.coins || 0);

            const text = [
                '✅ Withdrawal Approved',
                '',
                `💸 Amount: ETB ${Number(amount).toFixed(2)}`,
                '',
                '💼 Current Wallet',
                `• Main: ETB ${main.toFixed(2)}`,
                `• Play: ETB ${play.toFixed(2)}`,
                `• Coins: ${coins}`,
                '',
                '❓ Questions? Contact support:',
                '@haset_life  |  @Ipsychic'
            ].join('\n');

            const reply_markup = {
                inline_keyboard: [
                    [{ text: '💼 Check Balance', callback_data: 'balance' }],
                    [{ text: '🎮 Play Now', web_app: { url: WEBAPP_URL } }]
                ]
            };

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: String(user.telegramId),
                    text,
                    reply_markup
                })
            }).catch(() => { });

            return true;
        } catch (error) {
            // Silent failure for notification path
            return false;
        }
    }
}

module.exports = NotificationService;


