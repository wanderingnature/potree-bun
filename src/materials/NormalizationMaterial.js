
import * as THREE from "three";
import {Shaders} from "../../build/shaders/shaders.js";
import {prependDefines} from "./shaderUtils.js";

export class NormalizationMaterial extends THREE.RawShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			uDepthMap:		{ type: 't', value: null },
			uWeightMap:		{ type: 't', value: null },
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: prependDefines(Shaders['normalize.vs'], this.getDefines(), { stripVersion: true }),
			fragmentShader: prependDefines(Shaders['normalize.fs'], this.getDefines(), { stripVersion: true }),
			glslVersion: THREE.GLSL3
		});
	}

	getDefines() {
		let defines = '';

		return defines;
	}

	updateShaderSource() {

		let vs = prependDefines(Shaders['normalize.vs'], this.getDefines(), { stripVersion: true });
		let fs = prependDefines(Shaders['normalize.fs'], this.getDefines(), { stripVersion: true });

		this.setValues({
			vertexShader: vs,
			fragmentShader: fs
		});

		this.needsUpdate = true;
	}

}

