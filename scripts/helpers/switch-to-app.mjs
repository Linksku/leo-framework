#!/usr/bin/env zx

import { promises as fs } from 'fs';
import path from 'path';

let gitignore = await fs.readFile(path.resolve('./.gitignore'), 'utf8');
gitignore = gitignore.slice(0, gitignore.indexOf('# App-specific') - 1);
await fs.writeFile(path.resolve('./.gitignore'), gitignore);

let readme = await fs.readFile(path.resolve('./README.md'), 'utf8');
readme = readme.slice(readme.indexOf('#'));
await fs.writeFile(path.resolve('./README.md'), readme);
