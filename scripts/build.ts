#!/usr/bin/env bun

/**
 * Build script for Potree project
 * Replaces the gulp-based build system with a TypeScript/Bun implementation
 */

import { join, basename, dirname } from "path";
import { mkdir, readdir, readFile, writeFile, copyFile, rm } from "fs/promises";
import { existsSync } from "fs";

// Import tool functions
const { createExamplesPage } = require("../src/tools/create_potree_page");
const { createGithubPage } = require("../src/tools/create_github_page");
const { createIconsPage } = require("../src/tools/create_icons_page");

// Configuration
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PROJECT_ROOT = join(import.meta.dir, "..");
const BUILD_DIR = join(PROJECT_ROOT, "build");

// Worker file configurations
const WORKERS = {
	LASLAZWorker: [
		"libs/plasio/workers/laz-perf.js",
		"libs/plasio/workers/laz-loader-worker.js"
	],
	LASDecoderWorker: [
		"src/workers/LASDecoderWorker.js"
	],
	EptLaszipDecoderWorker: [
		"libs/copc/index.js",
		"src/workers/EptLaszipDecoderWorker.js"
	],
	EptBinaryDecoderWorker: [
		"libs/ept/ParseBuffer.js",
		"src/workers/EptBinaryDecoderWorker.js"
	],
	EptZstandardDecoderWorker: [
		"src/workers/EptZstandardDecoder_preamble.js",
		"libs/zstd-codec/bundle.js",
		"libs/ept/ParseBuffer.js",
		"src/workers/EptZstandardDecoderWorker.js"
	]
};

// Shader files
const SHADER_FILES = [
	"src/materials/shaders/pointcloud.vs",
	"src/materials/shaders/pointcloud.fs",
	"src/materials/shaders/pointcloud_sm.vs",
	"src/materials/shaders/pointcloud_sm.fs",
	"src/materials/shaders/normalize.vs",
	"src/materials/shaders/normalize.fs",
	"src/materials/shaders/normalize_and_edl.fs",
	"src/materials/shaders/edl.vs",
	"src/materials/shaders/edl.fs",
	"src/materials/shaders/blur.vs",
	"src/materials/shaders/blur.fs",
];

// Lazy-loaded libraries
const LAZY_LIBS = {
	geopackage: "libs/geopackage",
	"sql.js": "libs/sql.js"
};

// Asset files to copy
const ASSET_FILES = [
	{ src: "src/viewer/potree.css", dest: "build/potree/potree.css" },
	{ src: "src/viewer/sidebar.html", dest: "build/potree/sidebar.html" },
	{ src: "src/viewer/profile.html", dest: "build/potree/profile.html" },
	{ src: "LICENSE", dest: "build/potree/LICENSE" }
];

// Utility functions
function formatTime(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

async function ensureDir(dirPath: string): Promise<void> {
	if (!existsSync(dirPath)) {
		await mkdir(dirPath, { recursive: true });
	}
}

async function copyDirectory(src: string, dest: string): Promise<void> {
	await ensureDir(dest);

	const entries = await readdir(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);

		if (entry.isDirectory()) {
			await copyDirectory(srcPath, destPath);
		} else {
			await copyFile(srcPath, destPath);
		}
	}
}

// Build tasks
async function buildShaders(): Promise<void> {
	const startTime = Date.now();
	console.log("Building shaders...");

	const components = ["let Shaders = {};"];

	for (const shaderPath of SHADER_FILES) {
		const fullPath = join(PROJECT_ROOT, shaderPath);
		const filename = basename(shaderPath);

		if (!existsSync(fullPath)) {
			console.warn(`Warning: Shader file not found: ${shaderPath}`);
			continue;
		}

		const content = await readFile(fullPath, "utf-8");
		components.push(`Shaders["${filename}"] = \`${content}\`;`);
	}

	components.push("export {Shaders};");

	const outputPath = join(BUILD_DIR, "shaders");
	await ensureDir(outputPath);

	const outputFile = join(outputPath, "shaders.js");
	await writeFile(outputFile, components.join("\n\n"), "utf-8");

	const elapsed = Date.now() - startTime;
	console.log(`✓ Shaders built in ${formatTime(elapsed)}`);
}

