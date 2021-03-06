const ch = require('../../chronicle/helper');
const h = require('../helper');
const cli = require('../../chronicle/cli');
const deploy = require('./deploy');
const begin = require('./begin');
const m = require('../../../seedom-crypter/messages');

module.exports.run = async (state) => {
    
    await begin.run(state);

    const { env } = state;
    const fundraiser = await state.interfaces.fundraiser;

    const raise = env.participateRaise ? env.participateRaise : 10000;
    
    env.participants = [];
    for (let i = 0; i < env.participantsCount; i++) {

        // participants start at index 4, after cause, owner, and their wallets
        const address = state.network.keys[i + 4].address;
        const message = m.random();

        const receipt = await fundraiser.participate({
            message
        }, { from: address, value: raise, transact: true });

        cli.info(`created participant ${address} with ${raise} wei`);

        // save actual participant
        env.participants.push({
            address,
            message,
            participateReceipt: receipt
        });

    }

}