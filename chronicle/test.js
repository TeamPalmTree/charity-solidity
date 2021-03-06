const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('./helper');
const interface = require('./interface');
const parity = require('./parity');
const cli = require('./cli');
const Mocha = require('mocha');
const network = require('./network');

global.chai = require('chai');
global.chai.use(require('chai-as-promised'));
global.chai.use(require('chai-string'));
global.assert = global.chai.assert;

const defaultTimeout = 100000;

module.exports.main = async (state) => {

    cli.info(`running tests: ${state.suiteNames.join(', ')}`);

    // first interface
    await interface.main(state);

    // now test
    cli.section("Test");

    // set up suite against state
    setupSuite(state);

    // get test files for suites
    const testFiles = await getTestFiles(state.suiteNames);
    const mocha = createMocha(testFiles);
    await promiseRun(mocha);
    network.destroyWeb3(state);

}

const setupSuite = (state) => {

    const timeout = state.timeout ? state.timeout : defaultTimeout;

    global.suite = (name, tests) => {
        Mocha.describe(name, function() {

            beforeEach('reset', async () => {
                // clear the script env before each test
                state.env = {};
            });

            tests(state);

        });
    };

    global.test = (name, code) => {
        
        Mocha.it(name, async function() {
            this.timeout(timeout);
            return await code();
        });

    };

}

const promiseRun = (mocha) => {
    return new Promise((fulfill, reject) => {
        mocha.run().on('end', () => {
            fulfill();
        });
    });
}

const getTestFiles = async (suiteNames) => {
    
    if (suiteNames && (suiteNames.length > 0)) {

        const testFiles = [];

        for (let suiteName of suiteNames) {
            testFiles.push(path.join(h.testDir, suiteName + '.' + h.jsExt));
        }

        return testFiles;

    } else {

        const testFiles = await dir.promiseFiles(h.testDir);
        return testFiles.filter(file => path.extname(file) == '.' + h.jsExt);

    }

}

const createMocha = (testFiles) => {

    const mocha = new Mocha({
        reporter: reporter
    });
    for (let testFile of testFiles) {
        mocha.addFile(testFile);
    }

    return mocha;

}

function reporter(runner) {

    var passes = 0;
    var failures = 0;

    runner.on('suite', (suite) => {
        
        if (!suite.fullTitle()) {
            return;
        }

        cli.suite(suite.fullTitle());

    });
    
    runner.on('pass', (test) => {
        cli.pass(test.fullTitle());
        passes++;
    });

    runner.on('fail', (test, err) => {
        cli.fail(test.fullTitle(), err.message);
        failures++;
    });

    runner.on('end', () => {

        cli.subsection("results");

        if (failures > 0) {
            cli.error(`${failures} total failures`);
        }

        cli.success(`${passes} total passes`);

    });

};

module.exports.prepare = (program, state) => {
    program
        .command('test [suites...]')
        .alias('t')
        .description("run tests")
        .option('--timeout [timeout]', "test timeout")
        .action((suiteNames, options) => {
            cli.section("Test");
            // run test(s)
            this.main(Object.assign(state, {
                suiteNames,
                timeout: options.timeout
            })).then(() => {
                // kill web 3
                network.destroyWeb3(state);
            });
        });
};