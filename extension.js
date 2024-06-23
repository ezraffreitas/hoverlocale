const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const DEFAULT_KEYWORD = "lang";
const DEFAULT_LANG = "pt-BR";
const DEFAULT_JSON_PATH = "ext/locale";
const DEFAULT_JSON_MAIN_FILE = "pt-BR.json";

const lang = {
  "pt-BR": {
    0: "Nenhuma pasta de espaço de trabalho encontrada.",
    1: "Arquivo JSON não encontrado.",
    2: "Nenhum editor ativo encontrado.",
    3: "Nenhuma chave encontrada na posição atual do cursor.",
    4: "Criar uma nova chave...",
    5: "Selecione uma chave",
    6: "Nenhuma opção selecionada.",
    7: "Digite uma nova chave",
    8: "ex.: adm_svc",
    9: "O texto selecionado está vazio.",
    10: "Nenhuma chave inserida.",
    11: "Digite a tradução para",
    12: "(opcional)",
    13: "Chave não encontrada",
    14: "O arquivo está vazio.",
    15: "Formato JSON inválido no arquivo.",
    16: "Chave",
    17: "não encontrada no arquivo.",
  },
  "es-ES": {
    0: "No se encontró ninguna carpeta de espacio de trabajo.",
    1: "Archivo JSON no encontrado.",
    2: "No se encontró ningún editor activo.",
    3: "No se encontró ninguna clave en la posición actual del cursor.",
    4: "Crear una nueva clave...",
    5: "Selecciona una clave",
    6: "No se seleccionó ninguna opción.",
    7: "Introduce una nueva clave",
    8: "p. ej., adm_svc",
    9: "El texto seleccionado está vacío.",
    10: "No se introdujo ninguna clave.",
    11: "Introduce la traducción para",
    12: "(opcional)",
    13: "Clave no encontrada",
    14: "El archivo está vacío.",
    15: "Formato JSON no válido en el archivo.",
    16: "Clave",
    17: "no encontrada en el archivo.",
  },
  "en-US": {
    0: "No workspace folder found.",
    1: "JSON file not found.",
    2: "No active editor found.",
    3: "No key found at the current cursor position.",
    4: "Create a new key...",
    5: "Select a key",
    6: "No option selected.",
    7: "Enter a new key",
    8: "e.g., adm_svc",
    9: "Selected text is empty.",
    10: "No key entered.",
    11: "Enter the translation for",
    12: "(optional)",
    13: "Key not found",
    14: "File is empty.",
    15: "Invalid JSON format in file.",
    16: "Key",
    17: "not found in file.",
  },
};

let rootPath;
let keyword;
let language;
let jsonPath;
let jsonFileNames;
let jsonFiles;
let jsonMain;

function activate(context) {
  vscode.workspace.onDidChangeConfiguration(updateConfiguration);
  const configuration = vscode.workspace.getConfiguration("hoverlocale");
  const workspaceFolders = vscode.workspace.workspaceFolders;

  keyword = configuration.get("keyword", DEFAULT_KEYWORD);
  language = configuration.get("language", DEFAULT_LANG);

  if (!lang[language]) language = DEFAULT_LANG;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage(lang[language][0]);
    return;
  }

  rootPath = workspaceFolders[0].uri.fsPath;
  jsonPath = path.join(rootPath, configuration.get("jsonPath", DEFAULT_JSON_PATH));
  jsonFileNames = configuration.get("jsonFileNames", [DEFAULT_JSON_MAIN_FILE]);
  jsonFiles = jsonFileNames.map((fileName) => path.join(jsonPath, fileName));

  updateJSONMain();

  if (!jsonMain) {
    vscode.window.showErrorMessage(lang[language][1]);
    return;
  }

  const disposable = vscode.commands.registerCommand("hoverlocale.writeKey", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(lang[language][2]);
      return;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const langPattern = new RegExp(`${keyword}\\(["']([^"']+)["']\\)`);
    const range = document.getWordRangeAtPosition(position, langPattern);

    if (!range) {
      vscode.window.showErrorMessage(lang[language][3]);
      return;
    }

    const value = document.getText(range).match(langPattern)[1];
    const keyPattern = /\w+_\d+/g; // Ends with _nnn
    const prefixes = {};

    // Loop through each line of the document
    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      let match;

      // Extract keys matching the pattern in the current line and add their prefixes to the object
      while ((match = keyPattern.exec(line.text))) {
        const fullKey = match[0];
        const prefix = fullKey.substring(0, fullKey.lastIndexOf("_"));
        prefixes[prefix] = true;
      }
    }

    // Show quick pick menu with extracted prefixes and option to enter custom value
    const options = Object.keys(prefixes);
    options.unshift(lang[language][4]);

    const selectedOption = await vscode.window.showQuickPick(options, {
      placeHolder: lang[language][5],
      ignoreFocusOut: true,
    });

    if (!selectedOption) {
      vscode.window.showErrorMessage(lang[language][6]);
      return;
    }

    let key = selectedOption;

    if (selectedOption === lang[language][4]) {
      key = await vscode.window.showInputBox({
        prompt: lang[language][7],
        placeHolder: lang[language][8],
        ignoreFocusOut: true,
      });
    }

    if (!value) {
      vscode.window.showErrorMessage(lang[language][9]);
      return;
    }

    if (!key) {
      vscode.window.showErrorMessage(lang[language][10]);
      return;
    }

    const index = getKeyIndex(key);
    const num = String(index).padStart(3, "0");

    const translations = {};

    for (let i = 1; i < jsonFiles.length; i++) {
      const translation = await vscode.window.showInputBox({
        placeHolder: `${lang[language][11]} ${jsonFileNames[i]} ${lang[language][12]}`,
      });
      translations[i] = translation;
    }

    if (Object.values(translations).includes(undefined)) return;

    jsonFiles.forEach((jsonFile, i) => {
      const translation = translations[i];
      writeLocale(jsonFile, key, num, translation || value);
    });

    // Replace the selected text with the new key
    editor.edit((editBuilder) => {
      editBuilder.replace(range, `lang("${key}_${num}")`);
    });

    updateJSONMain();
  });

  const disposable2 = vscode.languages.registerHoverProvider("*", {
    provideHover(document, position) {
      const langPattern = new RegExp(`${keyword}\\(["']([^"']+)["']\\)`);
      const range = document.getWordRangeAtPosition(position, langPattern);

      if (range) {
        const key = document.getText(range).match(langPattern)[1];
        const value = jsonMain[key] || lang[language][13];

        const newRange = new vscode.Range(range.start.translate(0, keyword.length + 2), range.end.translate(0, -2));

        return {
          contents: [value],
          range: newRange,
        };
      }
    },
  });

  context.subscriptions.push(disposable, disposable2);
}

