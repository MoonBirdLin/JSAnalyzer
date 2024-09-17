const moduleBuilder = require('./common/model/model_builder');
const config = require('./scenery/config');
const SourseReader = require('./common/core/io/sourcereader');
const astCtrl = require("./scenery/astCtrl");
const astParserCtrl = require("./scenery/astParserCtrl");
const constantsModule = require('./common/constants');
const fs = require('fs');

// The first step of Analysis. This will initialize all Global/Scenery Objects.
async function initializeAnalyzer(configPth) {
    // Initialize config
    let configData = config.parseConfig(configPth);
    let astParserIns = await astParserCtrl.getOrSetAstParser(configData.language);
    if (configData.language == undefined) {
        configData.language = constantsModule.LANG.js;
    }
    // Initialize Output path
    if (configData.outputDir == undefined) {
        configData.outputDir = "./output/tmp/";
    }
    if (fs.existsSync(configData.outputDir) == false) {
        fs.mkdirSync(configData.outputDir, { recursive: true });
    }

    // Initialize ASTs
    let astcontroler = astCtrl.getAstPool();
    await astcontroler.constructAstDir(configData.targetDir);

    CONFIG.value = configData;
    return configData;
}

async function runMPTA() {
    // Run MPTA, to construct the basic callsite

}

async function runBasicCG() {
    // Construct basic call graph
}

async function runPTA() {
    /**
    **TODO : PTA
        **TODO : Context-sensitive Analysis
    **/
}

async function runPTAEnhancedCG() {
    /**
    **TODO : PTA-enhanced Call Graph
    **/
}

async function analyze() {
    // TODO : Dataflow Analysis
}

let CONFIG = {
    value : null
};

module.exports = {
    initializeAnalyzer: initializeAnalyzer,
    CONFIG: CONFIG,
    runMPTA: runMPTA,
    runBasicCG: runBasicCG,
    runPTA: runPTA,
    runPTAEnhancedCG: runPTAEnhancedCG,
    analyze: analyze
}