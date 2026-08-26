const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const EscrowService = require('./escrowService');
const logger = require('../config/logger');

/**
 * Sweeper function to identify past-due Scheduled appointments, mark them as Patient_No_Show,
 * and settle the escrow ledger.
 */
async function sweepPastDueAppointments() {
  logger.info('--- Starting Cron Sweeper: Past-Due Appointment Escrow Settlement ---');
  try {
    const nowUTC = new Date();
    // Midnight today in UTC
    const todayMidnightUTC = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate(), 0, 0, 0));

    // Find all Scheduled appointments whose scheduled date is in the past
    const pastDueAppointments = await Appointment.find({
      status: { $in: ['Scheduled', 'Waiting'] },
      date: { $lt: todayMidnightUTC },
    });

    logger.info(`Cron Sweeper found ${pastDueAppointments.length} past-due unfulfilled appointment(s).`);

    let settledCount = 0;
    for (const appt of pastDueAppointments) {
      appt.status = 'Patient_No_Show';
      
      appt.systemLogs.push({
        action: 'CRON_NO_SHOW_SWEEP',
        actor: 'system',
        details: {
          previousStatus: appt.status,
          date: appt.date,
          timeSlot: appt.timeSlot,
          sweptAt: nowUTC.toISOString(),
          reason: 'Appointment date lapsed without completion or cancellation',
        },
      });

      // Settle escrow funds to the doctor since slot was reserved and patient did not show
      if (appt.escrowStatus === 'held') {
        await EscrowService.releaseToDoctor(appt);
      } else {
        await appt.save();
      }

      settledCount++;
      logger.info(`Swept appointment ${appt._id} -> Patient_No_Show (Escrow settled)`);
    }

    logger.info(`--- Cron Sweeper Completed: ${settledCount} appointment(s) settled. ---`);
    return { success: true, count: settledCount };
  } catch (error) {
    logger.error('Error during Cron Sweeper execution:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize the nightly cron job (Midnight UTC: '0 0 * * *')
 */
function initCronSweeper() {
  // Run every night at 00:00 UTC
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled nightly appointment sweeper at 00:00 UTC');
    await sweepPastDueAppointments();
  }, {
    timezone: 'UTC'
  });

  logger.info('Nightly UTC Cron Sweeper initialized.');
}

module.exports = {
  initCronSweeper,
  sweepPastDueAppointments,
};
