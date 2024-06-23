# HoverLocale - Visual Studio Code Extension

## Overview

HoverLocale is a Visual Studio Code extension that simplifies managing localization keys and their translations directly within your editor. It offers features for creating new keys, finding existing ones, and managing translations across multiple JSON localization files.

## Features

- **Key Management**: Easily create new keys and manage existing ones.
- **Translation Management**: Quickly add or update translations for keys across different JSON files.
- **Hover Support**: See the translation for a key by hovering over its usage in your code.

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing `Ctrl+Shift+X`.
3. Click on More Actions `...`.
4. Click on the "Install from VSIX..." button.
5. Search for "HoverLocale".
6. Click on the "Install" button.

## Usage

### Writing a New Key

1. Open a file where you want to add a new localization key.
2. Place your cursor inside a string that you want to localize. It must be in the format `lang("text_in_pt-BR")`.
3. Right-click and select "Create New Key" from the context menu.
4. Alternatively, you can press `Ctrl+Shift+L` instead.
5. Follow the prompts to enter a new key name and translations for each JSON file.
6. The key will be automatically inserted into the JSON files with the provided translations.

### Managing Existing Keys

- Hover over an existing `lang("key_name")` in your code to see its corresponding string.

### Configuration

- By default, HoverLocale looks for JSON localization files in the `ext/locale` directory of your workspace.
- Customize this directory and file names in your VS Code settings (`settings.json`).

## License

This project is licensed under the [MIT License](https://github.com/ezraffreitas/hoverlocale/blob/main/LICENSE).
