import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const emusPerPixel = 9525;
const imageTypes = new Map([
	['.gif', 'image/gif'],
	['.jpeg', 'image/jpeg'],
	['.jpg', 'image/jpeg'],
	['.png', 'image/png'],
]);

const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const contentTypes = new Map([
	['.css', 'text/css'],
	['.gif', 'image/gif'],
	['.html', 'text/html'],
	['.js', 'text/javascript'],
	['.mjs', 'text/javascript'],
	['.png', 'image/png'],
	['.svg', 'image/svg+xml'],
	['.woff', 'font/woff'],
	['.woff2', 'font/woff2'],
]);

const escapeXml = (value) =>
	String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

const run = (command, args, options = {}) =>
	new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
			...options,
		});
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				resolvePromise();
			} else {
				reject(new Error(`${command} exited with code ${code}`));
			}
		});
	});

const delay = (milliseconds) =>
	new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

const startServer = async () => {
	const server = createServer(async (request, response) => {
		try {
			const pathname = decodeURIComponent(
				new URL(request.url, 'http://localhost').pathname,
			);
			const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
			const file = resolve(root, relative);
			if (file !== root && !file.startsWith(`${root}/`)) {
				response.writeHead(403).end();
				return;
			}

			const contents = await readFile(file);
			response.writeHead(200, {
				'Content-Type':
					contentTypes.get(extname(file).toLowerCase()) ||
					'application/octet-stream',
			});
			response.end(contents);
		} catch (error) {
			response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
		}
	});
	await new Promise((resolvePromise, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolvePromise);
	});
	return {
		server,
		url: `http://127.0.0.1:${server.address().port}/`,
	};
};

const writePart = async (packageRoot, name, contents) => {
	const path = join(packageRoot, name);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${contents.trim()}\n`);
};

const groupShape = `
	<p:nvGrpSpPr>
		<p:cNvPr id="1" name=""/>
		<p:cNvGrpSpPr/>
		<p:nvPr/>
	</p:nvGrpSpPr>
	<p:grpSpPr>
		<a:xfrm>
			<a:off x="0" y="0"/>
			<a:ext cx="0" cy="0"/>
			<a:chOff x="0" y="0"/>
			<a:chExt cx="0" cy="0"/>
		</a:xfrm>
	</p:grpSpPr>`;

const contentTypesXml = (slides) => {
	const imageDefaults = [
		...new Set(
			slides.flatMap((slide) => [slide.image, ...(slide.overlays || []).map(({ image }) => image)]).map((image) => {
				const extension = extname(image).toLowerCase();
				const contentType = imageTypes.get(extension);
				if (!contentType) {
					throw new Error(`Unsupported slide image type: ${extension}`);
				}
				return `<Default Extension="${extension.slice(1)}" ContentType="${contentType}"/>`;
			}),
		),
	].join('\n\t');
	const slideOverrides = slides
		.map(
			(_, index) =>
				`<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
		)
		.join('\n\t');

	return `${xmlDeclaration}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	${imageDefaults}
	<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
	<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
	<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
	<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
	<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
	<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
	<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
	<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
	<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
	${slideOverrides}
</Types>`;
};

const rootRelationshipsXml = `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
	<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const appXml = (slideCount) => `${xmlDeclaration}
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
	<Application>Fiji PPTX exporter</Application>
	<PresentationFormat>Custom</PresentationFormat>
	<Slides>${slideCount}</Slides>
	<Notes>0</Notes>
	<HiddenSlides>0</HiddenSlides>
	<MMClips>0</MMClips>
	<ScaleCrop>false</ScaleCrop>
	<Company></Company>
	<LinksUpToDate>false</LinksUpToDate>
	<SharedDoc>false</SharedDoc>
	<HyperlinksChanged>false</HyperlinksChanged>
	<AppVersion>1.0</AppVersion>
