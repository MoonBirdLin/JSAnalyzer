const SourceReader = require('../common/core/io/sourcereader');
const fs = require('fs');

function getAllFiles(filePath) {
    let Allfiles = [];
    if (fs.statSync(filePath).isDirectory()) {
        let files = fs.readdirSync(filePath);
        files.forEach((file) => {
            let curPath = filePath + '/' + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                let subfiles = getAllFiles(curPath);
                subfiles.forEach((subfile) => {
                    Allfiles.push(subfile);
                })
            } else {
                Allfiles.push(curPath);
            }
        });
    }
    return Allfiles;
}

function getJsFiles(configPth) {
    files = getAllFiles(configPth);
    return files.filter((file) => file.endsWith('.js'));
}

function parseConfig(configPth) {
    // 读取json config文件
    if (!configPth.endsWith('.json')) {
        return null;
    }
    let config = JSON.parse(SourceReader.getSourceFromFile(configPth));
    return config;
}

module.exports = {
    getJsFiles : getJsFiles,
    parseConfig : parseConfig
}