async function buildWorkers(): Promise<void> {
	const startTime = Date.now();
	console.log("Building workers...");

	const outputDir = join(BUILD_DIR, "potree", "workers");
	await ensureDir(outputDir);

	// Build concatenated workers
	for (const [workerName, sourceFiles] of Object.entries(WORKERS)) {
		const contents: string[] = [];

		for (const sourceFile of sourceFiles) {
			const fullPath = join(PROJECT_ROOT, sourceFile);

			if (!existsSync(fullPath)) {
				throw new Error(`Worker source file not found: ${sourceFile}`);
			}

			const content = await readFile(fullPath, "utf-8");
			contents.push(content);
		}

		const outputFile = join(outputDir, `${workerName}.js`);
		await writeFile(outputFile, contents.join("\n"), "utf-8");
	}

	// Copy WASM file
	const wasmSrc = join(PROJECT_ROOT, "libs/copc/laz-perf.wasm");
	const wasmDest = join(outputDir, "laz-perf.wasm");

	if (existsSync(wasmSrc)) {
		await copyFile(wasmSrc, wasmDest);
	} else {
		console.warn("Warning: laz-perf.wasm not found");
	}

	const elapsed = Date.now() - startTime;
	console.log(`✓ Workers built in ${formatTime(elapsed)}`);
}

async function buildMainBundle(): Promise<void> {
	const startTime = Date.now();
	console.log("Building main bundle...");

	// Build main Potree bundle
	await ensureDir(join(BUILD_DIR, "potree"));

	const mainResult = await Bun.build({
		entrypoints: [join(PROJECT_ROOT, "src/Potree.js")],
		outdir: join(BUILD_DIR, "potree"),
		naming: "potree.js",
		format: "esm",
		minify: IS_PRODUCTION,
		sourcemap: IS_PRODUCTION ? "none" : "external",
		target: "browser",
	});

	if (!mainResult.success) {
		console.error("Main bundle build failed:");
		for (const log of mainResult.logs) {
			console.error(log);
		}
		throw new Error("Failed to build main bundle");
	}

	const elapsed = Date.now() - startTime;
	console.log(`✓ Main bundle built in ${formatTime(elapsed)}`);
}

async function buildWorkerBundles(): Promise<void> {
	const startTime = Date.now();
	console.log("Building worker bundles...");

	const workerConfigs = [
		{
			entry: "src/workers/BinaryDecoderWorker.js",
			output: "build/potree/workers/BinaryDecoderWorker.js"
		},
		{
			entry: "src/modules/loader/2.0/DecoderWorker.js",
			output: "build/potree/workers/2.0/DecoderWorker.js"
		},
		{
			entry: "src/modules/loader/2.0/DecoderWorker_brotli.js",
			output: "build/potree/workers/2.0/DecoderWorker_brotli.js"
		}
	];

	for (const config of workerConfigs) {
		const entryPath = join(PROJECT_ROOT, config.entry);
		const outputPath = join(PROJECT_ROOT, config.output);

		if (!existsSync(entryPath)) {
			console.warn(`Warning: Worker entry not found: ${config.entry}`);
			continue;
		}

		await ensureDir(dirname(outputPath));

		const result = await Bun.build({
			entrypoints: [entryPath],
			outdir: dirname(outputPath),
			naming: basename(outputPath),
			format: "esm",
			minify: IS_PRODUCTION,
			sourcemap: "none",
			target: "browser",
		});

		if (!result.success) {
			console.error(`Worker bundle build failed for ${config.entry}:`);
			for (const log of result.logs) {
				console.error(log);
			}
			throw new Error(`Failed to build worker bundle: ${config.entry}`);
		}
	}

	const elapsed = Date.now() - startTime;
	console.log(`✓ Worker bundles built in ${formatTime(elapsed)}`);
}

