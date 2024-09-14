const moduleBuilder = require('./common/model/model_builder');
const config = require('./scenery/config');
const SourseReader = require('./common/core/io/sourcereader');
const astCtrl = require("./scenery/astCtrl");
const astParserCtrl = require("./scenery/astParserCtrl");
const constantsModule = require('./common/constants');


async function initializeAnalyzer(configPth) {
    let astcontroler = astCtrl.getAstPool();
    let configData = config.parseConfig(configPth);
    let astParserIns = await astParserCtrl.getOrSetAstParser(configData.language);
    await astcontroler.constructAstDir(configData.targetDir);
    if (configData.language == undefined) {
        configData.language = constantsModule.LANG.js;
    }
    
}

module.exports = {
    initializeAnalyzer: initializeAnalyzer
}