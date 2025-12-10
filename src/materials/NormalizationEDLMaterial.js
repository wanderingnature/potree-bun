
import * as THREE from "three";
import {Shaders} from "../../build/shaders/shaders.js";
import {prependDefines} from "./shaderUtils.js";


export class NormalizationEDLMaterial extends THREE.RawShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			screenWidth:    { type: 'f',   value: 0 },
			screenHeight:   { type: 'f',   value: 0 },
			edlStrength:    { type: 'f',   value: 1.0 },
			radius:         { type: 'f',   value: 1.0 },
			neighbours:     { type: '2fv', value: [] },
			uEDLMap:        { type: 't',   value: null },
			uDepthMap:      { type: 't',   value: null },
			uWeightMap:     { type: 't',   value: null },
		};

		this._neighbourCount = 8;
		this.neighbours = new Float32Array(this._neighbourCount * 2);
		for (let c = 0; c < this._neighbourCount; c++) {
			this.neighbours[2 * c + 0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
			this.neighbours[2 * c + 1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
		}

		// Set neighbours uniform value before passing to setValues
		uniforms.neighbours.value = this.neighbours;

		this.setValues({
			uniforms: uniforms,
			vertexShader: prependDefines(Shaders['normalize.vs'], this.getDefines(), { stripVersion: true }),
			fragmentShader: prependDefines(Shaders['normalize_and_edl.fs'], this.getDefines(), { stripVersion: true }),
			glslVersion: THREE.GLSL3
		});
	}

	getDefines() {
		let defines = '';

		defines += '#define NEIGHBOUR_COUNT ' + this.neighbourCount + '\n';

		return defines;
	}

	updateShaderSource() {

		let vs = prependDefines(Shaders['normalize.vs'], this.getDefines(), { stripVersion: true });
		let fs = prependDefines(Shaders['normalize_and_edl.fs'], this.getDefines(), { stripVersion: true });

		this.setValues({
			vertexShader: vs,
			fragmentShader: fs
		});

		this.uniforms.neighbours.value = this.neighbours;

		this.needsUpdate = true;
	}

	get neighbourCount(){
		return this._neighbourCount;
	}

	set neighbourCount(value){
		if (this._neighbourCount !== value) {
			this._neighbourCount = value;
			this.neighbours = new Float32Array(this._neighbourCount * 2);
			for (let c = 0; c < this._neighbourCount; c++) {
				this.neighbours[2 * c + 0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
				this.neighbours[2 * c + 1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
			}

			this.updateShaderSource();
		}
	}
	
}