</Properties>`;

const coreXml = (title) => {
	const timestamp = new Date().toISOString();
	return `${xmlDeclaration}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<dc:title>${escapeXml(title)}</dc:title>
	<dc:creator>Fiji PPTX exporter</dc:creator>
	<cp:lastModifiedBy>Fiji PPTX exporter</cp:lastModifiedBy>
	<dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
	<dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`;
};

const presentationXml = ({ width, height, slides }) => {
	const slideIds = slides
		.map(
			(_, index) =>
				`<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`,
		)
		.join('\n\t\t');

	return `${xmlDeclaration}
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:sldMasterIdLst>
		<p:sldMasterId id="2147483648" r:id="rId1"/>
	</p:sldMasterIdLst>
	<p:sldIdLst>
		${slideIds}
	</p:sldIdLst>
	<p:sldSz cx="${width * emusPerPixel}" cy="${height * emusPerPixel}" type="custom"/>
	<p:notesSz cx="6858000" cy="9144000"/>
	<p:defaultTextStyle>
		<a:defPPr><a:defRPr lang="en-US"/></a:defPPr>
		<a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"/></a:lvl1pPr>
	</p:defaultTextStyle>
</p:presentation>`;
};

const presentationRelationshipsXml = (slideCount) => {
	const slides = Array.from(
		{ length: slideCount },
		(_, index) =>
			`<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`,
	).join('\n\t');
	const nextId = slideCount + 2;

	return `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
	${slides}
	<Relationship Id="rId${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>
	<Relationship Id="rId${nextId + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>
	<Relationship Id="rId${nextId + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>
</Relationships>`;
};

const pictureXml = ({ x, y, width, height }, index) => `
			<p:pic>
				<p:nvPicPr>
					<p:cNvPr id="${index + 2}" name="Slide image ${index + 1}"/>
					<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
					<p:nvPr/>
				</p:nvPicPr>
				<p:blipFill>
					<a:blip r:embed="rId${index + 2}"/>
					<a:stretch><a:fillRect/></a:stretch>
				</p:blipFill>
				<p:spPr>
					<a:xfrm>
						<a:off x="${Math.round(x * emusPerPixel)}" y="${Math.round(y * emusPerPixel)}"/>
						<a:ext cx="${Math.round(width * emusPerPixel)}" cy="${Math.round(height * emusPerPixel)}"/>
					</a:xfrm>
					<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
				</p:spPr>
			</p:pic>`;

const slideXml = (_, pictures) => `${xmlDeclaration}
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:cSld>
		<p:spTree>
			${groupShape}
			${pictures.map(pictureXml).join('')}
		</p:spTree>
	</p:cSld>
	<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

const slideRelationshipsXml = (mediaNames) => `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
	${mediaNames
		.map(
			(name, index) =>
				`<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${escapeXml(name)}"/>`,
		)
		.join('\n\t')}
</Relationships>`;

const slideMasterXml = `${xmlDeclaration}
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:cSld>
		<p:spTree>${groupShape}</p:spTree>
	</p:cSld>
	<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>
	<p:sldLayoutIdLst>
		<p:sldLayoutId id="2147483649" r:id="rId1"/>
	</p:sldLayoutIdLst>
	<p:txStyles>
		<p:titleStyle><a:lvl1pPr><a:defRPr lang="en-US"/></a:lvl1pPr></p:titleStyle>
		<p:bodyStyle><a:lvl1pPr><a:defRPr lang="en-US"/></a:lvl1pPr></p:bodyStyle>
		<p:otherStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:otherStyle>
	</p:txStyles>
