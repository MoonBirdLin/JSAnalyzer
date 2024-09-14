const moduleBuilder = require('./common/model/model_builder');
const config = require('./scenery/config');
const SourseReader = require('./common/core/io/sourcereader');
const astCtrl = require("./scenery/astCtrl");
const astParserCtrl = require("./scenery/astParserCtrl");
const constantsModule = require('./common/constants');


async function initializeAnalyzer(configPth) {
    // Initialize config
    let configData = config.parseConfig(configPth);
    let astParserIns = await astParserCtrl.getOrSetAstParser(configData.language);
    if (configData.language == undefined) {
        configData.language = constantsModule.LANG.js;
    }
    // Initialize ASTs
    let astcontroler = astCtrl.getAstPool();
    await astcontroler.constructAstDir(configData.targetDir);
}

module.exports = {
    initializeAnalyzer: initializeAnalyzer
}