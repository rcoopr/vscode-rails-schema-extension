/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SchemaExplorer = void 0;
const vscode = __webpack_require__(2);
const SchemaModel_1 = __webpack_require__(3);
const fileUtils_1 = __webpack_require__(4);
const SchemaTreeDataProvider_1 = __webpack_require__(7);
class SchemaExplorer {
    constructor(context) {
        this.schemaModel = new SchemaModel_1.default(() => this.reveal());
        const treeDataProvider = new SchemaTreeDataProvider_1.default(this.schemaModel);
        this.schemaViewer = vscode.window.createTreeView("RailsSchema", {
            treeDataProvider,
        });
        let watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders?.[0].uri.path || "", "**/schema.rb"));
        watcher.onDidChange(() => {
            treeDataProvider.refresh();
        });
        let disposable = vscode.commands.registerCommand("rails-schema.showRailsSchema", () => this.reveal());
        context.subscriptions.push(vscode.commands.registerCommand("rails-schema.openInSchema", async (node) => {
            const uri = await (0, fileUtils_1.getSchemaUri)();
            if (uri === undefined) {
                return;
            }
            const document = await vscode.workspace.openTextDocument(uri);
            this.openInSchema(document, node);
        }));
        context.subscriptions.push(disposable);
    }
    async openInSchema(document, node) {
        const lineCount = document.lineCount;
        let tableLine = 0;
        for (let index = 0; index < lineCount; index++) {
            const schemaTextLine = document.lineAt(index);
            if (schemaTextLine.text
                .trimLeft()
                .startsWith(`create_table "${node.label}"`)) {
                tableLine = index;
            }
        }
        const editor = await vscode.window.showTextDocument(document.uri);
        const position = new vscode.Position(tableLine, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
    }
    reveal() {
        const currentTable = (0, fileUtils_1.getCurrentTableName)();
        let node = this.getNode(currentTable);
        if (node) {
            this.schemaViewer.reveal(node, {
                expand: true,
                select: true,
                focus: true,
            });
        }
        else {
            (0, fileUtils_1.lookForCustomTableName)((customTableName) => {
                node = this.getNode(customTableName);
                if (node) {
                    this.schemaViewer.reveal(node, {
                        expand: true,
                        select: true,
                        focus: true,
                    });
                }
                else {
                    const schemaNodes = this.schemaModel.data;
                    this.schemaViewer.reveal(schemaNodes[0], {
                        expand: false,
                        select: true,
                        focus: true,
                    });
                }
            });
        }
    }
    getNode(label) {
        const schemaNodes = this.schemaModel.data;
        if (schemaNodes.length === 0) {
            return undefined;
        }
        return schemaNodes.find((node) => {
            if (node.label === label) {
                return node;
            }
        });
    }
}
exports.SchemaExplorer = SchemaExplorer;


