const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const seed = require('../script/simulation/seed');
const instantiate = require('../script/simulation/instantiate');
const participate = require('../script/simulation/participate');

suite('participate', (state) => {

    test("should accept participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await participate.run(state);

        const { env } = state;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await (await state.interfaces.seedom).participantsMapping({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 0, "entries should be zero");
            assert.equal(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualParticipant.random, 0, "random should be zero");

            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualState = await (await state.interfaces.seedom).state({ from: env.owner });
        assert.equal(actualState.totalEntries, 0, "total entries should be zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");

    });

    test("should accept and refund participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const { env } = state;
        // raise at refund generating amount
        env.participateRaise = 10500;

        await participate.run(state);

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await (await state.interfaces.seedom).participantsMapping({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 10, "entries should be correct");
            assert.equal(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualParticipant.random, 0, "random should be zero");

            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualState = await (await state.interfaces.seedom).state({ from: env.owner });
        const entries = env.participantsCount * 10;
        assert.equal(actualState.totalEntries, entries, "total entries should be zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");

    });

    test("reject participation if over max participants", async () => {

        await participate.run(state);
        
        const { env } = state;
        // get last participant that is never used otherwise
        const participant = state.accountAddresses[8];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);
        
        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("should fail participation without seed", async () => {

        await instantiate.run(state);

        const { env } = state;
        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("should reject participation after participation phase", async () => {

        await seed.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for reveal phase", env.revealTime - now);

        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("should fail owner participation after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, env.owner);

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject multiple participation from same address after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const participant = state.accountAddresses[2];
        let random = sh.random();
        let hashedRandom = sh.hashedRandom(random, participant);

        await assert.isFulfilled(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

        // generate a new random just for fun
        random = sh.random();
        hashedRandom = sh.hashedRandom(random, participant);

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("reject participation of bad hashed randoms after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const participant = state.accountAddresses[2];
        const hashedRandom = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

});