</p:sldMaster>`;

const slideMasterRelationshipsXml = `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const slideLayoutXml = `${xmlDeclaration}
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
	<p:cSld name="Blank">
		<p:spTree>${groupShape}</p:spTree>
	</p:cSld>
	<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const slideLayoutRelationshipsXml = `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const themeXml = `${xmlDeclaration}
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
	<a:themeElements>
		<a:clrScheme name="Office">
			<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
			<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
			<a:dk2><a:srgbClr val="44546A"/></a:dk2>
			<a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
			<a:accent1><a:srgbClr val="5B9BD5"/></a:accent1>
			<a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
			<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
			<a:accent4><a:srgbClr val="FFC000"/></a:accent4>
			<a:accent5><a:srgbClr val="4472C4"/></a:accent5>
			<a:accent6><a:srgbClr val="70AD47"/></a:accent6>
			<a:hlink><a:srgbClr val="0563C1"/></a:hlink>
			<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
		</a:clrScheme>
		<a:fontScheme name="Office">
			<a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
			<a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
		</a:fontScheme>
		<a:fmtScheme name="Office">
			<a:fillStyleLst>
				<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
				<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
				<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
			</a:fillStyleLst>
			<a:lnStyleLst>
				<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
				<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
				<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
			</a:lnStyleLst>
			<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
			<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
		</a:fmtScheme>
	</a:themeElements>
	<a:objectDefaults/>
	<a:extraClrSchemeLst/>
</a:theme>`;

const presPropsXml = `${xmlDeclaration}
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;

const viewPropsXml = `${xmlDeclaration}
<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" lastView="sldView"/>`;

const tableStylesXml = `${xmlDeclaration}
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`;

const encodeGif = async (frames, fps, output) => {
	await run('ffmpeg', [
		'-y',
		'-hide_banner',
		'-loglevel',
		'error',
		'-framerate',
		String(fps),
		'-i',
		join(frames, 'frame-%04d.png'),
		'-filter_complex',
		'[0:v]split[frames][palette];[palette]palettegen=max_colors=256:stats_mode=diff[colors];[frames][colors]paletteuse=dither=sierra2_4a',
		'-loop',
		'-1',
		'-final_delay',
		'100',
		output,
	]);
};

const captureFrames = async (page, slide, directory, fps) => {
	const interval = 1000 / fps;
	const maximum = slide.titleAnimation ? 14000 : 3500;
	const minimum = slide.titleAnimation ? 1000 : 1400;
	const started = Date.now();
	let frame = 0;

	while (true) {
		const target = started + frame * interval;
		await delay(Math.max(0, target - Date.now()));
		await page.screenshot({
			path: join(directory, `frame-${String(frame).padStart(4, '0')}.png`),
		});

		const elapsed = Date.now() - started;
		const settled = await page.evaluate(() => {
			const current = Reveal.getCurrentSlide();
			if (current.classList.contains('paper-title-slide')) {
				return current.dataset.paperTitleState === 'complete';
			}
			const animations = current.getAnimations({ subtree: true });
			return (
				animations.length > 0 &&
				animations.every((animation) => animation.playState === 'finished')
			);
		});
		if (elapsed >= minimum && settled) break;
		if (elapsed >= maximum) {
			throw new Error(`Slide ${slide.h}/${slide.v} did not settle`);
		}
		frame++;
	}
};

