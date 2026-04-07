const Transaction = require('../models/Transaction');

function asDateOrNull(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function toAmount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

async function getDepositTotalsBetween(fromInput, toInput) {
    const from = asDateOrNull(fromInput);
    const to = asDateOrNull(toInput);
    if (!from || !to) {
        throw new Error('INVALID_DATE_RANGE');
    }
    if (from > to) {
        throw new Error('INVALID_DATE_RANGE');
    }

    const docs = await Transaction.find(
        {
            type: 'deposit',
            $or: [
                { createdAt: { $gte: from, $lte: to } },
                { processedAt: { $gte: from, $lte: to } }
            ]
        },
        { amount: 1, status: 1, createdAt: 1, processedAt: 1 }
    ).lean();

    const totals = {
        completed: { total: 0, count: 0 },
        pending: { total: 0, count: 0 },
        failed: { total: 0, count: 0 },
        cancelled: { total: 0, count: 0 }
    };

    for (const d of docs) {
        const status = String(d.status || 'completed');
        const amount = toAmount(d.amount);
        const createdAt = asDateOrNull(d.createdAt);
        const processedAt = asDateOrNull(d.processedAt);

        if (status === 'completed') {
            const creditTime = processedAt || createdAt;
            if (creditTime && creditTime >= from && creditTime <= to) {
                totals.completed.total += amount;
                totals.completed.count += 1;
            }
            continue;
        }

        if (status === 'pending') {
            if (createdAt && createdAt >= from && createdAt <= to) {
                totals.pending.total += amount;
                totals.pending.count += 1;
            }
            continue;
        }

        if (status === 'failed') {
            if (createdAt && createdAt >= from && createdAt <= to) {
                totals.failed.total += amount;
                totals.failed.count += 1;
            }
            continue;
        }

        if (status === 'cancelled') {
            if (createdAt && createdAt >= from && createdAt <= to) {
                totals.cancelled.total += amount;
                totals.cancelled.count += 1;
            }
        }
    }

    return {
        from: from.toISOString(),
        to: to.toISOString(),
        completedTotal: totals.completed.total,
        completedCount: totals.completed.count,
        pendingTotal: totals.pending.total,
        pendingCount: totals.pending.count,
        failedTotal: totals.failed.total,
        failedCount: totals.failed.count,
        cancelledTotal: totals.cancelled.total,
        cancelledCount: totals.cancelled.count,
        totals
    };
}

module.exports = {
    getDepositTotalsBetween
};