async function copyAssets(): Promise<void> {
	const startTime = Date.now();
	console.log("Copying assets...");

	// Copy individual asset files
	for (const asset of ASSET_FILES) {
		const srcPath = join(PROJECT_ROOT, asset.src);
		const destPath = join(PROJECT_ROOT, asset.dest);

		if (!existsSync(srcPath)) {
			console.warn(`Warning: Asset not found: ${asset.src}`);
			continue;
		}

		await ensureDir(dirname(destPath));
		await copyFile(srcPath, destPath);
	}

	// Copy resources directory
	const resourcesSrc = join(PROJECT_ROOT, "resources");
	const resourcesDest = join(BUILD_DIR, "potree", "resources");

	if (existsSync(resourcesSrc)) {
		await copyDirectory(resourcesSrc, resourcesDest);
	} else {
		console.warn("Warning: resources directory not found");
	}

	const elapsed = Date.now() - startTime;
	console.log(`✓ Assets copied in ${formatTime(elapsed)}`);
}

async function copyLazyLibs(): Promise<void> {
	const startTime = Date.now();
	console.log("Copying lazy-loaded libraries...");

	const lazyLibsDir = join(BUILD_DIR, "potree", "lazylibs");

	for (const [libName, libPath] of Object.entries(LAZY_LIBS)) {
		const srcPath = join(PROJECT_ROOT, libPath);
		const destPath = join(lazyLibsDir, libName);

		if (!existsSync(srcPath)) {
			console.warn(`Warning: Lazy lib not found: ${libPath}`);
			continue;
		}

		await copyDirectory(srcPath, destPath);
	}

	const elapsed = Date.now() - startTime;
	console.log(`✓ Lazy libraries copied in ${formatTime(elapsed)}`);
}

async function buildExamplesPage(): Promise<void> {
	const startTime = Date.now();
	console.log("Building examples page...");

	try {
		await Promise.all([
			createExamplesPage(),
			createGithubPage()
		]);

		const elapsed = Date.now() - startTime;
		console.log(`✓ Examples page built in ${formatTime(elapsed)}`);
	} catch (error) {
		console.error("Error building examples page:", error);
		throw error;
	}
}

async function buildIconsViewer(): Promise<void> {
	const startTime = Date.now();
	console.log("Building icons viewer...");

	try {
		await createIconsPage();

		const elapsed = Date.now() - startTime;
		console.log(`✓ Icons viewer built in ${formatTime(elapsed)}`);
	} catch (error) {
		console.error("Error building icons viewer:", error);
		throw error;
	}
}

// Main build function
async function build(): Promise<void> {
	const totalStartTime = Date.now();

	console.log("=".repeat(50));
	console.log("Potree Build Script");
	console.log(`Mode: ${IS_PRODUCTION ? "production" : "development"}`);
	console.log("=".repeat(50));
	console.log();

	try {
		// Run parallel tasks that don't depend on each other
		await Promise.all([
			buildShaders(),
			buildWorkers(),
			buildExamplesPage(),
			buildIconsViewer(),
			copyLazyLibs()
		]);

		// Run bundling tasks (can be parallel)
		await Promise.all([
			buildMainBundle(),
			buildWorkerBundles()
		]);

		// Copy assets last
		await copyAssets();

		const totalElapsed = Date.now() - totalStartTime;
		console.log();
		console.log("=".repeat(50));
		console.log(`✓ Build completed successfully in ${formatTime(totalElapsed)}`);
		console.log("=".repeat(50));

	} catch (error) {
		console.error();
		console.error("=".repeat(50));
		console.error("✗ Build failed!");
		console.error("=".repeat(50));
		console.error(error);
		process.exit(1);
	}
}

// Run the build
build();
