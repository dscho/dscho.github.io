import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

import { chromium } from 'playwright';

const [inputArg, outputArg, cuesArg] = process.argv.slice(2);

if (!inputArg || !outputArg || !cuesArg) {
	console.error(
		'Usage: node scripts/export-animated-svg.js <input.svg> <output.gif> <cues.json>'
	);
	process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const cuesPath = resolve(cuesArg);
const cues = JSON.parse(await readFile(cuesPath, 'utf8'));
const { duration, width, height, frameDuration, ranges = [] } = cues;

if (![duration, width, height, frameDuration].every(Number.isFinite)) {
	throw new Error('Cues must define numeric duration, width, height and frameDuration values');
}

const magick = spawnSync('magick', ['-version'], { stdio: 'ignore' });
if (magick.status !== 0) {
	throw new Error('ImageMagick is required; the "magick" command was not found');
}

const timestamps = new Set([0, duration]);
const addRange = (start, end, step) => {
	for (let time = Math.max(0, start); time < Math.min(duration, end); time += step) {
		timestamps.add(Math.round(time));
	}
};

addRange(0, duration, frameDuration);
for (const range of ranges) {
	const repeatEvery = range.repeatEvery ?? duration;
	for (let offset = 0; offset < duration; offset += repeatEvery) {
		addRange(offset + range.start, offset + range.end, range.frameDuration);
	}
}

const schedule = [...timestamps].sort((left, right) => left - right);
const temporaryDirectory = await mkdtemp(`${tmpdir()}/animated-svg-`);
await mkdir(dirname(output), { recursive: true });

let browser;
try {
	browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
	const page = await browser.newPage({
		viewport: { width, height },
		deviceScaleFactor: 1
	});

	await page.goto(pathToFileURL(input).href, { waitUntil: 'load' });
	await page.evaluate(({ width: svgWidth, height: svgHeight }) => {
		const svg = document.documentElement;
		svg.setAttribute('width', String(svgWidth));
		svg.setAttribute('height', String(svgHeight));
		svg.pauseAnimations();
		window.__animations = document.getAnimations();
		for (const animation of window.__animations) {
			animation.pause();
			animation.currentTime = 0;
		}
	}, { width, height });

	const magickArguments = [];
	for (let index = 0; index < schedule.length - 1; index++) {
		const time = schedule[index];
		await page.evaluate(milliseconds => {
			document.documentElement.setCurrentTime(milliseconds / 1000);
			for (const animation of window.__animations) {
				animation.currentTime = milliseconds;
			}
		}, time);
		await page.evaluate(() => new Promise(resolveFrame => {
			requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
		}));

		const frame = `${temporaryDirectory}/${String(index).padStart(5, '0')}.png`;
		await page.screenshot({ path: frame, type: 'png', animations: 'allow' });
		magickArguments.push(
			'-delay',
			String(Math.max(1, Math.round((schedule[index + 1] - time) / 10))),
			frame
		);
		if ((index + 1) % 50 === 0) {
			console.log(`Captured ${index + 1}/${schedule.length - 1} frames`);
		}
	}

	magickArguments.push(
		'-loop', '0',
		'-dither', 'FloydSteinberg',
		'-colors', '256',
		'-layers', 'Optimize',
		output
	);

	const encoded = spawnSync('magick', magickArguments, {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024
	});
	if (encoded.status !== 0) {
		throw new Error(encoded.stderr || `ImageMagick exited with status ${encoded.status}`);
	}

	console.log(`Wrote ${output} from ${schedule.length - 1} frames`);
} finally {
	await browser?.close();
	await rm(temporaryDirectory, { recursive: true, force: true });
}
