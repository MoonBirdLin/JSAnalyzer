/*
    Copyright (C) 2022  Soheil Khodayari, CISPA
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Description:
    ------------
    Interface to read input code for static analysis
*/


/*
 * Reading source files
 */
const fs = require('fs');
const path = require('path');

/**
 * SourceReader
 * @constructor
 */
function SourceReader() {
}

/**
 * Read file content of a page from source files
 * @param {Array} files
 * @returns {string} Merged file content
 */
SourceReader.prototype.getSourceFromFiles = function (files) {
    "use strict";
    var source = '';
    files.forEach(function (filename) {
        var content = fs.readFileSync(filename, 'utf-8');
        source += '' + content;
    });
    return source;
};


/**
 * Read file content of a page from source files
 * @param {string} filename
 * @returns {string} file content
 */
SourceReader.prototype.getSourceFromFile = function (filename) {
    "use strict";
    var content = fs.readFileSync(filename, 'utf-8');
    var source = '' + content;
    return source;
};

/**
 * Write file content
 * @param {string} filename
 * @returns {string} file content
 */
SourceReader.prototype.writeFile = function (filePath, content) {
    "use strict";
    try {
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir) == false) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Writed File:', filePath);
    } catch (err) {
        console.error('Error when Writing File :', err);
    }
};


var reader = new SourceReader();
module.exports = reader;