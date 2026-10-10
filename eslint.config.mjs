// The same rules the Obsidian community directory scanner applies: `npm run lint`.
import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
	{ ignores: ['dist/', 'node_modules/', 'tests/', '*.mjs'] },
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: ['eslint.config.*'] },
			},
		},
	},
]);
