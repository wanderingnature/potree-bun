
import * as THREE from "three";
import {Shaders} from "../../build/shaders/shaders.js";
import {prependDefines} from "./shaderUtils.js";

//
// Algorithm by Christian Boucheny
// shader code taken and adapted from CloudCompare
//
// see
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
// http://www.kitware.com/source/home/post/9
// https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)

export class EyeDomeLightingMaterial extends THREE.RawShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			screenWidth:    { type: 'f', 	value: 0 },
			screenHeight:   { type: 'f', 	value: 0 },
			edlStrength:    { type: 'f', 	value: 1.0 },
			uNear:          { type: 'f', 	value: 1.0 },
			uFar:           { type: 'f', 	value: 1.0 },
			radius:         { type: 'f', 	value: 1.0 },
			neighbours:     { type: '2fv', 	value: [] },
			depthMap:       { type: 't', 	value: null },
			uEDLColor:      { type: 't', 	value: null },
			uEDLDepth:      { type: 't', 	value: null },
			opacity:        { type: 'f',	value: 1.0 },
			uProj:          { type: "Matrix4fv", value: [] },
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
			vertexShader: prependDefines(Shaders['edl.vs'], this.getDefines(), { stripVersion: true }),
			fragmentShader: prependDefines(Shaders['edl.fs'], this.getDefines(), { stripVersion: true }),
			lights: false,
			glslVersion: THREE.GLSL3
		});
	}

	getDefines() {
		let defines = '';

		defines += '#define NEIGHBOUR_COUNT ' + this.neighbourCount + '\n';

		return defines;
	}

	updateShaderSource() {

		let vs = prependDefines(Shaders['edl.vs'], this.getDefines(), { stripVersion: true });
		let fs = prependDefines(Shaders['edl.fs'], this.getDefines(), { stripVersion: true });

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

