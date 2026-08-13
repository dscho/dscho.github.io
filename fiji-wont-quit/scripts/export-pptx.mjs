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

const slidePictures = (slide, manifest) =>
	slide.pictures || [
		{
			image: slide.image,
			x: 0,
			y: 0,
			width: manifest.width,
			height: manifest.height,
		},
		...(slide.overlays || []),
	];

const contentTypesXml = (slides) => {
	const imageDefaults = [
		...new Set(
			slides
				.flatMap((slide) => slidePictures(slide, { width: 0, height: 0 }))
				.map((image) => {
					const extension = extname(image.image).toLowerCase();
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
	const notesOverrides = slides
		.map((slide, index) =>
			slide.notes
				? `<Override PartName="/ppt/notesSlides/notesSlide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`
				: '',
		)
		.filter(Boolean)
		.join('\n\t');
	const notesMasterOverride = slides.some(({ notes }) => notes)
		? '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>'
		: '';

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
	${notesMasterOverride}
	${slideOverrides}
	${notesOverrides}
</Types>`;
};

const rootRelationshipsXml = `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
	<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const appXml = (slides) => `${xmlDeclaration}
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
	<Application>Fiji PPTX exporter</Application>
	<PresentationFormat>Custom</PresentationFormat>
	<Slides>${slides.length}</Slides>
	<Notes>${slides.filter(({ notes }) => notes).length}</Notes>
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
	const notesMasterId = slides.some(({ notes }) => notes)
		? `<p:notesMasterIdLst>
		<p:notesMasterId r:id="rId${slides.length + 5}"/>
	</p:notesMasterIdLst>`
		: '';

	return `${xmlDeclaration}
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:sldMasterIdLst>
		<p:sldMasterId id="2147483648" r:id="rId1"/>
	</p:sldMasterIdLst>
	${notesMasterId}
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

const presentationRelationshipsXml = (slides) => {
	const slideCount = slides.length;
	const slideRelationships = Array.from(
		{ length: slideCount },
		(_, index) =>
			`<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`,
	).join('\n\t');
	const nextId = slideCount + 2;
	const notesMasterRelationship = slides.some(({ notes }) => notes)
		? `<Relationship Id="rId${nextId + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>`
		: '';

	return `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
	${slideRelationships}
	<Relationship Id="rId${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>
	<Relationship Id="rId${nextId + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>
	<Relationship Id="rId${nextId + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>
	${notesMasterRelationship}
</Relationships>`;
};

const pictureXml = (
	{
		x,
		y,
		width,
		height,
		name = `Slide image ${index + 1}`,
		rotate = 0,
		border = 0,
		shadow = false,
	},
	index,
) => `
			<p:pic>
				<p:nvPicPr>
					<p:cNvPr id="${index + 2}" name="${escapeXml(name)}"/>
					<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
					<p:nvPr/>
				</p:nvPicPr>
				<p:blipFill>
					<a:blip r:embed="rId${index + 2}"/>
					<a:stretch><a:fillRect/></a:stretch>
				</p:blipFill>
				<p:spPr>
					<a:xfrm${rotate ? ` rot="${Math.round(rotate * 60000)}"` : ''}>
						<a:off x="${Math.round(x * emusPerPixel)}" y="${Math.round(y * emusPerPixel)}"/>
						<a:ext cx="${Math.round(width * emusPerPixel)}" cy="${Math.round(height * emusPerPixel)}"/>
					</a:xfrm>
					<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
					${
						border
							? `<a:ln w="${Math.round(border * emusPerPixel)}"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln>`
							: '<a:ln><a:noFill/></a:ln>'
					}
					${
						shadow
							? '<a:effectLst><a:outerShdw blurRad="400050" dist="190500" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="22000"/></a:srgbClr></a:outerShdw></a:effectLst>'
							: ''
					}
				</p:spPr>
			</p:pic>`;

const veilXml = (veil, id) => {
	if (!veil) return '';
	return `
			<p:sp>
				<p:nvSpPr>
					<p:cNvPr id="${id}" name="Animation veil"/>
					<p:cNvSpPr/>
					<p:nvPr/>
				</p:nvSpPr>
				<p:spPr>
					<a:xfrm>
						<a:off x="${Math.round(veil.x * emusPerPixel)}" y="${Math.round(veil.y * emusPerPixel)}"/>
						<a:ext cx="${Math.round(veil.width * emusPerPixel)}" cy="${Math.round(veil.height * emusPerPixel)}"/>
					</a:xfrm>
					<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
					<a:solidFill><a:srgbClr val="000000"><a:alpha val="18000"/></a:srgbClr></a:solidFill>
					<a:ln><a:noFill/></a:ln>
				</p:spPr>
				<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
			</p:sp>`;
};

const doiPillXml = (slide, relationshipId, id) => {
	if (!relationshipId || !slide.doiBounds) return '';
	const { x, y, width, height } = slide.doiBounds;
	return `
			<p:sp>
				<p:nvSpPr>
					<p:cNvPr id="${id}" name="DOI: ${escapeXml(slide.doi)}">
						<a:hlinkClick r:id="${relationshipId}" tooltip="DOI: ${escapeXml(slide.doi)}"/>
					</p:cNvPr>
					<p:cNvSpPr/>
					<p:nvPr/>
				</p:nvSpPr>
				<p:spPr>
					<a:xfrm>
						<a:off x="${Math.round(x * emusPerPixel)}" y="${Math.round(y * emusPerPixel)}"/>
						<a:ext cx="${Math.round(width * emusPerPixel)}" cy="${Math.round(height * emusPerPixel)}"/>
					</a:xfrm>
					<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
					<a:solidFill><a:srgbClr val="FFFFFF"><a:alpha val="92000"/></a:srgbClr></a:solidFill>
					<a:ln w="9525">
						<a:solidFill><a:srgbClr val="000000"><a:alpha val="14000"/></a:srgbClr></a:solidFill>
					</a:ln>
					<a:effectLst>
						<a:outerShdw blurRad="171450" dist="47625" dir="5400000" algn="ctr" rotWithShape="0">
							<a:srgbClr val="000000"><a:alpha val="16000"/></a:srgbClr>
						</a:outerShdw>
					</a:effectLst>
				</p:spPr>
				<p:txBody>
					<a:bodyPr lIns="133350" rIns="133350" tIns="76200" bIns="76200" anchor="ctr"/>
					<a:lstStyle/>
					<a:p>
						<a:pPr algn="ctr"/>
						<a:r>
							<a:rPr lang="en-US" sz="1200" b="0"/>
							<a:t>DOI: ${escapeXml(slide.doi)}</a:t>
						</a:r>
						<a:endParaRPr lang="en-US" sz="1200"/>
					</a:p>
				</p:txBody>
			</p:sp>`;
};

const fadeEffectXml = ({
	direction,
	shapeId,
	parId,
	setId,
	effectId,
	delay,
	duration,
}) => `
				<p:par>
					<p:cTn id="${parId}" dur="${duration}" fill="hold" nodeType="withEffect" grpId="${parId}" presetID="9" presetClass="${direction === 'in' ? 'entr' : 'exit'}" presetSubtype="0">
						<p:stCondLst><p:cond evt="onBegin" delay="${delay}"/></p:stCondLst>
						<p:childTnLst>
							${
								direction === 'in'
									? `<p:set>
								<p:cBhvr>
									<p:cTn id="${setId}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>
									<p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl>
									<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
								</p:cBhvr>
								<p:to><p:strVal val="visible"/></p:to>
							</p:set>`
									: ''
							}
							<p:animEffect transition="${direction}" filter="fade">
								<p:cBhvr>
									<p:cTn id="${effectId}" dur="${duration}"/>
									<p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl>
								</p:cBhvr>
							</p:animEffect>
							${
								direction === 'out'
									? `<p:set>
								<p:cBhvr>
									<p:cTn id="${setId}" dur="1" fill="hold"><p:stCondLst><p:cond delay="${Math.max(0, duration - 1)}"/></p:stCondLst></p:cTn>
									<p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl>
									<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
								</p:cBhvr>
								<p:to><p:strVal val="hidden"/></p:to>
							</p:set>`
									: ''
							}
						</p:childTnLst>
					</p:cTn>
				</p:par>`;

const motionScaleEffectXml = ({
	shapeId,
	parId,
	motionId,
	scaleId,
	delay,
	duration,
	deltaX,
	deltaY,
	scale,
}) => `
				<p:par>
					<p:cTn id="${parId}" dur="${duration}" fill="hold" nodeType="withEffect" grpId="${parId}">
						<p:stCondLst><p:cond evt="onBegin" delay="${delay}"/></p:stCondLst>
						<p:iterate type="lt"><p:tmAbs val="0"/></p:iterate>
						<p:childTnLst>
							<p:animMotion origin="layout" path="M 0 0 L ${deltaX.toFixed(6)} ${deltaY.toFixed(6)} E" pathEditMode="relative">
								<p:cBhvr>
									<p:cTn id="${motionId}" dur="${duration}" fill="hold"/>
									<p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl>
								</p:cBhvr>
							</p:animMotion>
							<p:animScale>
								<p:cBhvr>
									<p:cTn id="${scaleId}" dur="${duration}" fill="hold"/>
									<p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl>
								</p:cBhvr>
								<p:from x="100000" y="100000"/>
								<p:to x="${Math.round(scale * 100000)}" y="${Math.round(scale * 100000)}"/>
							</p:animScale>
						</p:childTnLst>
					</p:cTn>
				</p:par>`;

const timingXml = (slide, pictures, veilId) => {
	if (!slide.nativeAnimation) return '';
	const animation = slide.nativeAnimation;
	const titleShapeId = animation.titlePictureIndex + 2;
	const effects = [
		fadeEffectXml({
			direction: 'in',
			shapeId: titleShapeId,
			parId: 2,
			setId: 3,
			effectId: 4,
			delay: animation.wait,
			duration: animation.fade,
		}),
		fadeEffectXml({
			direction: 'in',
			shapeId: veilId,
			parId: 5,
			setId: 6,
			effectId: 7,
			delay: animation.wait,
			duration: animation.fade,
		}),
		motionScaleEffectXml({
			shapeId: titleShapeId,
			parId: 8,
			motionId: 9,
			scaleId: 10,
			delay: animation.moveDelay,
			duration: animation.moveDuration,
			deltaX: animation.deltaX,
			deltaY: animation.deltaY,
			scale: animation.scale,
		}),
		fadeEffectXml({
			direction: 'out',
			shapeId: veilId,
			parId: 11,
			setId: 12,
			effectId: 13,
			delay: animation.veilExitDelay,
			duration: animation.veilExitDuration,
		}),
	].join('');

	return `
	<p:timing>
		<p:tnLst>
			<p:par>
				<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
					<p:childTnLst>${effects}
					</p:childTnLst>
				</p:cTn>
			</p:par>
		</p:tnLst>
		<p:bldLst>
			<p:bldP spid="${titleShapeId}" grpId="2" animBg="1"/>
			<p:bldP spid="${veilId}" grpId="5" animBg="1"/>
			<p:bldP spid="${titleShapeId}" grpId="8" animBg="1"/>
			<p:bldP spid="${veilId}" grpId="11" animBg="1"/>
		</p:bldLst>
	</p:timing>`;
};

const morphTransitionXml = (slide) =>
	slide.morph
		? `
	<mc:AlternateContent>
		<mc:Choice Requires="p14 p159">
			<p:transition p14:dur="${slide.morphDuration || 1200}">
				<p159:morph option="byObject"/>
			</p:transition>
		</mc:Choice>
		<mc:Fallback>
			<p:transition spd="slow"><p:fade/></p:transition>
		</mc:Fallback>
	</mc:AlternateContent>`
		: '';

const slideXml = (_, pictures, slide, relationships) => `${xmlDeclaration}
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" mc:Ignorable="p14 p159">
	<p:cSld>
		<p:spTree>
			${groupShape}
			${pictures
				.map((picture, index) => ({ picture, index }))
				.filter(({ picture }) => picture.role !== 'title')
				.map(({ picture, index }) => pictureXml(picture, index))
				.join('')}
			${veilXml(slide.veil, pictures.length + 2)}
			${pictures
				.map((picture, index) => ({ picture, index }))
				.filter(({ picture }) => picture.role === 'title')
				.map(({ picture, index }) => pictureXml(picture, index))
				.join('')}
			${doiPillXml(
				slide,
				relationships.hyperlink,
				pictures.length + 2 + (slide.veil ? 1 : 0),
			)}
		</p:spTree>
	</p:cSld>
	<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
	${morphTransitionXml(slide)}
	${timingXml(slide, pictures, pictures.length + 2)}
</p:sld>`;

const slideRelationshipsXml = (
	mediaNames,
	slide,
	slideIndex,
	relationships,
) => `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
	${mediaNames
		.map(
			(name, index) =>
				`<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${escapeXml(name)}"/>`,
		)
		.join('\n\t')}
	${
		relationships.hyperlink
			? `<Relationship Id="${relationships.hyperlink}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://doi.org/${escapeXml(slide.doi)}" TargetMode="External"/>`
			: ''
	}
	${
		relationships.notes
			? `<Relationship Id="${relationships.notes}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${slideIndex + 1}.xml"/>`
			: ''
	}
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

const notesBodyShape = (text = '') => {
	const paragraphs = text
		.split(/\n+/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map(
			(line) => `
					<a:p>
						<a:r>
							<a:rPr lang="en-US" sz="1200"/>
							<a:t>${escapeXml(line)}</a:t>
						</a:r>
						<a:endParaRPr lang="en-US" sz="1200"/>
					</a:p>`,
		)
		.join('');
	return `
			<p:sp>
				<p:nvSpPr>
					<p:cNvPr id="2" name="Notes Placeholder 2"/>
					<p:cNvSpPr txBox="1"/>
					<p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
				</p:nvSpPr>
				<p:spPr>
					<a:xfrm>
						<a:off x="685800" y="3657600"/>
						<a:ext cx="5486400" cy="4114800"/>
					</a:xfrm>
				</p:spPr>
				<p:txBody>
					<a:bodyPr lIns="91440" rIns="91440" tIns="45720" bIns="45720"/>
					<a:lstStyle/>
					${paragraphs || '<a:p><a:endParaRPr lang="en-US" sz="1200"/></a:p>'}
				</p:txBody>
			</p:sp>`;
};

const notesMasterXml = `${xmlDeclaration}
<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:cSld>
		<p:spTree>
			${groupShape}
			${notesBodyShape()}
		</p:spTree>
	</p:cSld>
	<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>
	<p:hf hdr="0" ftr="0" dt="0" sldNum="0"/>
	<p:notesStyle>
		<a:lvl1pPr marL="0" algn="l"><a:defRPr sz="1200"/></a:lvl1pPr>
	</p:notesStyle>
</p:notesMaster>`;

const notesMasterRelationshipsXml = `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const notesSlideXml = (notes) => `${xmlDeclaration}
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
	<p:cSld>
		<p:spTree>
			${groupShape}
			${notesBodyShape(notes)}
		</p:spTree>
	</p:cSld>
	<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:notes>`;

const notesSlideRelationshipsXml = (slideIndex) => `${xmlDeclaration}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${slideIndex + 1}.xml"/>
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
		const metadataPage = await browser.newPage();
		await metadataPage.setJavaScriptEnabled(false);
		await metadataPage.goto(url, { waitUntil: 'domcontentloaded' });
		const metadata = await metadataPage.evaluate(() => {
			const topLevel = [
				...document.querySelector('.slides').children,
			].filter((element) => element.matches('section'));
			const slides = topLevel.flatMap((section) => {
				const vertical = [...section.children].filter((element) =>
					element.matches('section'),
				);
				return vertical.length ? vertical : [section];
			});
			return slides.map((slide) => {
				const source = slide.querySelector(':scope > img[doi]');
				return {
					doi: source?.getAttribute('doi') || '',
					notes: slide.querySelector(':scope > aside.notes')?.innerText.trim() || '',
					title:
						source?.alt ||
						slide.querySelector(':scope > h1')?.innerText.replaceAll('\n', ' ') ||
						'Untitled slide',
				};
			});
		});
		await metadataPage.close();

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
		await page.addStyleTag({
			content: '.paper-doi-link { visibility: hidden !important; }',
		});

		const presentation = await page.evaluate(() => ({
			title: document.title,
			slides: Reveal.getSlides().map((slide) => {
				const { h, v } = Reveal.getIndices(slide);
				const assetAnimation = slide.querySelector('.fiji-title-logo');
				const titleAnimation = slide.classList.contains('paper-title-slide');
				return {
					h,
					v: v ?? 0,
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
		if (presentation.slides.length !== metadata.length) {
			throw new Error(
				`Slide metadata mismatch: ${presentation.slides.length} rendered, ${metadata.length} source slides`,
			);
		}
		presentation.slides = presentation.slides.map((slide, index) => ({
			...metadata[index],
			...slide,
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
			slide.doiBounds = await page.evaluate(() => {
				const link = Reveal.getCurrentSlide().querySelector('.paper-doi-link');
				if (!link) return null;
				const bounds = link.getBoundingClientRect();
				return {
					x: bounds.x,
					y: bounds.y,
					width: bounds.width,
					height: bounds.height,
				};
			});

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
		await writePart(packageRoot, 'docProps/app.xml', appXml(manifest.slides));
		await writePart(
			packageRoot,
			'docProps/core.xml',
			coreXml(manifest.title || 'Fiji won\'t quit!'),
		);
		await writePart(packageRoot, 'ppt/presentation.xml', presentationXml(manifest));
		await writePart(
			packageRoot,
			'ppt/_rels/presentation.xml.rels',
			presentationRelationshipsXml(manifest.slides),
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
		if (manifest.slides.some(({ notes }) => notes)) {
			await writePart(
				packageRoot,
				'ppt/notesMasters/notesMaster1.xml',
				notesMasterXml,
			);
			await writePart(
				packageRoot,
				'ppt/notesMasters/_rels/notesMaster1.xml.rels',
				notesMasterRelationshipsXml,
			);
		}

		let mediaIndex = 1;
		for (const [index, slide] of manifest.slides.entries()) {
			const pictures = slidePictures(slide, manifest);
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
			let nextRelationshipId = mediaNames.length + 2;
			const relationships = {};
			if (slide.doi && slide.doiBounds) {
				relationships.hyperlink = `rId${nextRelationshipId++}`;
			}
			if (slide.notes) {
				relationships.notes = `rId${nextRelationshipId++}`;
			}
			await writePart(
				packageRoot,
				`ppt/slides/slide${index + 1}.xml`,
				slideXml(manifest, pictures, slide, relationships),
			);
			await writePart(
				packageRoot,
				`ppt/slides/_rels/slide${index + 1}.xml.rels`,
				slideRelationshipsXml(mediaNames, slide, index, relationships),
			);
			if (slide.notes) {
				await writePart(
					packageRoot,
					`ppt/notesSlides/notesSlide${index + 1}.xml`,
					notesSlideXml(slide.notes),
				);
				await writePart(
					packageRoot,
					`ppt/notesSlides/_rels/notesSlide${index + 1}.xml.rels`,
					notesSlideRelationshipsXml(index),
				);
			}
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