const capturePresentation = async ({ fps, limit, workspace }) => {
	const { server, url } = await startServer();
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	try {
		const errors = [];
		const page = await browser.newPage();
		await page.setViewport({ width: 1327, height: 912, deviceScaleFactor: 1 });
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(url, { waitUntil: 'networkidle0' });
		await page.waitForFunction(() => window.Reveal?.isReady());
		await page.waitForFunction(() =>
			[...document.images].every(
				(image) => image.complete && image.naturalWidth > 0,
			),
		);

		const presentation = await page.evaluate(() => ({
			title: document.title,
			slides: Reveal.getSlides().map((slide) => {
				const { h, v } = Reveal.getIndices(slide);
				const source = slide.querySelector(
					'.paper-screenshot[doi], .paper-stack-paper-new[doi]',
				);
				const notesHtml = Reveal.getSlideNotes(slide) || '';
				const notesContainer = document.createElement('div');
				notesContainer.innerHTML = notesHtml;
				const assetAnimation = slide.querySelector('.fiji-title-logo');
				const titleAnimation = slide.classList.contains('paper-title-slide');
				return {
					h,
					v: v ?? 0,
					doi: source?.getAttribute('doi') || '',
					notes: notesContainer.innerText.trim(),
					title:
						source?.alt ||
						slide.querySelector('h1')?.innerText.replaceAll('\n', ' ') ||
						`Slide ${h}/${v ?? 0}`,
					captureMode: assetAnimation
						? 'overlay-gif'
						: titleAnimation ||
							  slide.parentElement.classList.contains('paper-stack-sequence')
							? 'animated'
							: 'static',
					titleAnimation,
				};
			}),
		}));
		const selected = Number.isFinite(limit)
			? presentation.slides.slice(0, limit)
			: presentation.slides;
		const slides = [];

		for (const [index, slide] of selected.entries()) {
			if (index === 0) {
				await page.evaluate(() => Reveal.slide(0, 0));
				if (slide.titleAnimation) {
					await page.keyboard.press('r');
				}
			} else {
				await page.evaluate(
					({ h, v }) => Reveal.slide(h, v),
					slide,
				);
				await page.waitForFunction(
					({ h, v }) => {
						const current = Reveal.getIndices();
						return current.h === h && current.v === v;
					},
					{},
					slide,
				);
			}
			await page.evaluate(
				() =>
					new Promise((resolvePromise) =>
						requestAnimationFrame(() => requestAnimationFrame(resolvePromise)),
					),
			);

			if (slide.captureMode === 'overlay-gif') {
				const overlay = await page.evaluate(() => {
					const logo = Reveal.getCurrentSlide().querySelector('.fiji-title-logo');
					const bounds = logo.getBoundingClientRect();
					logo.style.visibility = 'hidden';
					return {
						x: bounds.x,
						y: bounds.y,
						width: bounds.width,
						height: bounds.height,
					};
				});
				const background = join(workspace, `slide-${index + 1}.png`);
				await page.screenshot({ path: background });
				await page.evaluate(() => {
					Reveal.getCurrentSlide().querySelector(
						'.fiji-title-logo',
					).style.visibility = '';
				});
				slides.push({
					...slide,
					image: background,
					overlays: [
						{
							image: join(root, 'img/animated-fiji-logo.gif'),
							...overlay,
						},
					],
				});
				continue;
			}

			if (slide.captureMode === 'static') {
				const image = join(workspace, `slide-${index + 1}.png`);
				await page.screenshot({ path: image });
				slides.push({ ...slide, image });
				continue;
			}

			const frames = join(workspace, `slide-${index + 1}-frames`);
			const gif = join(workspace, `slide-${index + 1}.gif`);
			await mkdir(frames, { recursive: true });
			console.log(
				`Capturing slide ${index + 1}/${selected.length}: ${slide.title}`,
			);
			await captureFrames(page, slide, frames, fps);
			await encodeGif(frames, fps, gif);
			slides.push({ ...slide, image: gif });
		}

		if (errors.length) {
			throw new Error(errors.join('\n'));
		}

		return {
			title: presentation.title,
			width: 1327,
			height: 912,
			slides,
		};
	} finally {
		await browser.close();
		await new Promise((resolvePromise) => server.close(resolvePromise));
	}
};

