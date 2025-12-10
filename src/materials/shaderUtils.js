/**
 * Prepend defines to shader source.
 *
 * @param shaderSource - The shader source code
 * @param defines - String of #define statements to add
 * @param options - Options object
 * @param options.stripVersion - If true, strip #version directive (for Three.js path which adds it).
 *                               If false, keep #version and insert defines after it (for Potree's custom Shader).
 *
 * Two shader compilation paths exist:
 * 1. Three.js WebGLProgram (EDL, Normalization materials): Sets glslVersion=GLSL3, Three.js adds #version
 * 2. Potree's custom Shader class (pointcloud): Compiles directly with WebGL, needs #version in source
 */
export function prependDefines(shaderSource, defines, options = {}) {
	const { stripVersion = false } = options;

	if (stripVersion) {
		// Three.js path: strip #version (Three.js adds it when glslVersion is set)
		const cleanedSource = shaderSource.replace(/^#version[^\n]*\n/, '');

		if (!defines) {
			return cleanedSource;
		}

		let definesStr = defines;
		if (!definesStr.endsWith('\n')) {
			definesStr += '\n';
		}

		return definesStr + cleanedSource;
	} else {
		// Potree custom Shader path: keep #version, insert defines after it
		if (!defines) {
			return shaderSource;
		}

		let definesStr = defines;
		if (!definesStr.endsWith('\n')) {
			definesStr += '\n';
		}

		// Find #version line and insert defines AFTER it
		const versionMatch = shaderSource.match(/^(#version[^\n]*\n)/);
		if (versionMatch) {
			const versionLine = versionMatch[1];
			const rest = shaderSource.slice(versionLine.length);
			return versionLine + definesStr + rest;
		}

		// No #version found - just prepend defines
		return definesStr + shaderSource;
	}
}
