const crypto = require('crypto');
const keccak256 = require('js-sha3').keccak256;

module.exports.timeInterval = 8;

const minFirstDecimal = 9;
const maxFirstDecimal = 255;
module.exports.random = function (firstDecimal) {
    const buffer = Buffer.alloc(32);
    crypto.randomFillSync(buffer, 0, 32);
    return '0x' + buffer.toString('hex');
}

module.exports.hashedRandom = function (random, participant) {

    var hasher = new keccak256.create(256);

    var randomHex = random.substr(2);
    var randomBuffer = new Buffer(randomHex, 'hex');
    hasher.update(randomBuffer);

    var participantHex = participant.substr(2);
    var participantBuffer = new Buffer(participantHex, 'hex');
    hasher.update(participantBuffer);

    return "0x" + hasher.hex();

}

module.exports.hexBigNumber = function(bigNumber) {
    return "0x" + bigNumber.toString(16);
}

module.exports.advanceBlock = function () {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: Date.now(),
        }, (err, res) => {
            return err ? reject(err) : resolve(res)
        })
    });
}