const writePptx = async (manifest, output) => {
	const packageRoot = await mkdtemp(join(tmpdir(), 'fiji-pptx-'));
	const manifestRoot = manifest.baseDir || root;

	try {
		await writePart(packageRoot, '[Content_Types].xml', contentTypesXml(manifest.slides));
		await writePart(packageRoot, '_rels/.rels', rootRelationshipsXml);
		await writePart(packageRoot, 'docProps/app.xml', appXml(manifest.slides.length));
		await writePart(
			packageRoot,
			'docProps/core.xml',
			coreXml(manifest.title || 'Fiji won\'t quit!'),
		);
		await writePart(packageRoot, 'ppt/presentation.xml', presentationXml(manifest));
		await writePart(
			packageRoot,
			'ppt/_rels/presentation.xml.rels',
			presentationRelationshipsXml(manifest.slides.length),
		);
		await writePart(packageRoot, 'ppt/presProps.xml', presPropsXml);
		await writePart(packageRoot, 'ppt/viewProps.xml', viewPropsXml);
		await writePart(packageRoot, 'ppt/tableStyles.xml', tableStylesXml);
		await writePart(packageRoot, 'ppt/slideMasters/slideMaster1.xml', slideMasterXml);
		await writePart(
			packageRoot,
			'ppt/slideMasters/_rels/slideMaster1.xml.rels',
			slideMasterRelationshipsXml,
		);
		await writePart(packageRoot, 'ppt/slideLayouts/slideLayout1.xml', slideLayoutXml);
		await writePart(
			packageRoot,
			'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
			slideLayoutRelationshipsXml,
		);
		await writePart(packageRoot, 'ppt/theme/theme1.xml', themeXml);
		await mkdir(join(packageRoot, 'ppt/media'), { recursive: true });

		let mediaIndex = 1;
		for (const [index, slide] of manifest.slides.entries()) {
			const pictures = [
				{
					image: slide.image,
					x: 0,
					y: 0,
					width: manifest.width,
					height: manifest.height,
				},
				...(slide.overlays || []),
			];
			const mediaNames = [];
			for (const picture of pictures) {
				const extension = extname(picture.image).toLowerCase();
				const mediaName = `image${mediaIndex++}${extension}`;
				await copyFile(
					resolve(manifestRoot, picture.image),
					join(packageRoot, 'ppt/media', mediaName),
				);
				mediaNames.push(mediaName);
			}
			await writePart(
				packageRoot,
				`ppt/slides/slide${index + 1}.xml`,
				slideXml(manifest, pictures),
			);
			await writePart(
				packageRoot,
				`ppt/slides/_rels/slide${index + 1}.xml.rels`,
				slideRelationshipsXml(mediaNames),
			);
		}

		await rm(output, { force: true });
		await run(
			'7z',
			[
				'a',
				'-tzip',
				'-mx=9',
				'-bd',
				'-bso0',
				'-bsp0',
				output,
				'[Content_Types].xml',
				'_rels',
				'docProps',
				'ppt',
			],
			{ cwd: packageRoot },
		);
		await run('7z', ['t', '-bd', output]);
	} finally {
		await rm(packageRoot, { recursive: true, force: true });
	}
};

const parseOptions = (args) => {
	const options = {
		fps: 10,
		limit: Number.POSITIVE_INFINITY,
		output: 'fiji-wont-quit.pptx',
	};

	for (let index = 0; index < args.length; index++) {
		switch (args[index]) {
			case '--fps':
				options.fps = Number(args[++index]);
				break;
			case '--limit':
				options.limit = Number(args[++index]);
				break;
			default:
				options.output = args[index];
		}
	}
	if (!Number.isFinite(options.fps) || options.fps <= 0) {
		throw new Error('FPS must be a positive number');
	}
	if (
		options.limit !== Number.POSITIVE_INFINITY &&
		(!Number.isInteger(options.limit) || options.limit <= 0)
	) {
		throw new Error('Slide limit must be a positive integer');
	}
	return options;
};

const args = process.argv.slice(2);
if (args[0] === '--manifest') {
	const manifestPath = resolve(args[1]);
	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
	manifest.baseDir = dirname(manifestPath);
	await writePptx(manifest, resolve(args[2] || 'fiji-wont-quit.pptx'));
} else {
	const options = parseOptions(args);
	const workspace = await mkdtemp(join(tmpdir(), 'fiji-pptx-capture-'));
	try {
		const manifest = await capturePresentation({ ...options, workspace });
		await writePptx(manifest, resolve(options.output));
	} finally {
		await rm(workspace, { recursive: true, force: true });
	}
}