/***/ }),
/* 2 */
/***/ ((module) => {

"use strict";
module.exports = require("vscode");

/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const vscode = __webpack_require__(2);
const fileUtils_1 = __webpack_require__(4);
class SchemaModel {
    constructor(callback) {
        this.data = [];
        this.callback = callback;
        this.getRailsSchema();
    }
    refreshSchema() {
        this.getRailsSchema();
    }
    async getRailsSchema() {
        const uri = await (0, fileUtils_1.getSchemaUri)();
        if (uri === undefined) {
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const schemaText = document.getText();
            const tablesRegex = /create_table([\s\S]*?)(  end)/g;
            const tableNameRegex = /(?<=create_table ")([\s\S]*?)(?=("))/g;
            const tableDefinitionRegex = /(?=create_table )([\s\S]*?)(do)/g;
            const commentsInfoRegex = /(?=comment: )([\s\S]*?)(?=(" do)|(",))/;
            const tablesRegexMatch = schemaText.match(tablesRegex);
            if (tablesRegexMatch === null || tablesRegexMatch.length === 0) {
                return;
            }
            const schemaNodes = tablesRegexMatch.map((tableText) => {
                const tableLableMatch = tableText.match(tableNameRegex);
                const tableDefinitionMatch = tableText.match(tableDefinitionRegex);
                const commentsInfo = tableDefinitionMatch ? tableDefinitionMatch[0].match(commentsInfoRegex) : "";
                const children = this.getTableFields(tableText);
                const label = tableLableMatch ? tableLableMatch[0] : "";
                const tooltip = commentsInfo ? `${commentsInfo[0]}"` : "";
                return {
                    label: label,
                    tooltip: tooltip,
                    isTable: true,
                    children: children,
                    parent: undefined,
                };
            });
            this.data = schemaNodes;
            this.callback();
        }
        catch (err) {
            vscode.window.showInformationMessage("Cannot find db/schema.rb file in the workspace");
        }
    }
    getTableFields(tableText) {
        const fieldsRegex = /(?= t\.(?!index))([\s\S]*?)(?=\n)/g;
        const fieldLabelRegex = /(?<=")([\s\S]*?)(?=("))/g;
        const typeLabelRegex = /(?<=t\.)([\s\S]*?)(?=( ))/g;
        const extraInfoRegex = /(?<=,)([\s\S]*?)(?=(, comment))/g;
        const commentsInfoRegex = /(?=comment: )([\s\S]*?)*("|')/;
        const fields = tableText.match(fieldsRegex) || [];
        return fields.map((fieldText) => {
            const fieldMatch = fieldText.match(fieldLabelRegex);
            const typeMatch = fieldText.match(typeLabelRegex);
            const extraInfo = fieldText.match(extraInfoRegex);
            const commentsInfo = fieldText.match(commentsInfoRegex);
            const label = fieldMatch && typeMatch ? `${fieldMatch[0]}: ${typeMatch[0]}` : "";
            const description = extraInfo ? extraInfo[0] : "";
            const tooltip = commentsInfo ? commentsInfo[0] : "";
            return {
                label: label,
                description: description,
                tooltip: tooltip,
                isTable: false,
                children: [],
                parent: undefined,
            };
        });
    }
}
exports["default"] = SchemaModel;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.lookForCustomTableName = exports.getCurrentTableName = exports.getSchemaUri = void 0;
const vscode = __webpack_require__(2);
async function getSchemaUri() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders === undefined || workspaceFolders.length === 0) {
        return;
    }
    for (const folder of workspaceFolders) {
        const schemaUri = vscode.Uri.joinPath(folder.uri, 'db', 'schema.rb');
        try {
            // Check if file exists
            await vscode.workspace.fs.stat(schemaUri);
            return schemaUri; // Return the first valid schema found
        }
        catch (error) {
            continue; // File doesn't exist in this folder, try next one
        }
    }
    return;
}
exports.getSchemaUri = getSchemaUri;
function getCurrentTableName() {
    const pluralize = __webpack_require__(6);
    const modelPathRegex = /(?<=models\/)([\s\S]*?)(?=(.rb))/g;
    const currentDocumentPath = vscode.window.activeTextEditor?.document?.fileName;
    const modelPathMatch = currentDocumentPath?.match(modelPathRegex);
    const modelPath = modelPathMatch ? modelPathMatch[0] : null;
    const modelName = modelPath?.replace("/", "_");
    return modelName ? pluralize(modelName) : null;
}
exports.getCurrentTableName = getCurrentTableName;
function lookForCustomTableName(callback) {
    const currentDocumentUri = vscode.window.activeTextEditor?.document?.uri;
    if (currentDocumentUri === undefined) {
        callback(null);
        return;
    }
    vscode.workspace.openTextDocument(currentDocumentUri).then((document) => {
        const documentText = document.getText();
        const customTableRegex = /(?<=self\.table_name =)([\s\S]*?)\n/g;
        const customTableMatch = documentText.match(customTableRegex);
        if (customTableMatch === null || customTableMatch.length === 0) {
            callback(null);
            return;
        }
        const customTableText = customTableMatch[0].trim().replace(/'|"/g, "");
        callback(customTableText);
    });
}
exports.lookForCustomTableName = lookForCustomTableName;


/***/ }),
/* 5 */,
/* 6 */
/***/ (function(module) {

/* global define */

(function (root, pluralize) {
  /* istanbul ignore else */
  if (true) {
    // Node.
    module.exports = pluralize();
  } else {}
})(this, function () {
  // Rule storage - pluralize and singularize need to be run sequentially,
  // while other rules can be optimized using an object for instant lookups.
  var pluralRules = [];
  var singularRules = [];
  var uncountables = {};
  var irregularPlurals = {};
  var irregularSingles = {};

  /**
   * Sanitize a pluralization rule to a usable regular expression.
   *
   * @param  {(RegExp|string)} rule
   * @return {RegExp}
   */
  function sanitizeRule (rule) {
    if (typeof rule === 'string') {
      return new RegExp('^' + rule + '$', 'i');
    }

    return rule;
  }

  /**
   * Pass in a word token to produce a function that can replicate the case on
   * another word.
   *
   * @param  {string}   word
   * @param  {string}   token
   * @return {Function}
   */
  function restoreCase (word, token) {
    // Tokens are an exact match.
    if (word === token) return token;

    // Lower cased words. E.g. "hello".
    if (word === word.toLowerCase()) return token.toLowerCase();

    // Upper cased words. E.g. "WHISKY".
    if (word === word.toUpperCase()) return token.toUpperCase();

    // Title cased words. E.g. "Title".
    if (word[0] === word[0].toUpperCase()) {
      return token.charAt(0).toUpperCase() + token.substr(1).toLowerCase();
    }

    // Lower cased words. E.g. "test".
    return token.toLowerCase();
  }

  /**
   * Interpolate a regexp string.
   *
   * @param  {string} str
   * @param  {Array}  args
   * @return {string}
   */
  function interpolate (str, args) {
    return str.replace(/\$(\d{1,2})/g, function (match, index) {
      return args[index] || '';
    });
  }

  /**
   * Replace a word using a rule.
   *
   * @param  {string} word
   * @param  {Array}  rule
   * @return {string}
   */
  function replace (word, rule) {
    return word.replace(rule[0], function (match, index) {
      var result = interpolate(rule[1], arguments);

      if (match === '') {
        return restoreCase(word[index - 1], result);
      }

      return restoreCase(match, result);
    });
  }

  /**
   * Sanitize a word by passing in the word and sanitization rules.
   *
   * @param  {string}   token
   * @param  {string}   word
   * @param  {Array}    rules
   * @return {string}
   */
  function sanitizeWord (token, word, rules) {
    // Empty string or doesn't need fixing.
    if (!token.length || uncountables.hasOwnProperty(token)) {
      return word;
    }

    var len = rules.length;

    // Iterate over the sanitization rules and use the first one to match.
    while (len--) {
      var rule = rules[len];

      if (rule[0].test(word)) return replace(word, rule);
    }

    return word;
  }

  /**
   * Replace a word with the updated word.
   *
   * @param  {Object}   replaceMap
   * @param  {Object}   keepMap
   * @param  {Array}    rules
   * @return {Function}
   */
  function replaceWord (replaceMap, keepMap, rules) {
    return function (word) {
      // Get the correct token and case restoration functions.
      var token = word.toLowerCase();

      // Check against the keep object map.
      if (keepMap.hasOwnProperty(token)) {
        return restoreCase(word, token);
      }

      // Check against the replacement map for a direct word replacement.
      if (replaceMap.hasOwnProperty(token)) {
        return restoreCase(word, replaceMap[token]);
      }

      // Run all the rules against the word.
      return sanitizeWord(token, word, rules);
    };
  }

  /**
   * Check if a word is part of the map.
   */
  function checkWord (replaceMap, keepMap, rules, bool) {
    return function (word) {
      var token = word.toLowerCase();

      if (keepMap.hasOwnProperty(token)) return true;
      if (replaceMap.hasOwnProperty(token)) return false;

      return sanitizeWord(token, token, rules) === token;
    };
  }

  /**
   * Pluralize or singularize a word based on the passed in count.
   *
   * @param  {string}  word      The word to pluralize
   * @param  {number}  count     How many of the word exist
   * @param  {boolean} inclusive Whether to prefix with the number (e.g. 3 ducks)
   * @return {string}
   */
  function pluralize (word, count, inclusive) {
    var pluralized = count === 1
      ? pluralize.singular(word) : pluralize.plural(word);

    return (inclusive ? count + ' ' : '') + pluralized;
  }

  /**
   * Pluralize a word.
   *
   * @type {Function}
   */
  pluralize.plural = replaceWord(
    irregularSingles, irregularPlurals, pluralRules
  );

  /**
   * Check if a word is plural.
   *
   * @type {Function}
   */
  pluralize.isPlural = checkWord(
    irregularSingles, irregularPlurals, pluralRules
  );

  /**
   * Singularize a word.
   *
   * @type {Function}
   */
  pluralize.singular = replaceWord(
    irregularPlurals, irregularSingles, singularRules
  );

  /**
   * Check if a word is singular.
   *
   * @type {Function}
   */
  pluralize.isSingular = checkWord(
    irregularPlurals, irregularSingles, singularRules
  );

  /**
   * Add a pluralization rule to the collection.
   *
   * @param {(string|RegExp)} rule
   * @param {string}          replacement
   */
  pluralize.addPluralRule = function (rule, replacement) {
    pluralRules.push([sanitizeRule(rule), replacement]);
  };

  /**
   * Add a singularization rule to the collection.
   *
   * @param {(string|RegExp)} rule
   * @param {string}          replacement
   */
  pluralize.addSingularRule = function (rule, replacement) {
    singularRules.push([sanitizeRule(rule), replacement]);
  };

  /**
   * Add an uncountable word rule.
   *
   * @param {(string|RegExp)} word
   */
  pluralize.addUncountableRule = function (word) {
    if (typeof word === 'string') {
      uncountables[word.toLowerCase()] = true;
      return;
    }

    // Set singular and plural references for the word.
    pluralize.addPluralRule(word, '$0');
    pluralize.addSingularRule(word, '$0');
  };

  /**
   * Add an irregular word definition.
   *
   * @param {string} single
   * @param {string} plural
   */
  pluralize.addIrregularRule = function (single, plural) {
    plural = plural.toLowerCase();
    single = single.toLowerCase();

    irregularSingles[single] = plural;
    irregularPlurals[plural] = single;
  };

  /**
   * Irregular rules.
   */
  [
    // Pronouns.
    ['I', 'we'],
    ['me', 'us'],
    ['he', 'they'],
    ['she', 'they'],
    ['them', 'them'],
    ['myself', 'ourselves'],
    ['yourself', 'yourselves'],
    ['itself', 'themselves'],
    ['herself', 'themselves'],
    ['himself', 'themselves'],
    ['themself', 'themselves'],
    ['is', 'are'],
    ['was', 'were'],
    ['has', 'have'],
    ['this', 'these'],
    ['that', 'those'],
    // Words ending in with a consonant and `o`.
    ['echo', 'echoes'],
    ['dingo', 'dingoes'],
    ['volcano', 'volcanoes'],
    ['tornado', 'tornadoes'],
    ['torpedo', 'torpedoes'],
    // Ends with `us`.
    ['genus', 'genera'],
    ['viscus', 'viscera'],
    // Ends with `ma`.
    ['stigma', 'stigmata'],
    ['stoma', 'stomata'],
    ['dogma', 'dogmata'],
    ['lemma', 'lemmata'],
    ['schema', 'schemata'],
    ['anathema', 'anathemata'],
    // Other irregular rules.
    ['ox', 'oxen'],
    ['axe', 'axes'],
    ['die', 'dice'],
    ['yes', 'yeses'],
    ['foot', 'feet'],
    ['eave', 'eaves'],
    ['goose', 'geese'],
    ['tooth', 'teeth'],
    ['quiz', 'quizzes'],
    ['human', 'humans'],
    ['proof', 'proofs'],
    ['carve', 'carves'],
    ['valve', 'valves'],
    ['looey', 'looies'],
    ['thief', 'thieves'],
    ['groove', 'grooves'],
    ['pickaxe', 'pickaxes'],
    ['passerby', 'passersby']
  ].forEach(function (rule) {
    return pluralize.addIrregularRule(rule[0], rule[1]);
  });

  /**
   * Pluralization rules.
   */
  [
    [/s?$/i, 's'],
    [/[^\u0000-\u007F]$/i, '$0'],
    [/([^aeiou]ese)$/i, '$1'],
    [/(ax|test)is$/i, '$1es'],
    [/(alias|[^aou]us|t[lm]as|gas|ris)$/i, '$1es'],
    [/(e[mn]u)s?$/i, '$1s'],
    [/([^l]ias|[aeiou]las|[ejzr]as|[iu]am)$/i, '$1'],
    [/(alumn|syllab|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1i'],
    [/(alumn|alg|vertebr)(?:a|ae)$/i, '$1ae'],
    [/(seraph|cherub)(?:im)?$/i, '$1im'],
    [/(her|at|gr)o$/i, '$1oes'],
    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)(?:a|um)$/i, '$1a'],
    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)(?:a|on)$/i, '$1a'],
    [/sis$/i, 'ses'],
    [/(?:(kni|wi|li)fe|(ar|l|ea|eo|oa|hoo)f)$/i, '$1$2ves'],
    [/([^aeiouy]|qu)y$/i, '$1ies'],
    [/([^ch][ieo][ln])ey$/i, '$1ies'],
    [/(x|ch|ss|sh|zz)$/i, '$1es'],
    [/(matr|cod|mur|sil|vert|ind|append)(?:ix|ex)$/i, '$1ices'],
    [/\b((?:tit)?m|l)(?:ice|ouse)$/i, '$1ice'],
    [/(pe)(?:rson|ople)$/i, '$1ople'],
    [/(child)(?:ren)?$/i, '$1ren'],
    [/eaux$/i, '$0'],
    [/m[ae]n$/i, 'men'],
    ['thou', 'you']
  ].forEach(function (rule) {
    return pluralize.addPluralRule(rule[0], rule[1]);
  });

  /**
   * Singularization rules.
   */
  [
    [/s$/i, ''],
    [/(ss)$/i, '$1'],
    [/(wi|kni|(?:after|half|high|low|mid|non|night|[^\w]|^)li)ves$/i, '$1fe'],
    [/(ar|(?:wo|[ae])l|[eo][ao])ves$/i, '$1f'],
    [/ies$/i, 'y'],
    [/\b([pl]|zomb|(?:neck|cross)?t|coll|faer|food|gen|goon|group|lass|talk|goal|cut)ies$/i, '$1ie'],
    [/\b(mon|smil)ies$/i, '$1ey'],
    [/\b((?:tit)?m|l)ice$/i, '$1ouse'],
    [/(seraph|cherub)im$/i, '$1'],
    [/(x|ch|ss|sh|zz|tto|go|cho|alias|[^aou]us|t[lm]as|gas|(?:her|at|gr)o|[aeiou]ris)(?:es)?$/i, '$1'],
    [/(analy|diagno|parenthe|progno|synop|the|empha|cri|ne)(?:sis|ses)$/i, '$1sis'],
    [/(movie|twelve|abuse|e[mn]u)s$/i, '$1'],
    [/(test)(?:is|es)$/i, '$1is'],
    [/(alumn|syllab|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1us'],
    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|quor)a$/i, '$1um'],
    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)a$/i, '$1on'],
    [/(alumn|alg|vertebr)ae$/i, '$1a'],
    [/(cod|mur|sil|vert|ind)ices$/i, '$1ex'],
    [/(matr|append)ices$/i, '$1ix'],
    [/(pe)(rson|ople)$/i, '$1rson'],
    [/(child)ren$/i, '$1'],
    [/(eau)x?$/i, '$1'],
    [/men$/i, 'man']
  ].forEach(function (rule) {
    return pluralize.addSingularRule(rule[0], rule[1]);
  });

  /**
   * Uncountable rules.
   */
  [
    // Singular words with no plurals.
    'adulthood',
    'advice',
    'agenda',
    'aid',
    'aircraft',
    'alcohol',
    'ammo',
    'analytics',
    'anime',
    'athletics',
    'audio',
    'bison',
    'blood',
    'bream',
    'buffalo',
    'butter',
    'carp',
    'cash',
    'chassis',
    'chess',
    'clothing',
    'cod',
    'commerce',
    'cooperation',
    'corps',
    'debris',
    'diabetes',
    'digestion',
    'elk',
    'energy',
    'equipment',
    'excretion',
    'expertise',
    'firmware',
    'flounder',
    'fun',
    'gallows',
    'garbage',
    'graffiti',
    'hardware',
    'headquarters',
    'health',
    'herpes',
    'highjinks',
    'homework',
    'housework',
    'information',
    'jeans',
    'justice',
    'kudos',
    'labour',
    'literature',
    'machinery',
    'mackerel',
    'mail',
    'media',
    'mews',
    'moose',
    'music',
    'mud',
    'manga',
    'news',
    'only',
    'personnel',
    'pike',
    'plankton',
    'pliers',
    'police',
    'pollution',
    'premises',
    'rain',
    'research',
    'rice',
    'salmon',
    'scissors',
    'series',
    'sewage',
    'shambles',
    'shrimp',
    'software',
    'species',
    'staff',
    'swine',
    'tennis',
    'traffic',
    'transportation',
    'trout',
    'tuna',
    'wealth',
    'welfare',
    'whiting',
    'wildebeest',
    'wildlife',
    'you',
    /pok[eé]mon$/i,
    // Regexes.
    /[^aeiou]ese$/i, // "chinese", "japanese"
    /deer$/i, // "deer", "reindeer"
    /fish$/i, // "fish", "blowfish", "angelfish"
    /measles$/i,
    /o[iu]s$/i, // "carnivorous"
    /pox$/i, // "chickpox", "smallpox"
    /sheep$/i
  ].forEach(pluralize.addUncountableRule);

  return pluralize;
});


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const vscode = __webpack_require__(2);
const path = __webpack_require__(8);
class SchemaTreeDataProvider {
    constructor(model) {
        this.model = model;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this.model.refreshSchema();
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return {
            label: element.label,
            description: element.description,
            tooltip: element.tooltip,
            contextValue: element.isTable ? "schemaTable" : "schemaField",
            collapsibleState: element.isTable
                ? vscode.TreeItemCollapsibleState.Collapsed
                : void 0,
            iconPath: element.isTable
                ? {
                    light: path.join(__filename, "..", "..", "resources", "light", "table.svg"),
                    dark: path.join(__filename, "..", "..", "resources", "dark", "table.svg"),
                }
                : element.tooltip
                    ? {
                        light: path.join(__filename, "..", "..", "resources", "light", "comments.svg"),
                        dark: path.join(__filename, "..", "..", "resources", "dark", "comments.svg"),
                    }
                    : path.join(__filename, "not existing")
        };
    }
    getChildren(element) {
        return element ? element.children : this.model.data;
    }
    getParent(element) {
        return element.parent;
    }
}
exports["default"] = SchemaTreeDataProvider;


/***/ }),
/* 8 */
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const SchemaExplorer_1 = __webpack_require__(1);
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    new SchemaExplorer_1.SchemaExplorer(context);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map