function updateJSONMain() {
  let jsonIndex = jsonFileNames.indexOf(`${language}.json`);
  if (jsonIndex === -1) jsonIndex = 0;
  jsonMain = JSON.parse(fs.readFileSync(jsonFiles[jsonIndex], "utf-8"));
}

function updateConfiguration(event) {
  const configuration = vscode.workspace.getConfiguration("hoverlocale");
  if (event.affectsConfiguration("hoverlocale.keyword")) {
    keyword = configuration.get("keyword", DEFAULT_KEYWORD);
  } else if (event.affectsConfiguration("hoverlocale.language")) {
    language = configuration.get("language", DEFAULT_LANG);
    if (!lang[language]) language = DEFAULT_LANG;
    updateJSONMain();
  } else if (event.affectsConfiguration("hoverlocale.jsonPath") || event.affectsConfiguration("hoverlocale.jsonFileNames")) {
    jsonPath = path.join(rootPath, configuration.get("jsonPath", DEFAULT_JSON_PATH));
    jsonFileNames = configuration.get("jsonFileNames", [DEFAULT_JSON_MAIN_FILE]);
    jsonFiles = jsonFileNames.map((fileName) => path.join(jsonPath, fileName));
    updateJSONMain();
  }
}

function getKeyIndex(key) {
  const fileContent = fs.readFileSync(jsonFiles[0], "utf-8");
  const keyPattern = new RegExp(`"${key}_\\d{3}"`, "g");
  const matches = fileContent.match(keyPattern);
  return (matches ? matches.length : 0) + 1;
}

function writeLocale(jsonFile, key, num, value) {
  const fileContent = fs.readFileSync(jsonFile, "utf-8");

  if (!fileContent) {
    vscode.window.showErrorMessage(lang[language][14]);
    return;
  }

  if (num === "001") {
    // If key was not found, append to the very end of the JSON object
    const lastBraceIndex = fileContent.lastIndexOf("}");

    if (lastBraceIndex === -1) {
      vscode.window.showErrorMessage(lang[language][15]);
      return;
    }

    let contentBeforeLastBrace = fileContent.slice(0, lastBraceIndex).trim();
    if (contentBeforeLastBrace.endsWith(",")) contentBeforeLastBrace = contentBeforeLastBrace.slice(0, -1);

    const newEntry = `,\r\n\r\n"${key}_${num}": "${value}"\r\n}`;
    const newContent = contentBeforeLastBrace + newEntry;

    fs.writeFileSync(jsonFile, newContent);
  } else {
    // If key was found, find the last occurrence and append below
    const lines = fileContent.split("\r\n");
    const keyPattern = new RegExp(`"${key}_\\d{3}"`);
    let insertIndex = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (keyPattern.test(lines[i])) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex === -1) {
      vscode.window.showErrorMessage(`${lang[language][16]} "${key}" ${lang[language][17]}`);
      return;
    }

    const prevLine = lines[insertIndex].trim();
    const endsWithComma = prevLine.endsWith(",");
    let newEntry = `"${key}_${num}": "${value}",`;

    // If the previous line does not end with a comma, add one
    if (!endsWithComma) {
      lines[insertIndex] = prevLine + ",";
      newEntry = `"${key}_${num}": "${value}"`;
    }

    lines.splice(insertIndex + 1, 0, newEntry);

    const newContent = lines.join("\r\n");
    fs.writeFileSync(jsonFile, newContent);
  }

  const jsonFileName = jsonFileNames[jsonFiles.indexOf(jsonFile)];
  vscode.window.showInformationMessage(`${jsonFileName} -> ${value}`);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
