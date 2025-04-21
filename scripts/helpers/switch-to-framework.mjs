#!/usr/bin/env zx

import { promises as fs } from 'fs';
import path from 'path';

let gitignore = await fs.readFile(path.resolve('./.gitignore'), 'utf8');
gitignore += `
# App-specific
/.git-crypt/*
/env/*
!/env/env-template
!/env/secrets-template
/.sentryclirc
/app/
/capacitor/android/
/capacitor/ios/
/capacitor/resources/
/capacitor/app-store/
__generated__
`;
await fs.writeFile(path.resolve('./.gitignore'), gitignore);

let readme = await fs.readFile(path.resolve('./README.md'), 'utf8');
readme = `This is the core of my private repo (without app-specific code) with commits squashed. [Infra diagram](https://github.com/Linksku/leo-framework/blob/master/framework/infra/infra.png)

${readme}`;
await fs.writeFile(path.resolve('./README.md'), readme);
