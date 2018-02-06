const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const instantiate = require('../script/simulation/instantiate');

suite('instantiate', (state) => {

    test("should have proper initial raiser and state", async () => {

        await instantiate.run(state);

        const { env } = state;
        const now = ch.timestamp();
        const actualRaiser = await (await state.interfaces.seedom).raiser({ from: env.owner });
        const actualInstantiateTimeDifference = actualRaiser.instantiateTime - now;

        assert.equalIgnoreCase(actualRaiser.owner, env.owner, "owner does not match");
        assert.equalIgnoreCase(actualRaiser.charity, env.charity, "charity does not match");
        assert.equal(actualRaiser.charitySplit, env.charitySplit, "charity split does not match");
        assert.equal(actualRaiser.winnerSplit, env.winnerSplit, "winner split does not match");
        assert.equal(actualRaiser.ownerSplit, env.ownerSplit, "validOwner split does not match");
        assert.equal(actualRaiser.valuePerEntry, env.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualInstantiateTimeDifference, 2, "instantiate time delta too high");
        assert.equal(actualRaiser.revealTime, env.revealTime, "reveal time does not match");
        assert.equal(actualRaiser.endTime, env.endTime, "end time does not match");
        assert.equal(actualRaiser.expireTime, env.expireTime, "expire time does not match");
        assert.equal(actualRaiser.destructTime, env.destructTime, "destruct time does not match");
        assert.equal(actualRaiser.maxParticipants, env.maxParticipants, "max participants does not match");

        const actualState = await (await state.interfaces.seedom).state({ from: env.owner });

        assert.equal(actualState.charityHashedRandom, 0, "charity hashed random zero");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerRandom, 0, "winner random zero");
        assert.isNotOk(actualState.cancelled, "initially cancelled");
        assert.equal(actualState.totalParticipants, 0, "total participants zero");
        assert.equal(actualState.totalEntries, 0, "total entries zero");
        assert.equal(actualState.totalRevealers, 0, "total revealers zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed zero");
    });

    test("should instantiate properly with no owner split and no max participants", async () => {

        const { env } = state;
        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const valuePerEntry = 1000;
        const charitySplit = 500;
        const winnerSplit = 500;
        const ownerSplit = 0;
        const maxParticipants = 0;

        const seedom = await (await state.interfaces.seedom).deploy({
            charity,
            charitySplit,
            winnerSplit,
            ownerSplit,
            valuePerEntry,
            revealTime,
            endTime,
            expireTime,
            destructTime,
            maxParticipants
        }, { from: owner });

        const actualRaiser = await seedom.raiser({ from: owner });
        const actualInstantiateTimeDifference = actualRaiser.instantiateTime - now;

        assert.equalIgnoreCase(actualRaiser.owner, owner, "owner does not match");
        assert.equalIgnoreCase(actualRaiser.charity, charity, "charity does not match");
        assert.equal(actualRaiser.charitySplit, charitySplit, "charity split does not match");
        assert.equal(actualRaiser.winnerSplit, winnerSplit, "winner split does not match");
        assert.equal(actualRaiser.ownerSplit, ownerSplit, "validOwner split does not match");
        assert.equal(actualRaiser.valuePerEntry, valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualInstantiateTimeDifference, 2, "instantiate time delta too high");
        assert.equal(actualRaiser.revealTime, revealTime, "reveal time does not match");
        assert.equal(actualRaiser.endTime, endTime, "end time does not match");
        assert.equal(actualRaiser.expireTime, expireTime, "expire time does not match");
        assert.equal(actualRaiser.destructTime, destructTime, "destruct time does not match");
        assert.equal(actualRaiser.maxParticipants, maxParticipants, "max participants does not match");

    });

    test("should fail to instantiate with zeroed data", async () => {

        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const charitySplit = 600;
        const winnerSplit = 350;
        const ownerSplit = 50;
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const maxParticipants = 5;
        
        const testData = [
            {charity: 0, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 0, winnerSplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit: 0, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit: 0, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry: 0, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime: 0, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime: 0, expireTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, expireTime: 0, destructTime, maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, destructTime: 0, maxParticipants}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            await assert.isRejected(
                (await state.interfaces.seedom).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to instantiate with splits that don't add to 1000", async () => {

        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const maxParticipants = 5;
        const valuePerEntry = 1000;
        
        const testData = [
            {charity, charitySplit: 20, winnerSplit: 30, ownerSplit: 50, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 200, winnerSplit: 350, ownerSplit: 500, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 601, winnerSplit: 200, ownerSplit: 200, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants},
            {charity, charitySplit: 6000, winnerSplit: 2000, ownerSplit: 2000, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            await assert.isRejected(
                (await state.interfaces.seedom).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to instantiate with invalid dates", async () => {

        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const oldRevealTime = now - phaseDuration * 4;
        const oldEndTime = oldRevealTime + phaseDuration;
        const oldExpireTime = oldEndTime + phaseDuration;
        const oldDestructTime = oldExpireTime + phaseDuration;
        const maxParticipants = 5;
        const charitySplit = 600;
        const winnerSplit = 350;
        const ownerSplit = 50;
        const valuePerEntry = 1000;

        const testData = [
            // old dates
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime: oldRevealTime,
                endTime,
                expireTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime: oldEndTime,
                expireTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime,
                expireTime: oldExpireTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime,
                expireTime,
                destructTime: oldDestructTime,
                maxParticipants},
            // equal dates
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime: revealTime,
                expireTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime,
                expireTime: endTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime,
                expireTime,
                destructTime: expireTime,
                maxParticipants},
            // out of order dates
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime: endTime,
                endTime: revealTime,
                expireTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime: expireTime,
                expireTime: endTime,
                destructTime,
                maxParticipants},
            {charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry,
                revealTime,
                endTime,
                expireTime: destructTime,
                destructTime: expireTime,
                maxParticipants}
        ];

        for (let testArgs of testData) {
            cli.json(testArgs);
            await assert.isRejected(
                (await state.interfaces.seedom).deploy(testArgs, { from: owner })
            );
        }

    });

});
