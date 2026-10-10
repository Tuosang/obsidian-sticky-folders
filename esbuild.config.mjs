// Bundles src/ into dist/ (main.js + manifest.json + styles.css: the files a release ships).
//   node esbuild.config.mjs               one-off dev build (inline sourcemaps)
//   node esbuild.config.mjs --watch       rebuild on change
//   node esbuild.config.mjs --production  minified build
// To also install into a vault, put its path in a git-ignored `.vault` file
// (or set STICKY_VAULT); the build is copied to <vault>/.obsidian/plugins/sticky-folders.
import esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

const OUT = 'dist';
const vault = process.env.STICKY_VAULT ?? (existsSync('.vault') ? readFileSync('.vault', 'utf8').trim() : '');
const prod = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
mkdirSync(OUT, { recursive: true });

const copyStatic = {
	name: 'copy-static',
	setup(build) {
		build.onEnd(result => {
			if (result.errors.length) return;
			copyFileSync('manifest.json', `${OUT}/manifest.json`);
			copyFileSync('styles.css', `${OUT}/styles.css`);
			let where = OUT;
			if (vault) {
				const dir = `${vault}/.obsidian/plugins/sticky-folders`;
				mkdirSync(dir, { recursive: true });
				for (const f of ['main.js', 'manifest.json', 'styles.css']) copyFileSync(`${OUT}/${f}`, `${dir}/${f}`);
				where += ` + ${dir}`;
			}
			console.log(`[sticky-folders] built → ${where} ${new Date().toLocaleTimeString()}`);
		});
	},
};

const ctx = await esbuild.context({
	entryPoints: { main: 'src/main.ts' },
	outdir: OUT,
	bundle: true,
	format: 'cjs',
	target: 'es2022',
	platform: 'browser',
	external: ['obsidian', 'electron'],
	sourcemap: prod ? false : 'inline',
	minify: prod,
	logLevel: 'warning',
	plugins: [copyStatic],
});

if (watch) await ctx.watch();
else { await ctx.rebuild(); await ctx.dispose(); }
